import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
const remove = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ storage: { from: () => ({ upload, remove }) } }),
}));

const { uploadRush } = await import("./upload-rush");

const projectId = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";
const assetId = "0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11";
const file = new File(["x"], "clip.mp4", { type: "video/mp4" });

beforeEach(() => {
  vi.clearAllMocks();
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ data: [], error: null });
});

describe("uploadRush", () => {
  it("uploads under the project and asset, then registers that path", async () => {
    const register = vi.fn().mockResolvedValue({ ok: true });

    expect(await uploadRush(projectId, assetId, file, register)).toEqual({ ok: true });
    const path: string = register.mock.calls[0][0];
    expect(path).toMatch(new RegExp(`^${projectId}/${assetId}/[0-9a-f-]{36}\\.mp4$`));
    expect(upload).toHaveBeenCalledWith(path, file, { contentType: "video/mp4", upsert: false });
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not register a file that failed to upload", async () => {
    upload.mockResolvedValue({ error: { message: "network" } });
    const register = vi.fn();

    expect(await uploadRush(projectId, assetId, file, register)).toEqual({
      ok: false,
      error: "L'envoi a échoué. Vérifiez votre connexion et réessayez.",
    });
    expect(register).not.toHaveBeenCalled();
  });

  it("removes the uploaded file when registering it is refused", async () => {
    const register = vi.fn().mockResolvedValue({ ok: false, error: "Refusé." });

    expect(await uploadRush(projectId, assetId, file, register)).toEqual({ ok: false, error: "Refusé." });
    expect(remove).toHaveBeenCalledWith([register.mock.calls[0][0]]);
  });

  it("removes the uploaded file when registering throws", async () => {
    const register = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    expect(await uploadRush(projectId, assetId, file, register)).toEqual({
      ok: false,
      error: "Enregistrement impossible. Réessayez.",
    });
    expect(remove).toHaveBeenCalledWith([register.mock.calls[0][0]]);
  });
});
