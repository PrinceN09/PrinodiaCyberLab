import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const items = await prisma.coverLetter.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const item = await prisma.coverLetter.create({
    data: {
      title: b.title ?? "New cover letter",
      company: b.company ?? null,
      role: b.role ?? null,
      content: b.content ?? "",
      userId: user.id,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
