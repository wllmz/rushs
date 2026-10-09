"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addMemberSchema, createProjectSchema } from "./schemas";

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  success?: string;
  values?: { name?: string; email?: string };
};

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

export async function createProject(
  _state: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const values = { name: read(formData, "name") };
  const parsed = createProjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { data: projectId, error } = await supabase.rpc("create_project", {
    p_name: parsed.data.name,
    p_role: parsed.data.role,
  });
  if (error) return { values, error: "Création impossible. Réessayez dans un instant." };

  redirect(`/projects/${projectId}`);
}

// Postgres error codes raised by add_project_member
const ADD_MEMBER_ERRORS: Record<string, string> = {
  P0002: "Aucun compte n'utilise cet e-mail. La personne doit d'abord s'inscrire.",
  "42501": "Seul le créateur du projet peut ajouter des membres.",
};

export async function addMember(_state: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const values = { email: read(formData, "email") };
  const parsed = addMemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { projectId, email, role } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_project_member", {
    p_project_id: projectId,
    p_email: email,
    p_role: role,
  });
  if (error) {
    return { values, error: ADD_MEMBER_ERRORS[error.code] ?? "Ajout impossible. Réessayez dans un instant." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { success: `${email} a été ajouté au projet.` };
}
