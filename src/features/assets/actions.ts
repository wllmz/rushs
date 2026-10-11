"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerAssetSchema, type RegisterAssetInput } from "./schemas";

export type RegisterAssetResult = { ok: true } | { ok: false; error: string };

// Hints raised by register_asset
const REGISTER_ERRORS: Record<string, string> = {
  not_editor: "Seuls les monteurs peuvent déposer des rushs.",
  upload_missing: "Le fichier n'a pas été reçu. Relancez l'envoi.",
  invalid_type: "Format non pris en charge.",
  invalid_path: "Données d'envoi invalides.",
};

// Called once the browser has uploaded the file to Storage: records it as an asset and its V1
export async function registerAsset(input: RegisterAssetInput): Promise<RegisterAssetResult> {
  const parsed = registerAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données d'envoi invalides." };

  const { projectId, assetId, title, storagePath } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_asset", {
    p_project_id: projectId,
    p_asset_id: assetId,
    p_title: title,
    p_storage_path: storagePath,
  });
  if (error) {
    return { ok: false, error: REGISTER_ERRORS[error.hint] ?? "Enregistrement impossible. Réessayez." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

const deleteAssetSchema = z.object({ projectId: z.uuid(), assetId: z.uuid() });

export type DeleteAssetResult = { ok: true } | { ok: false; error: string };

export async function deleteAsset(input: { projectId: string; assetId: string }): Promise<DeleteAssetResult> {
  const parsed = deleteAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Rush introuvable." };

  const { projectId, assetId } = parsed.data;
  const supabase = await createClient();
  const { data: paths, error } = await supabase.rpc("delete_asset", { p_asset_id: assetId });
  if (error) {
    return {
      ok: false,
      error: error.hint === "not_uploader" ? "Seul l'auteur du dépôt peut le supprimer." : "Suppression impossible.",
    };
  }

  // The asset is gone for everyone already: a file left behind only costs storage, so it is logged, not shown
  if (paths.length > 0) {
    const { data: removed, error: storageError } = await supabase.storage.from("rushes").remove(paths);
    if (storageError) console.error("Rush files left in storage", paths, storageError.message);
    // RLS skips a file owned by someone else without an error
    else if (removed.length < paths.length) console.error("Rush files left in storage", paths);
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
