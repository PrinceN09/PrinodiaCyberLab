import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { fetchJobStats } from "@/lib/jobs/queries";

/** GET /api/job-postings/stats — dashboard summary cards. */
export async function GET() {
  const user = await getCurrentUser();
  try {
    return NextResponse.json(await fetchJobStats(user.id));
  } catch (err) {
    console.error("Job stats query failed:", err);
    return NextResponse.json(
      { error: "Could not load stats." },
      { status: 500 }
    );
  }
}
