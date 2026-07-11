import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canUnsave } from "@/lib/jobs/discovery";

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

  const posting = await prisma.jobPosting.findUnique({
    where: { id },
    select: { id: true, title: true, company: true, location: true, applicationUrl: true, primarySourceUrl: true },
  });
  if (!posting) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const existing = await prisma.jobApplication.findFirst({
    where: { userId: user.id, jobPostingId: id },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json(existing); // idempotent
  }

  const application = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      jobPostingId: id,
      company: posting.company,
      jobTitle: posting.title,
      location: posting.location,
      url: posting.applicationUrl ?? posting.primarySourceUrl,
      status: "SAVED",
      events: {
        create: { kind: "status_change", note: "Saved from job discovery" },
      },
    },
    select: { id: true, status: true },
  });
  return NextResponse.json(application, { status: 201 });
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
