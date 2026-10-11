import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const remove = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc, storage: { from: () => ({ remove }) } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { addVersion, deleteAsset, deleteVersion, registerAsset, setVersionStatus } = await import("./actions");

const input = {
  projectId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff",
  assetId: "0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11",
  title: "  Interview  ",
  storagePath: "6f9619ff-8b86-4d11-b42d-00c04fc964ff/0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11/9c1e2d3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f.mp4",
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

  it("rejects a storage path outside the expected layout without calling the database", async () => {
    expect(await registerAsset({ ...input, storagePath: `${input.projectId}/../x.mp4` })).toEqual({
      ok: false,
      error: "Données d'envoi invalides.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("asks to retry when the file never reached Storage", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "upload_missing" } });

    expect(await registerAsset(input)).toEqual({ ok: false, error: "Le fichier n'a pas été reçu. Relancez l'envoi." });
  });

  it("falls back to a generic message on an unknown error", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "" } });

    expect(await registerAsset(input)).toEqual({ ok: false, error: "Enregistrement impossible. Réessayez." });
  });
});

describe("addVersion", () => {
  const version = { projectId: input.projectId, assetId: input.assetId, storagePath: input.storagePath };

  it("records the upload and returns the new version number", async () => {
    rpc.mockResolvedValue({ data: 2, error: null });

    expect(await addVersion(version)).toEqual({ ok: true, number: 2 });
    expect(rpc).toHaveBeenCalledWith("add_version", {
      p_asset_id: input.assetId,
      p_storage_path: input.storagePath,
    });
  });

  it("rejects a forged storage path without calling the database", async () => {
    expect(await addVersion({ ...version, storagePath: "x" })).toEqual({
      ok: false,
      error: "Données d'envoi invalides.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains when the file is not the kind of the asset", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "kind_mismatch" } });

    expect(await addVersion(version)).toEqual({
      ok: false,
      error: "Une nouvelle version doit garder le type du rush (vidéo ou image).",
    });
  });

  it("explains when a reviewer tries to add a version", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "not_editor" } });

    expect(await addVersion(version)).toEqual({ ok: false, error: "Seuls les monteurs peuvent ajouter une version." });
  });
});

describe("deleteAsset", () => {
  const ids = { projectId: input.projectId, assetId: input.assetId };

  it("deletes the rows, then the files they pointed to", async () => {
    rpc.mockResolvedValue({ data: [input.storagePath], error: null });
    remove.mockResolvedValue({ data: [{ name: input.storagePath }], error: null });

    expect(await deleteAsset(ids)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("delete_asset", { p_asset_id: input.assetId });
    expect(remove).toHaveBeenCalledWith([input.storagePath]);
  });

  it("rejects forged ids without calling the database", async () => {
    expect(await deleteAsset({ ...ids, assetId: "x" })).toEqual({ ok: false, error: "Rush introuvable." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("falls back to a generic message on an unknown error", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "" } });

    expect(await deleteAsset(ids)).toEqual({ ok: false, error: "Suppression impossible." });
    expect(remove).not.toHaveBeenCalled();
  });

  it("logs the files that RLS silently kept", async () => {
    rpc.mockResolvedValue({ data: [input.storagePath, "other"], error: null });
    remove.mockResolvedValue({ data: [{ name: input.storagePath }], error: null });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await deleteAsset(ids)).toEqual({ ok: true });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("keeps an asset that has a reviewed version", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "reviewed" } });

    expect(await deleteAsset(ids)).toEqual({ ok: false, error: "Ce rush a déjà été revu ou commenté : il est conservé." });
    expect(remove).not.toHaveBeenCalled();
  });

  it("refuses when the user did not upload the asset, and keeps the files", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "not_uploader" } });

    expect(await deleteAsset(ids)).toEqual({ ok: false, error: "Seul l'auteur du dépôt peut le supprimer." });
    expect(remove).not.toHaveBeenCalled();
  });

  it("still succeeds when a file cannot be removed: the asset is already gone", async () => {
    rpc.mockResolvedValue({ data: [input.storagePath], error: null });
    remove.mockResolvedValue({ data: null, error: { message: "network" } });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await deleteAsset(ids)).toEqual({ ok: true });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("deleteVersion", () => {
  const target = { projectId: input.projectId, assetId: input.assetId, number: 2 };

  it("deletes the row, then its file", async () => {
    rpc.mockResolvedValue({ data: input.storagePath, error: null });
    remove.mockResolvedValue({ data: [{ name: input.storagePath }], error: null });

    expect(await deleteVersion(target)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("delete_version", { p_asset_id: input.assetId, p_number: 2 });
    expect(remove).toHaveBeenCalledWith([input.storagePath]);
  });

  it("rejects a forged number without calling the database", async () => {
    expect(await deleteVersion({ ...target, number: 0 })).toEqual({ ok: false, error: "Version introuvable." });
    expect(await deleteVersion({ ...target, number: 1.5 })).toEqual({ ok: false, error: "Version introuvable." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses to delete the only version, and keeps its file", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "last_version" } });

    expect(await deleteVersion(target)).toEqual({
      ok: false,
      error: "C'est la seule version : supprimez le rush à la place.",
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps a version that has been reviewed", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "reviewed" } });

    expect(await deleteVersion(target)).toEqual({
      ok: false,
      error: "Cette version a déjà été revue ou commentée : elle est conservée.",
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("refuses when the user did not upload the version", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "not_uploader" } });

    expect(await deleteVersion(target)).toEqual({ ok: false, error: "Seul l'auteur de la version peut la supprimer." });
  });
});

describe("setVersionStatus", () => {
  const change = { projectId: input.projectId, assetId: input.assetId, number: 2, status: "approved" };

  it("sets the status of the version", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    expect(await setVersionStatus(change)).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("set_version_status", {
      p_asset_id: input.assetId,
      p_number: 2,
      p_status: "approved",
    });
  });

  it("rejects an unknown status without calling the database", async () => {
    expect(await setVersionStatus({ ...change, status: "rejected" })).toEqual({ ok: false, error: "Statut invalide." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains when an editor tries to review", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "not_reviewer" } });

    expect(await setVersionStatus(change)).toEqual({
      ok: false,
      error: "Seuls les validateurs peuvent changer le statut.",
    });
  });

  it("explains when the version was deleted meanwhile", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "version_missing" } });

    expect(await setVersionStatus(change)).toEqual({ ok: false, error: "Cette version n'existe plus." });
  });
});
