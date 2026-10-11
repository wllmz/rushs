"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { registerAsset } from "../actions";
import { ACCEPT_ATTRIBUTE, buildStoragePath, validateRushFile } from "../file-rules";
import { assetTitleSchema } from "../schemas";

type Status = { kind: "idle" } | { kind: "uploading" } | { kind: "error"; message: string } | { kind: "done" };

// The file goes straight from the browser to Storage (a Server Action body is capped at 1 MB),
// then the server records it from what Storage measured
export function UploadAssetForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [titleError, setTitleError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    const title = assetTitleSchema.safeParse(formData.get("title"));
    setTitleError(title.success ? undefined : title.error.issues[0]?.message);
    if (!(file instanceof File) || file.size === 0) {
      setStatus({ kind: "error", message: "Choisissez un fichier." });
      return;
    }
    const fileError = validateRushFile(file);
    if (fileError) {
      setStatus({ kind: "error", message: fileError });
      return;
    }
    if (!title.success) return;

    setStatus({ kind: "uploading" });
    const assetId = crypto.randomUUID();
    const storagePath = buildStoragePath(projectId, assetId, crypto.randomUUID(), file.type);

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("rushes")
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      setStatus({ kind: "error", message: "L'envoi a échoué. Vérifiez votre connexion et réessayez." });
      return;
    }

    const result = await registerAsset({ projectId, assetId, title: title.data, storagePath });
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error });
      return;
    }

    formRef.current?.reset();
    setStatus({ kind: "done" });
    router.refresh();
  }

  const uploading = status.kind === "uploading";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        name="title"
        label="Titre"
        placeholder="Interview, plan drone…"
        required
        errors={titleError ? [titleError] : undefined}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="file" className="text-sm font-medium">
          Fichier
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p className="text-xs text-foreground/60">Vidéo ou image, 50 Mo maximum.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={uploading}>
          {uploading ? "Envoi en cours…" : "Déposer le rush"}
        </Button>
        {status.kind === "error" && (
          <p role="alert" className="text-sm text-red-600">
            {status.message}
          </p>
        )}
        {status.kind === "done" && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            Rush déposé.
          </p>
        )}
      </div>
    </form>
  );
}
