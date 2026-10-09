import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH } from "@/features/auth/routes";
import { createClient } from "@/lib/supabase/server";

// The email confirmation link lands here with a one-time code to trade for a session
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(HOME_PATH, request.url));
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
