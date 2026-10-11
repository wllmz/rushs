"use client";

import { usePlayer } from "@/features/assets/components/player";
import { formatDate } from "@/lib/format-date";
import type { Comment } from "../queries";
import { formatTimecode } from "../timecode";

export function CommentList({ comments }: { comments: Comment[] }) {
  const player = usePlayer();

  if (comments.length === 0) {
    return <p className="text-sm text-foreground/60">Aucun commentaire sur cette version.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {comments.map((comment) => (
        <li key={comment.id} className="flex flex-col gap-1 rounded-lg border border-foreground/10 px-4 py-3">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/60">
            <span className="font-medium text-foreground">{comment.authorName ?? "Auteur inconnu"}</span>
            <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
            {comment.timecode !== null && (
              <button
                type="button"
                onClick={() => player.seek(comment.timecode ?? 0)}
                aria-label={`Aller à ${formatTimecode(comment.timecode)} dans la vidéo`}
                className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-foreground/15"
              >
                {formatTimecode(comment.timecode)}
              </button>
            )}
          </p>
          <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
        </li>
      ))}
    </ol>
  );
}
