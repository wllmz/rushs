"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { addVersion } from "../actions";
import { acceptAttribute, validateRushFile, type AssetKind } from "../file-rules";
import { uploadRush } from "../upload-rush";
import { RushFileInput } from "./rush-file-input";

type Status = { kind: "idle" } | { kind: "uploading" } | { kind: "error"; message: string };

const HINTS: Record<AssetKind, string> = {
  video: "Une vidéo, 50 Mo maximum.",
  image: "Une image, 50 Mo maximum.",
};

type AddVersionFormProps = { projectId: string; assetId: string; assetKind: AssetKind };

export function AddVersionForm({ projectId, assetId, assetKind }: AddVersionFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "idle" });
    const file = new FormData(event.currentTarget).get("file");

    if (!(file instanceof File) || file.size === 0) {
      setStatus({ kind: "error", message: "Choisissez un fichier." });
      return;
    }
    const fileError = validateRushFile(file, assetKind);
    if (fileError) {
      setStatus({ kind: "error", message: fileError });
      return;
    }

    setStatus({ kind: "uploading" });
    const result = await uploadRush(projectId, assetId, file, (storagePath) =>
      addVersion({ projectId, assetId, storagePath }),
    );
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error });
      return;
    }

    formRef.current?.reset();
    setStatus({ kind: "idle" });
    // Show the version just added
    router.push(`/projects/${projectId}/assets/${assetId}?v=${result.number}`);
  }

  const uploading = status.kind === "uploading";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <RushFileInput accept={acceptAttribute(assetKind)} hint={HINTS[assetKind]} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={uploading}>
          {uploading ? "Envoi en cours…" : "Ajouter la version"}
        </Button>
        {status.kind === "error" && (
          <p role="alert" className="text-sm text-red-600">
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}
