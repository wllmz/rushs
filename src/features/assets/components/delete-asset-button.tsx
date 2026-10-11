"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAsset } from "../actions";

type DeleteAssetButtonProps = { projectId: string; assetId: string; title: string };

// Two steps instead of a browser confirm(): a first click arms, a second deletes
export function DeleteAssetButton({ projectId, assetId, title }: DeleteAssetButtonProps) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAsset({ projectId, assetId });
      if (!result.ok) {
        setError(result.error);
        setArmed(false);
      }
    });
  }

  if (!armed) {
    return (
      <span className="flex items-center gap-2">
        {error && (
          <span role="alert" className="text-xs text-red-600">
            {error}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setArmed(true)}
          aria-label={`Supprimer ${title}`}
        >
          Supprimer
        </Button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
        {pending ? "Suppression…" : "Confirmer"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(false)} disabled={pending}>
        Annuler
      </Button>
    </span>
  );
}
