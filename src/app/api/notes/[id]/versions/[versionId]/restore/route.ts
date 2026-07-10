import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { NOTE_INCLUDE } from "@/lib/notes/save-note";

/**
 * Restores a note to a previous version. The current state is
 * snapshotted first (cause: "restore-backup") so a restore is
 * itself always reversible.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const user = await getCurrentUser();

  const version = await prisma.noteVersion.findFirst({
    where: { id: versionId, noteId: id, note: { userId: user.id } },
    include: { note: true },
  });
  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  try {
    const note = await prisma.$transaction(async (tx) => {
      await tx.noteVersion.create({
        data: {
          noteId: id,
          title: version.note.title,
          content: version.note.content,
          cause: "restore-backup",
        },
      });
      return tx.note.update({
        where: { id },
        data: { title: version.title, content: version.content },
        include: NOTE_INCLUDE,
      });
    });
    return NextResponse.json(note);
  } catch (err) {
    console.error(`Failed to restore note ${id} to version ${versionId}:`, err);
    return NextResponse.json(
      { error: "Could not restore this version. Please try again." },
      { status: 500 }
    );
  }
}
