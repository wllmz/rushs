"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setVersionStatus } from "../actions";
import { REVIEW_STATUSES, STATUS_LABELS, type ReviewStatus } from "../review-status";

type ReviewStatusButtonsProps = {
  projectId: string;
  assetId: string;
  number: number;
  status: ReviewStatus;
};

// One button per status; the current one is pressed. The page re-renders with the new status once saved.
export function ReviewStatusButtons({ projectId, assetId, number, status }: ReviewStatusButtonsProps) {
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // Buttons stay enabled so the focus and the pressed state survive a click: repeated clicks are ignored here
  function handleChange(next: ReviewStatus) {
    if (pending || next === status) return;
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const result = await setVersionStatus({ projectId, assetId, number, status: next }).catch(() => ({
        ok: false as const,
        error: "Changement de statut impossible. Réessayez.",
      }));
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label={`Statut de la version ${number}`}
        aria-busy={pending}
        className="flex flex-wrap gap-2"
      >
        {REVIEW_STATUSES.map((option) => {
          const current = option === status;
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={current ? "primary" : "ghost"}
              aria-pressed={current}
              onClick={() => handleChange(option)}
            >
              {STATUS_LABELS[option]}
            </Button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <p aria-live="polite" className="text-sm text-foreground/60">
        {pending ? "Enregistrement…" : saved ? "Statut mis à jour." : ""}
      </p>
    </div>
  );
}
