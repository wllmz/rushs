"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeRefresh } from "../subscribe-refresh";

// Project page: new assets and versions, status changes. Versions carry no project id to filter on:
// RLS limits the events to the user's projects, and a change elsewhere only costs a needless refresh.
export function LiveProjectUpdates({ projectId }: { projectId: string }) {
  const router = useRouter();

  useEffect(
    () =>
      subscribeRefresh(
        createClient(),
        `project:${projectId}`,
        [
          { table: "versions", event: "INSERT" },
          { table: "versions", event: "UPDATE" },
        ],
        () => router.refresh(),
      ),
    [projectId, router],
  );

  return null;
}
