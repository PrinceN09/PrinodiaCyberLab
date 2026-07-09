import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const items = await prisma.interviewPrep.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const item = await prisma.interviewPrep.create({
    data: {
      category: b.category ?? "General",
      question: b.question ?? "New question",
      answer: b.answer ?? "",
      confidence: b.confidence ?? 0,
      userId: user.id,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
