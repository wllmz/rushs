"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { registerAsset } from "../actions";
import { acceptAttribute, validateRushFile } from "../file-rules";
import { assetTitleSchema } from "../schemas";
import { uploadRush } from "../upload-rush";
import { RushFileInput } from "./rush-file-input";

type Status = { kind: "idle" } | { kind: "uploading" } | { kind: "error"; message: string } | { kind: "done" };

export function UploadAssetForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [titleError, setTitleError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "idle" });
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
    const result = await uploadRush(projectId, assetId, file, (storagePath) =>
      registerAsset({ projectId, assetId, title: title.data, storagePath }),
    );
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
      <RushFileInput accept={acceptAttribute()} hint="Vidéo ou image, 50 Mo maximum." />
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
