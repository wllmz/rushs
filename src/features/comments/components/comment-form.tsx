"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/features/assets/components/player";
import { addComment } from "../actions";
import { commentBodySchema } from "../schemas";

type CommentFormProps = {
  projectId: string;
  assetId: string;
  versionId: string;
  // Offers to pin the comment to the current time of the video
  isVideo: boolean;
};

export function CommentForm({ projectId, assetId, versionId, isVideo }: CommentFormProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const player = usePlayer();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const bodyId = useId();
  const errorId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = commentBodySchema.safeParse(formData.get("body"));
    if (!body.success) {
      setError(body.error.issues[0]?.message);
      return;
    }
    // Read when sending, so the comment points where the video stands now.
    // At 0 the video was never started or moved: a 00:00 pin would only be noise.
    const time = isVideo && formData.get("pin") === "on" ? player.currentTime() : null;
    const timecode = time ? time : null;

    setError(undefined);
    startTransition(async () => {
      const result = await addComment({ projectId, assetId, versionId, body: body.data, timecode }).catch(() => ({
        ok: false as const,
        error: "Envoi du commentaire impossible. Réessayez.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Only the text is cleared: a form reset would check the pin again behind the user's back
      if (bodyRef.current) bodyRef.current.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={bodyId} className="text-sm font-medium">
          Votre commentaire
        </label>
        <textarea
          ref={bodyRef}
          id={bodyId}
          name="body"
          rows={3}
          maxLength={2000}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 aria-invalid:border-red-500"
        />
      </div>
      {isVideo && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pin" defaultChecked />
          Lier au moment actuel de la vidéo
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Envoi…" : "Commenter"}
        </Button>
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
