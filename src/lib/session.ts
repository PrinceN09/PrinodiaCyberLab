import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionUser } from "@/lib/auth";

/**
 * Server-side helper to read the current session from cookies.
 * Use in Server Components and route handlers (Node runtime).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
