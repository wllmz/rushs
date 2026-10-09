export const SIGN_IN_PATH = "/login";
export const HOME_PATH = "/projects";

const AUTH_PAGES = ["/login", "/signup"];
// Reachable whether signed in or not: the email confirmation link lands here
const PUBLIC_PATHS = ["/auth/callback"];

function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Where the proxy should send the visitor, or null to let the request through
export function getAuthRedirect(pathname: string, isSignedIn: boolean): string | null {
  if (matches(pathname, PUBLIC_PATHS)) return null;
  if (matches(pathname, AUTH_PAGES)) return isSignedIn ? HOME_PATH : null;
  return isSignedIn ? null : SIGN_IN_PATH;
}
