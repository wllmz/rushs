import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AssetKind } from "./file-rules";
import type { ReviewStatus } from "./review-status";
import { pickVersion } from "./versions";

export type AssetSummary = {
  id: string;
  title: string;
  kind: AssetKind;
  // null once the uploader's account is deleted
  createdBy: string | null;
  createdAt: string;
  latestVersion: { number: number; sizeBytes: number; status: ReviewStatus };
  // A reviewed asset is part of the review history: it can no longer be deleted
  isReviewed: boolean;
};

// RLS returns nothing for a project the user is not a member of
export async function listAssets(projectId: string): Promise<AssetSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assets")
    .select("id, title, kind, created_by, created_at, versions (number, size_bytes, status)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not list assets: ${error.message}`);

  return data.flatMap((asset) => {
    const latest = pickVersion(asset.versions, undefined);
    // An asset is always registered with its first version: skip one that has none
    if (!latest) return [];
    return [
      {
        id: asset.id,
        title: asset.title,
        kind: asset.kind,
        createdBy: asset.created_by,
        createdAt: asset.created_at,
        latestVersion: { number: latest.number, sizeBytes: latest.size_bytes, status: latest.status },
        isReviewed: asset.versions.some((version) => version.status !== "pending"),
      },
    ];
  });
}

export type AssetVersion = {
  number: number;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  // null once the uploader's account is deleted
  uploadedBy: string | null;
  // null when the account is deleted or no longer shares a project with the viewer
  uploaderName: string | null;
  status: ReviewStatus;
  // Who set the status and when; null while nobody has reviewed the version
  reviewerName: string | null;
  reviewedAt: string | null;
};

export type AssetDetail = {
  id: string;
  projectId: string;
  title: string;
  kind: AssetKind;
  createdBy: string | null;
  // Newest first
  versions: AssetVersion[];
};

// null when the asset does not exist or belongs to a project the user is not a member of.
// cache() shares one query between the page and its metadata.
export const getAsset = cache(async (assetId: string): Promise<AssetDetail | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assets")
    .select(
      "id, project_id, title, kind, created_by, versions (number, storage_path, mime_type, size_bytes, created_at, uploaded_by, status, reviewed_at, uploader:profiles!versions_uploaded_by_fkey (full_name), reviewer:profiles!versions_reviewed_by_fkey (full_name))",
    )
    .eq("id", assetId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the asset: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    title: data.title,
    kind: data.kind,
    createdBy: data.created_by,
    versions: data.versions
      .map((version) => ({
        number: version.number,
        storagePath: version.storage_path,
        mimeType: version.mime_type,
        sizeBytes: version.size_bytes,
        createdAt: version.created_at,
        uploadedBy: version.uploaded_by,
        uploaderName: version.uploader?.full_name ?? null,
        status: version.status,
        reviewerName: version.reviewer?.full_name ?? null,
        reviewedAt: version.reviewed_at,
      }))
      .sort((a, b) => b.number - a.number),
  };
});

const SIGNED_URL_TTL_SECONDS = 60 * 60;

// The bucket is private: the player gets a short-lived link, checked against the storage read policy
export async function getRushUrl(storagePath: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("rushes").createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(`Could not sign the rush url: ${error.message}`);
  return data.signedUrl;
}
