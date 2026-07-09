import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const jobs = await prisma.jobApplication.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const job = await prisma.jobApplication.create({
    data: {
      company: b.company ?? "New company",
      jobTitle: b.jobTitle ?? "New role",
      location: b.location ?? null,
      salary: b.salary ?? null,
      url: b.url ?? null,
      status: b.status ?? "SAVED",
      appliedDate: b.appliedDate ? new Date(b.appliedDate) : null,
      interviewDate: b.interviewDate ? new Date(b.interviewDate) : null,
      notes: b.notes ?? null,
      userId: user.id,
    },
  });
  return NextResponse.json(job, { status: 201 });
}
