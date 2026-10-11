import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Comment = {
  id: string;
  body: string;
  timecode: number | null;
  createdAt: string;
  // null when the account is deleted or no longer shares a project with the viewer
  authorName: string | null;
};

// Oldest first, like a conversation. RLS returns nothing outside the user's projects.
export async function listComments(versionId: string): Promise<Comment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select("id, body, timecode, created_at, author:profiles (full_name)")
    .eq("version_id", versionId)
    .order("created_at", { ascending: true })
    // Two comments sent in the same instant keep a stable order
    .order("id", { ascending: true });
  if (error) throw new Error(`Could not list comments: ${error.message}`);

  return data.map((comment) => ({
    id: comment.id,
    body: comment.body,
    timecode: comment.timecode,
    createdAt: comment.created_at,
    authorName: comment.author?.full_name ?? null,
  }));
}
