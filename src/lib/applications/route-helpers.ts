/**
 * Shared route plumbing for the application CRM: authentication and
 * safe error mapping. Keeps handlers thin — authenticate, validate,
 * call a service, map errors — and guarantees Prisma errors never
 * reach the client.
 */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCurrentUser } from "@/lib/current-user";
import { isApplicationError } from "./errors";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/** Resolves the authenticated user id, or a 401 response. */
export async function authenticate(): Promise<AuthResult> {
  const session = await getSessionUser();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  const user = await getCurrentUser();
  return { ok: true, userId: user.id };
}

/** Maps a thrown error to a user-safe HTTP response. */
export function errorResponse(err: unknown): NextResponse {
  if (isApplicationError(err)) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[applications] unhandled error:", err);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

/** Parses a JSON body, returning a 400 response on malformed input. */
export async function readJson(
  req: Request
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}
