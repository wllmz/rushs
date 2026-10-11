"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Mostly a rush url that could not be signed: the version was deleted meanwhile, or Storage is down
export default function AssetError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-lg font-medium">Impossible d&apos;afficher ce rush</h1>
      <p className="text-sm text-foreground/60">La version a peut-être été supprimée entre-temps.</p>
      <Button type="button" onClick={() => retry()}>
        Réessayer
      </Button>
    </div>
  );
}
