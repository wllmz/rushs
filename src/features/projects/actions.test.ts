import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// redirect() throws in Next: the mock does the same so the code after it never runs
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const { addMember, createProject } = await import("./actions");

const PROJECT_ID = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";

function form(fields: Record<string, string>) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("createProject", () => {
  it("rejects a blank name without calling the database", async () => {
    const state = await createProject({}, form({ name: "   ", role: "editor" }));

    expect(rpc).not.toHaveBeenCalled();
    expect(state.fieldErrors?.name).toBeDefined();
  });

  it("rejects an unknown role", async () => {
    const state = await createProject({}, form({ name: "Teaser", role: "admin" }));

    expect(rpc).not.toHaveBeenCalled();
    expect(state.fieldErrors?.role).toBeDefined();
  });

  it("creates the project with the trimmed name, then opens it", async () => {
    rpc.mockResolvedValue({ data: PROJECT_ID, error: null });

    await expect(createProject({}, form({ name: "  Teaser Nike ", role: "reviewer" }))).rejects.toThrow(
      `REDIRECT:/projects/${PROJECT_ID}`,
    );
    expect(rpc).toHaveBeenCalledWith("create_project", { p_name: "Teaser Nike", p_role: "reviewer" });
  });
});

describe("addMember", () => {
  const valid = { projectId: PROJECT_ID, email: "lea@studio.fr", role: "reviewer" };

  it("adds the member and confirms it", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    const state = await addMember({}, form(valid));

    expect(rpc).toHaveBeenCalledWith("add_project_member", {
      p_project_id: PROJECT_ID,
      p_email: "lea@studio.fr",
      p_role: "reviewer",
    });
    expect(state.success).toBe("lea@studio.fr a été ajouté au projet.");
  });

  it("explains when no account uses the email", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "no_account" } });

    const state = await addMember({}, form(valid));

    expect(state.error).toBe("Aucun compte confirmé n'utilise cet e-mail. La personne doit d'abord s'inscrire.");
    expect(state.values?.email).toBe("lea@studio.fr");
  });

  it("explains when the user is not the creator", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "not_creator" } });

    expect((await addMember({}, form(valid))).error).toBe(
      "Seul le créateur du projet peut ajouter des membres.",
    );
  });

  it("says so when the person is already a member", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "already_member" } });

    expect((await addMember({}, form(valid))).error).toBe("Cette personne fait déjà partie du projet.");
  });

  it("keeps the chosen role after an error", async () => {
    rpc.mockResolvedValue({ data: null, error: { hint: "no_account" } });

    expect((await addMember({}, form({ ...valid, role: "editor" }))).values?.role).toBe("editor");
  });

  it("rejects a forged project id", async () => {
    const state = await addMember({}, form({ ...valid, projectId: "1 or 1=1" }));

    expect(rpc).not.toHaveBeenCalled();
    expect(state.fieldErrors?.projectId).toBeDefined();
  });
});
