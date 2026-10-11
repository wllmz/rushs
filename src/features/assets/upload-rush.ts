import { createClient } from "@/lib/supabase/client";
import { buildStoragePath } from "./file-rules";

type Failure = { ok: false; error: string };

// The file goes straight from the browser to Storage (a Server Action body is capped at 1 MB),
// then `register` records it on the server from what Storage measured.
// Expects a file already checked with validateRushFile. Returns what `register` returned.
export async function uploadRush<Result extends { ok: true } | Failure>(
  projectId: string,
  assetId: string,
  file: File,
  register: (storagePath: string) => Promise<Result>,
): Promise<Result | Failure> {
  const storagePath = buildStoragePath(projectId, assetId, crypto.randomUUID(), file.type);

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("rushes")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ok: false, error: "L'envoi a échoué. Vérifiez votre connexion et réessayez." };

  const result = await register(storagePath);
  if (!result.ok) {
    // No version points to the file yet, so the storage policy lets the uploader remove it;
    // if this fails too, the file is only an unreferenced leftover
    await supabase.storage.from("rushes").remove([storagePath]);
  }
  return result;
}
