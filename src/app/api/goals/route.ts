import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const goals = await prisma.studyGoal.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const goal = await prisma.studyGoal.create({
    data: {
      title: b.title ?? "New goal",
      type: b.type ?? "WEEKLY_HOURS",
      target: Number(b.target) || 0,
      current: Number(b.current) || 0,
      unit: b.unit ?? "hours",
      active: b.active ?? true,
      userId: user.id,
    },
  });
  return NextResponse.json(goal, { status: 201 });
}
