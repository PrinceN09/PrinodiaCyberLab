import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const items = await prisma.resume.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const item = await prisma.resume.create({
    data: {
      title: b.title ?? "Untitled resume",
      targetRole: b.targetRole ?? "SOC Analyst",
      content: b.content ?? {},
      userId: user.id,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
