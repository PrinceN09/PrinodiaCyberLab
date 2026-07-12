import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCurrentUser } from "@/lib/current-user";
import { validatePreferencePatch } from "@/lib/jobs/preferences";
import {
  getJobPreferences,
  updateJobPreferences,
} from "@/lib/jobs/preferences-service";
import { recomputeMatches } from "@/lib/jobs/matching-service";

/** GET — the authenticated user's job-search preferences (with defaults). */
export async function GET() {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const user = await getCurrentUser();
  return NextResponse.json(await getJobPreferences(user.id));
}

/**
 * PATCH — update preferences. A preference change materially affects
 * eligibility/scoring, so matches are recomputed for this user.
 */
export async function PATCH(req: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const user = await getCurrentUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch = validatePreferencePatch(body);
  if (!patch) {
    return NextResponse.json(
      { error: "Invalid preference values" },
      { status: 400 }
    );
  }

  try {
    const preferences = await updateJobPreferences(user.id, patch);
    const recompute = await recomputeMatches(user.id);
    console.info(
      `[job-preferences] user=${user.id} updated ${Object.keys(patch).length} field(s); ` +
        `recomputed ${recompute.postings} postings in ${recompute.durationMs}ms`
    );
    return NextResponse.json({ preferences, recompute });
  } catch (err) {
    console.error("Preference update failed:", err);
    return NextResponse.json(
      { error: "Could not update preferences. Please try again." },
      { status: 500 }
    );
  }
}
