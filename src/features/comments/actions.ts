"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addCommentSchema, type AddCommentInput } from "./schemas";

export type AddCommentResult = { ok: true } | { ok: false; error: string };

// RLS does the checks: a member of the project, commenting as themselves, a timecode only on a video
export async function addComment(input: AddCommentInput): Promise<AddCommentResult> {
  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    // Only the body messages are written for the user; anything else is a forged request
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.path[0] === "body" ? issue.message : "Commentaire invalide." };
  }

  const { projectId, assetId, versionId, body, timecode } = parsed.data;
  const supabase = await createClient();
  // author_id defaults to the signed-in user in the database
  const { error } = await supabase.from("comments").insert({ version_id: versionId, body, timecode });
  if (error) {
    // 42501: refused by RLS, which also covers a version already deleted (the policy finds no project).
    // 23503: the version was deleted while this comment was being written.
    if (error.code === "42501") return { ok: false, error: "Vous ne pouvez pas commenter ce rush." };
    if (error.code === "23503") return { ok: false, error: "Cette version n'existe plus." };
    return { ok: false, error: "Envoi du commentaire impossible. Réessayez." };
  }

  // A commented version can no longer be deleted: the project list hides its delete button too
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/assets/${assetId}`);
  return { ok: true };
}
