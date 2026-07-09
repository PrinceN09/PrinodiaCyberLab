import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = await req.json();
  const job = await prisma.jobApplication.update({
    where: { id },
    data: {
      ...(b.company !== undefined && { company: b.company }),
      ...(b.jobTitle !== undefined && { jobTitle: b.jobTitle }),
      ...(b.location !== undefined && { location: b.location }),
      ...(b.salary !== undefined && { salary: b.salary }),
      ...(b.url !== undefined && { url: b.url }),
      ...(b.status !== undefined && { status: b.status }),
      ...(b.appliedDate !== undefined && {
        appliedDate: b.appliedDate ? new Date(b.appliedDate) : null,
      }),
      ...(b.interviewDate !== undefined && {
        interviewDate: b.interviewDate ? new Date(b.interviewDate) : null,
      }),
      ...(b.notes !== undefined && { notes: b.notes }),
    },
  });
  return NextResponse.json(job);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.jobApplication.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
