import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const addComment = vi.fn();
vi.mock("../actions", () => ({ addComment: (input: unknown) => addComment(input) }));

const currentTime = vi.fn();
vi.mock("@/features/assets/components/player", () => ({ usePlayer: () => ({ currentTime, seek: vi.fn() }) }));

const { CommentForm } = await import("./comment-form");

const ids = {
  projectId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff",
  assetId: "0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11",
  versionId: "9c1e2d3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
};

beforeEach(() => {
  vi.clearAllMocks();
  addComment.mockResolvedValue({ ok: true });
  currentTime.mockReturnValue(42.2);
});

function write(text: string) {
  fireEvent.change(screen.getByLabelText("Votre commentaire"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Commenter" }));
}

describe("CommentForm", () => {
  it("pins a video comment to where the video stands when sending", async () => {
    render(<CommentForm {...ids} isVideo />);

    write("Trop sombre ici");

    await waitFor(() => expect(addComment).toHaveBeenCalledWith({ ...ids, body: "Trop sombre ici", timecode: 42.2 }));
  });

  it("sends no timecode once unpinned, nor on an image", async () => {
    const { unmount } = render(<CommentForm {...ids} isVideo />);
    fireEvent.click(screen.getByLabelText("Lier au moment où la vidéo est arrêtée"));
    write("Global");
    await waitFor(() => expect(addComment).toHaveBeenLastCalledWith({ ...ids, body: "Global", timecode: null }));
    unmount();

    render(<CommentForm {...ids} isVideo={false} />);
    expect(screen.queryByLabelText("Lier au moment où la vidéo est arrêtée")).not.toBeInTheDocument();
    write("Recadrer");
    await waitFor(() => expect(addComment).toHaveBeenLastCalledWith({ ...ids, body: "Recadrer", timecode: null }));
  });

  it("refuses an empty comment before sending", () => {
    render(<CommentForm {...ids} isVideo />);

    write("   ");

    expect(screen.getByRole("alert")).toHaveTextContent("Écrivez un commentaire");
    expect(addComment).not.toHaveBeenCalled();
  });
});
