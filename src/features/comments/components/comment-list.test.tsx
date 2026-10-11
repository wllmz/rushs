import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const seek = vi.fn();
vi.mock("@/features/assets/components/player", () => ({ usePlayer: () => ({ currentTime: vi.fn(), seek }) }));

const { CommentList } = await import("./comment-list");

describe("CommentList", () => {
  it("moves the video to a comment's timecode", () => {
    render(
      <CommentList
        comments={[
          { id: "c1", body: "Trop sombre", timecode: 75.4, createdAt: "2026-10-11T10:00:00Z", authorName: "Léa" },
          { id: "c2", body: "Bien", timecode: null, createdAt: "2026-10-11T11:00:00Z", authorName: null },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aller à 01:15 dans la vidéo" }));

    expect(seek).toHaveBeenCalledWith(75.4);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("Auteur inconnu")).toBeInTheDocument();
  });

  it("says when there is nothing yet", () => {
    render(<CommentList comments={[]} />);

    expect(screen.getByText("Aucun commentaire sur cette version.")).toBeInTheDocument();
  });
});
