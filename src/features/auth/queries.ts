import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "./routes";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
};

// The single entry point to know who is signed in, on the server
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) redirect(SIGN_IN_PATH);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", claims.sub)
    .single();

  return {
    id: claims.sub,
    email: claims.email ?? "",
    fullName: profile?.full_name ?? claims.email ?? "",
  };
}
