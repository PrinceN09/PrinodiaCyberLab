import { NextResponse } from "next/server";
import { authenticate, errorResponse } from "@/lib/applications/route-helpers";
import { getTrackerSummary } from "@/lib/applications/attention-service";

/** GET /api/applications/summary — dashboard stats + attention feed. */
export async function GET() {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getTrackerSummary(auth.userId));
  } catch (err) {
    return errorResponse(err);
  }
}
