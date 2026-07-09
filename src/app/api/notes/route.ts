import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const notes = await prisma.note.findMany({
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: { folder: true, tags: true },
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  const note = await prisma.note.create({
    data: {
      title: body.title ?? "Untitled note",
      content: body.content ?? "",
      userId: user.id,
    },
    include: { folder: true, tags: true },
  });
  return NextResponse.json(note, { status: 201 });
}
