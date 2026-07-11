import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { recomputeMatches } from "@/lib/jobs/matching-service";

/**
 * POST /api/matching/recompute — recalculate job-match scores.
 * Body (optional): { postingIds: string[] }
 * Called after skills, labs, projects, certifications, or portfolio
 * repos change, and available manually from the dashboard.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  let postingIds: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.postingIds)) {
      if (body.postingIds.some((id: unknown) => typeof id !== "string")) {
        return NextResponse.json(
          { error: "postingIds must be strings" },
          { status: 400 }
        );
      }
      postingIds = body.postingIds.slice(0, 500);
    }
  } catch {
    // empty body = recompute all active
  }

  try {
    const summary = await recomputeMatches(user.id, postingIds);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("Match recomputation failed:", err);
    return NextResponse.json(
      { error: "Could not recompute matches. Please try again." },
      { status: 500 }
    );
  }
}
