"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addVersionSchema, registerAssetSchema, type AddVersionInput, type RegisterAssetInput } from "./schemas";

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

export type AddVersionResult = { ok: true; number: number } | { ok: false; error: string };

// Hints raised by add_version
const ADD_VERSION_ERRORS: Record<string, string> = {
  not_editor: "Seuls les monteurs peuvent ajouter une version.",
  upload_missing: "Le fichier n'a pas été reçu. Relancez l'envoi.",
  invalid_path: "Données d'envoi invalides.",
  kind_mismatch: "Une nouvelle version doit garder le type du rush (vidéo ou image).",
};

// Called once the browser has uploaded the file to Storage: records it as the next version
export async function addVersion(input: AddVersionInput): Promise<AddVersionResult> {
  const parsed = addVersionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données d'envoi invalides." };

  const { projectId, assetId, storagePath } = parsed.data;
  const supabase = await createClient();
  const { data: number, error } = await supabase.rpc("add_version", {
    p_asset_id: assetId,
    p_storage_path: storagePath,
  });
  if (error) {
    return { ok: false, error: ADD_VERSION_ERRORS[error.hint] ?? "Enregistrement impossible. Réessayez." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/assets/${assetId}`);
  return { ok: true, number };
}

const deleteAssetSchema =z.object({ projectId: z.uuid(), assetId: z.uuid() });

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

  await removeRushFiles(supabase, paths);

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

const deleteVersionSchema = z.object({ projectId: z.uuid(), assetId: z.uuid(), number: z.int().positive() });

export type DeleteVersionResult = { ok: true } | { ok: false; error: string };

// Hints raised by delete_version
const DELETE_VERSION_ERRORS: Record<string, string> = {
  not_uploader: "Seul l'auteur de la version peut la supprimer.",
  last_version: "C'est la seule version : supprimez le rush à la place.",
};

export async function deleteVersion(input: {
  projectId: string;
  assetId: string;
  number: number;
}): Promise<DeleteVersionResult> {
  const parsed = deleteVersionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Version introuvable." };

  const { projectId, assetId, number } = parsed.data;
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("delete_version", { p_asset_id: assetId, p_number: number });
  if (error) return { ok: false, error: DELETE_VERSION_ERRORS[error.hint] ?? "Suppression impossible." };

  await removeRushFiles(supabase, [path]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/assets/${assetId}`);
  return { ok: true };
}

// The rows are gone for everyone already: a file left behind only costs storage, so it is logged, not shown
async function removeRushFiles(supabase: Awaited<ReturnType<typeof createClient>>, paths: string[]) {
  if (paths.length === 0) return;
  const { data: removed, error } = await supabase.storage.from("rushes").remove(paths);
  if (error) console.error("Rush files left in storage", paths, error.message);
  // RLS skips a file it does not allow to delete without an error
  else if (removed.length < paths.length) console.error("Rush files left in storage", paths);
}
