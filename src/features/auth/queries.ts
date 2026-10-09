import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { SIGN_IN_PATH } from "./routes";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
};

// The single entry point to know who is signed in, on the server.
// cache() runs it once per request, however many components ask.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) redirect(SIGN_IN_PATH);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", claims.sub)
    .single();
  // PGRST116 = no row: the email stands in for the name. Anything else is worth a trace.
  if (error && error.code !== "PGRST116") console.error("Profile lookup failed", error.code, error.message);

  return {
    id: claims.sub,
    email: claims.email ?? "",
    fullName: profile?.full_name ?? claims.email ?? "",
  };
});
