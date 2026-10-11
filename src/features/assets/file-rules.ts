// Mirrors the "rushes" bucket settings: the bucket enforces them, this gives the user an early answer

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

// The browser reads the file type from the OS (the registry on Windows), which may not know an extension
const EXTENSION_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Extensions too, or the file picker can hide files whose type the OS does not map
export const ACCEPT_ATTRIBUTE = [
  ...Object.keys(ACCEPTED_TYPES),
  ...Object.keys(EXTENSION_TYPES).map((extension) => `.${extension}`),
].join(",");

// The accepted type of a file, falling back on its extension when the browser gave none we accept
export function resolveRushType(file: { name: string; type: string }): string {
  if (Object.hasOwn(ACCEPTED_TYPES, file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return Object.hasOwn(EXTENSION_TYPES, extension) ? EXTENSION_TYPES[extension] : file.type;
}

type FileInfo = { size: number; type: string };

// The error to show, or null when the file can be uploaded
export function validateRushFile(file: FileInfo): string | null {
  if (!Object.hasOwn(ACCEPTED_TYPES, file.type)) return "Format non pris en charge : MP4, MOV, WebM, JPEG, PNG ou WebP.";
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
