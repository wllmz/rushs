import type { Database } from "@/lib/supabase/database.types";

// Mirrors the "rushes" bucket settings: the bucket enforces them, this gives the user an early answer

export type AssetKind = Database["public"]["Enums"]["asset_kind"];

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// The extension comes from the type, never from the user's file name
export const ACCEPTED_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const KIND_ERRORS: Record<AssetKind, string> = {
  video: "Ce rush est une vidéo : sa nouvelle version doit en être une aussi.",
  image: "Ce rush est une image : sa nouvelle version doit en être une aussi.",
};

// A new version keeps the kind of its asset: pass the kind to only accept that one
export function acceptAttribute(kind?: AssetKind) {
  const types = Object.keys(ACCEPTED_TYPES);
  return (kind ? types.filter((type) => type.startsWith(`${kind}/`)) : types).join(",");
}

type FileInfo = { size: number; type: string };

// The error to show, or null when the file can be uploaded
export function validateRushFile(file: FileInfo, kind?: AssetKind): string | null {
  if (!(file.type in ACCEPTED_TYPES)) return "Format non pris en charge : MP4, MOV, WebM, JPEG, PNG ou WebP.";
  if (kind && !file.type.startsWith(`${kind}/`)) return KIND_ERRORS[kind];
  if (file.size === 0) return "Le fichier est vide.";
  if (file.size > MAX_FILE_SIZE) return "Fichier trop lourd : 50 Mo maximum.";
  return null;
}

export function buildStoragePath(projectId: string, assetId: string, fileId: string, type: string) {
  return `${projectId}/${assetId}/${fileId}.${ACCEPTED_TYPES[type]}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
