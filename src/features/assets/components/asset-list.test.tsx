import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssetSummary } from "../queries";

vi.mock("../actions", () => ({ deleteAsset: vi.fn() }));

const { AssetList } = await import("./asset-list");

const userId = "3c2b1a00-0000-4000-8000-000000000001";

function asset(overrides: Partial<AssetSummary>): AssetSummary {
  return {
    id: "0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11",
    title: "Interview",
    kind: "video",
    createdBy: userId,
    createdAt: "2026-10-11T10:00:00Z",
    latestVersion: { number: 1, sizeBytes: 1024 * 1024, status: "pending" },
    isReviewed: false,
    ...overrides,
  };
}

describe("AssetList", () => {
  it("shows the status of the latest version", () => {
    render(
      <AssetList
        projectId="p"
        currentUserId={userId}
        assets={[asset({ latestVersion: { number: 2, sizeBytes: 1024, status: "approved" }, isReviewed: true })]}
      />,
    );

    expect(screen.getByText("Validé")).toBeInTheDocument();
  });

  it("offers to delete only the user's own assets that nobody reviewed", () => {
    render(
      <AssetList
        projectId="p"
        currentUserId={userId}
        assets={[
          asset({ id: "a1", title: "Brouillon" }),
          asset({ id: "a2", title: "Revu", isReviewed: true }),
          asset({ id: "a3", title: "Autre", createdBy: "someone-else" }),
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Supprimer Brouillon" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer Revu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer Autre" })).not.toBeInTheDocument();
  });
});
