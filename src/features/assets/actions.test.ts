import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const remove = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc, storage: { from: () => ({ remove }) } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { deleteAsset, registerAsset } = await import("./actions");

const input = {
  projectId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff",
  assetId: "0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11",
  title: "  Interview  ",
  storagePath: "6f9619ff-8b86-4d11-b42d-00c04fc964ff/0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11/f.mp4",
};

beforeEach(() => vi.clearAllMocks());

describe("registerAsset", () => {
  it("records the upload with the trimmed title", async () => {
    rpc.mockResolvedValue({ data: input.assetId, error: null });

    expect(await registerAsset(input)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("register_asset", {
      p_project_id: input.projectId,
      p_asset_id: input.assetId,
      p_title: "Interview",
      p_storage_path: input.storagePath,
    });
  });

  it("rejects forged ids without calling the database", async () => {
    expect(await registerAsset({ ...input, assetId: "x" })).toEqual({
      ok: false,
      error: "Données d'envoi invalides.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains when a reviewer tries to upload", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "not_editor" } });

    expect(await registerAsset(input)).toEqual({
      ok: false,
      error: "Seuls les monteurs peuvent déposer des rushs.",
    });
  });

  it("falls back to a generic message on an unknown error", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "" } });

    expect(await registerAsset(input)).toEqual({ ok: false, error: "Enregistrement impossible. Réessayez." });
  });
});

describe("deleteAsset", () => {
  const ids = { projectId: input.projectId, assetId: input.assetId };

  it("deletes the rows, then the files they pointed to", async () => {
    rpc.mockResolvedValue({ data: [input.storagePath], error: null });
    remove.mockResolvedValue({ error: null });

    expect(await deleteAsset(ids)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("delete_asset", { p_asset_id: input.assetId });
    expect(remove).toHaveBeenCalledWith([input.storagePath]);
  });

  it("refuses when the user did not upload the asset, and keeps the files", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "not_uploader" } });

    expect(await deleteAsset(ids)).toEqual({ ok: false, error: "Seul l'auteur du dépôt peut le supprimer." });
    expect(remove).not.toHaveBeenCalled();
  });

  it("still succeeds when a file cannot be removed: the asset is already gone", async () => {
    rpc.mockResolvedValue({ data: [input.storagePath], error: null });
    remove.mockResolvedValue({ error: { message: "network" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await deleteAsset(ids)).toEqual({ ok: true });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
