import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getAuthRedirect } from "@/features/auth/routes";
import type { Database } from "@/lib/supabase/database.types";

// Refreshes the Supabase session on every request, then guards the routes.
// This is UX only: data access is protected by RLS in the database.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims verifies the JWT signature, unlike getSession which trusts the cookie
  const { data } = await supabase.auth.getClaims();
  const redirectTo = getAuthRedirect(request.nextUrl.pathname, Boolean(data?.claims));

  if (redirectTo) {
    const redirect = NextResponse.redirect(new URL(redirectTo, request.url));
    // Keep the refreshed session cookies on the redirect
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
