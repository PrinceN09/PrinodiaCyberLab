import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { POSTING_LIST_SELECT, toPostingDto } from "@/lib/jobs/posting-dto";

/**
 * GET /api/job-postings/[id] — full posting for the details page.
 * Details are viewable for non-discoverable postings too (saved jobs
 * that turned ineligible remain inspectable); the UI labels them.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await getCurrentUser();

  const posting = await prisma.jobPosting.findUnique({
    where: { id },
    select: {
      ...POSTING_LIST_SELECT,
      description: true,
      isActive: true,
      acceptsCanadianApplicants: true,
      requiresUSResidency: true,
      requiresCitizenship: true,
      requiresSecurityClearance: true,
    },
  });
  if (!posting) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const { description, isActive, acceptsCanadianApplicants, requiresUSResidency, requiresCitizenship, requiresSecurityClearance, ...listFields } = posting;
  return NextResponse.json({
    ...toPostingDto(listFields),
    description,
    isActive,
    acceptsCanadianApplicants,
    requiresUSResidency,
    requiresCitizenship,
    requiresSecurityClearance,
  });
}
