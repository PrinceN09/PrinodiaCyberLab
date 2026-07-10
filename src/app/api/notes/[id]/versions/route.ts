import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

/** Lists version snapshots for a note (newest first, content excluded). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const note = await prisma.note.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const versions = await prisma.noteVersion.findMany({
    where: { noteId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, cause: true, createdAt: true },
  });
  return NextResponse.json(versions);
}
