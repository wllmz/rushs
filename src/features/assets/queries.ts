import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type AssetKind = Database["public"]["Enums"]["asset_kind"];

export type AssetSummary = {
  id: string;
  title: string;
  kind: AssetKind;
  // null once the uploader's account is deleted
  createdBy: string | null;
  createdAt: string;
  latestVersion: { number: number; sizeBytes: number };
};

// RLS returns nothing for a project the user is not a member of
export async function listAssets(projectId: string): Promise<AssetSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assets")
    .select("id, title, kind, created_by, created_at, versions (number, size_bytes)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not list assets: ${error.message}`);

  return data.flatMap((asset) => {
    const latest = asset.versions.reduce<(typeof asset.versions)[number] | null>(
      (best, version) => (best && best.number > version.number ? best : version),
      null,
    );
    // An asset is always registered with its first version: skip one that has none
    if (!latest) return [];
    return [
      {
        id: asset.id,
        title: asset.title,
        kind: asset.kind,
        createdBy: asset.created_by,
        createdAt: asset.created_at,
        latestVersion: { number: latest.number, sizeBytes: latest.size_bytes },
      },
    ];
  });
}
