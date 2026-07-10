import { NextResponse } from "next/server";
import type { NoteLinkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { NOTE_LINK_TYPES } from "@/lib/notes/knowledge";

async function ownedNote(id: string, userId: string) {
  return prisma.note.findFirst({ where: { id, userId }, select: { id: true } });
}

/** Lists a note's knowledge links. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!(await ownedNote(id, user.id))) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const links = await prisma.noteLink.findMany({
    where: { noteId: id },
    orderBy: [{ targetType: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(links);
}

/** Creates a knowledge link { targetType, targetId, label }. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!(await ownedNote(id, user.id))) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const targetType = body?.targetType as NoteLinkType | undefined;
  const targetId = typeof body?.targetId === "string" ? body.targetId : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";

  if (
    !targetType ||
    !NOTE_LINK_TYPES.includes(targetType) ||
    !targetId ||
    !label
  ) {
    return NextResponse.json({ error: "Invalid link payload" }, { status: 400 });
  }
  if (targetType === "NOTE" && targetId === id) {
    return NextResponse.json(
      { error: "A note cannot link to itself" },
      { status: 400 }
    );
  }

  // Idempotent thanks to the unique constraint.
  const link = await prisma.noteLink.upsert({
    where: {
      noteId_targetType_targetId: { noteId: id, targetType, targetId },
    },
    update: { label },
    create: { noteId: id, targetType, targetId, label },
  });
  return NextResponse.json(link, { status: 201 });
}
