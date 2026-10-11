"use client";

import { useState, useTransition } from "react";
import { Button } from "./button";

type ConfirmDeleteButtonProps = {
  // A Server Action bound to what it deletes
  action: () => Promise<{ ok: true } | { ok: false; error: string }>;
  // Read by screen readers, e.g. "Supprimer Interview"
  label: string;
};

// Two steps instead of a browser confirm(): a first click arms, a second deletes
export function ConfirmDeleteButton({ action, label }: ConfirmDeleteButtonProps) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await action();
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
        <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(true)} aria-label={label}>
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
