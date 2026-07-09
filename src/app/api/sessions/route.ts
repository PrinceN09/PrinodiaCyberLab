import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const sessions = await prisma.studySession.findMany({
    orderBy: { date: "desc" },
    include: { course: true },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const session = await prisma.studySession.create({
    data: {
      date: b.date ? new Date(b.date) : new Date(),
      minutes: Number(b.minutes) || 0,
      topic: b.topic ?? "Study session",
      focus: b.focus ?? null,
      notes: b.notes ?? null,
      courseId: b.courseId ?? null,
      userId: user.id,
    },
  });
  return NextResponse.json(session, { status: 201 });
}
