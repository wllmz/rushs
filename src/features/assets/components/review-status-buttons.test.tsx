import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setVersionStatus = vi.fn();
vi.mock("../actions", () => ({ setVersionStatus: (input: unknown) => setVersionStatus(input) }));

const { ReviewStatusButtons } = await import("./review-status-buttons");

const props = {
  projectId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff",
  assetId: "0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11",
  number: 2,
  status: "pending" as const,
};

beforeEach(() => vi.clearAllMocks());

describe("ReviewStatusButtons", () => {
  it("marks the current status as pressed and not clickable", () => {
    render(<ReviewStatusButtons {...props} />);

    const current = screen.getByRole("button", { name: "En attente" });
    expect(current).toHaveAttribute("aria-pressed", "true");
    expect(current).toBeDisabled();
    expect(screen.getByRole("button", { name: "Validé" })).toHaveAttribute("aria-pressed", "false");
  });

  it("sends the chosen status for this version", async () => {
    setVersionStatus.mockResolvedValue({ ok: true });
    render(<ReviewStatusButtons {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Validé" }));

    await waitFor(() =>
      expect(setVersionStatus).toHaveBeenCalledWith({
        projectId: props.projectId,
        assetId: props.assetId,
        number: 2,
        status: "approved",
      }),
    );
  });

  it("shows why the change was refused", async () => {
    setVersionStatus.mockResolvedValue({ ok: false, error: "Seuls les validateurs peuvent changer le statut." });
    render(<ReviewStatusButtons {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Modifications demandées" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Seuls les validateurs peuvent changer le statut.");
  });
});
