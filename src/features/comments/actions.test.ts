import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => ({ insert }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { addComment } = await import("./actions");

const input = {
  projectId: "6f9619ff-8b86-4d11-b42d-00c04fc964ff",
  assetId: "0b6a3a5e-6f4e-4f0f-9a43-2f1b4f6f7c11",
  versionId: "9c1e2d3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
  body: "  La coupe est trop sèche  ",
  timecode: 12.5,
};

beforeEach(() => vi.clearAllMocks());

describe("addComment", () => {
  it("posts the trimmed comment on the version, with its timecode", async () => {
    insert.mockResolvedValue({ error: null });

    expect(await addComment(input)).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith({ version_id: input.versionId, body: "La coupe est trop sèche", timecode: 12.5 });
  });

  it("explains an empty comment without calling the database", async () => {
    expect(await addComment({ ...input, body: "   " })).toEqual({ ok: false, error: "Écrivez un commentaire" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects forged ids or a negative timecode without calling the database", async () => {
    expect(await addComment({ ...input, versionId: "x" })).toEqual({ ok: false, error: "Commentaire invalide." });
    expect(await addComment({ ...input, timecode: -1 })).toEqual({ ok: false, error: "Commentaire invalide." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("explains a refusal by the database rules", async () => {
    insert.mockResolvedValue({ error: { code: "42501" } });

    expect(await addComment(input)).toEqual({ ok: false, error: "Vous ne pouvez pas commenter ce rush." });
  });

  it("explains when the version was deleted meanwhile", async () => {
    insert.mockResolvedValue({ error: { code: "23503" } });

    expect(await addComment(input)).toEqual({ ok: false, error: "Cette version n'existe plus." });
  });
});
