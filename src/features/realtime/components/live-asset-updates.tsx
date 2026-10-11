"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeRefresh } from "../subscribe-refresh";

// Asset page: comments on the version shown, new versions and status changes of the asset
export function LiveAssetUpdates({ assetId, versionId }: { assetId: string; versionId: string }) {
  const router = useRouter();

  useEffect(
    () =>
      subscribeRefresh(
        createClient(),
        `asset:${assetId}:${versionId}`,
        [
          // Comments are never edited nor deleted
          { table: "comments", event: "INSERT", filter: `version_id=eq.${versionId}` },
          { table: "versions", event: "INSERT", filter: `asset_id=eq.${assetId}` },
          { table: "versions", event: "UPDATE", filter: `asset_id=eq.${assetId}` },
        ],
        () => router.refresh(),
      ),
    [assetId, versionId, router],
  );

  return null;
}
