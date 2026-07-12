import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCurrentUser } from "@/lib/current-user";
import { recomputeMatches } from "@/lib/jobs/matching-service";
import { checkRecomputeCooldown } from "@/lib/jobs/recompute-guard";

/**
 * POST /api/matching/recompute — recalculate job-match scores.
 * Body (optional): { postingIds: string[] }
 *
 * Security posture:
 * - Authentication mandatory (middleware + explicit session check)
 * - Recomputation is scoped to the authenticated user's profile —
 *   there is no way to name another user
 * - postingIds validated (strings, capped at 500)
 * - 60s per-user cooldown against repeated expensive requests
 * - Errors return a generic message; details go to server logs only
 */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  const user = await getCurrentUser();

  const cooldown = checkRecomputeCooldown(user.id);
  if (!cooldown.allowed) {
    return NextResponse.json(
      {
        error: `Matches were recomputed recently — try again in ${cooldown.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(cooldown.retryAfterSeconds) },
      }
    );
  }

  let postingIds: string[] | undefined;
  try {
    const body = await req.json();
    if (body !== null && typeof body === "object" && "postingIds" in body) {
      const ids = (body as { postingIds: unknown }).postingIds;
      if (
        !Array.isArray(ids) ||
        ids.some((id) => typeof id !== "string" || id.length > 64)
      ) {
        return NextResponse.json(
          { error: "postingIds must be an array of ids" },
          { status: 400 }
        );
      }
      postingIds = (ids as string[]).slice(0, 500);
    }
  } catch {
    // empty body = recompute all active postings for this user
  }

  try {
    const summary = await recomputeMatches(user.id, postingIds);
    console.info(
      `[matching] recompute user=${user.id} scope=${postingIds ? `${postingIds.length} ids` : "all-active"} ` +
        `postings=${summary.postings} scored=${summary.scored} ineligible=${summary.ineligible} in ${summary.durationMs}ms`
    );
    return NextResponse.json(summary);
  } catch (err) {
    console.error("Match recomputation failed:", err);
    return NextResponse.json(
      { error: "Could not recompute matches. Please try again." },
      { status: 500 }
    );
  }
}
