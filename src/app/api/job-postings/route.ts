import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { parseJobQuery } from "@/lib/jobs/discovery";
import { fetchJobPage } from "@/lib/jobs/queries";

/**
 * GET /api/job-postings — active job discovery.
 * All params are validated by parseJobQuery; the mandatory
 * DISCOVERABLE_WHERE filter is applied inside buildJobWhere.
 */
export async function GET(req: Request) {
  await getCurrentUser(); // session context (single-user app)

  try {
    const query = parseJobQuery(new URL(req.url).searchParams);
    return NextResponse.json(await fetchJobPage(query));
  } catch (err) {
    console.error("Job discovery query failed:", err);
    return NextResponse.json(
      { error: "Could not load jobs. Please try again." },
      { status: 500 }
    );
  }
}
