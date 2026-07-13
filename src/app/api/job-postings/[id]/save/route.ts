import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canUnsave } from "@/lib/jobs/discovery";
import { saveFromPosting } from "@/lib/applications/application-service";
import { errorResponse } from "@/lib/applications/route-helpers";

/**
 * POST — save a posting (creates a SAVED application, idempotent).
 * DELETE — unsave (only while the application hasn't progressed;
 *          real tracking history is never deleted here).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  try {
    const application = await saveFromPosting(user.id, id);
    return NextResponse.json(application, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const existing = await prisma.jobApplication.findFirst({
    where: { userId: user.id, jobPostingId: id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not saved" }, { status: 404 });
  }
  if (!canUnsave(existing.status)) {
    return NextResponse.json(
      {
        error:
          "This application has progressed and is tracked in the Job Tracker — it can't be unsaved.",
      },
      { status: 409 }
    );
  }

  await prisma.jobApplication.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
