import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { parseNotePatch, saveNote } from "@/lib/notes/save-note";
import { deleteNoteAttachmentDir } from "@/lib/notes/attachment-storage";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = parseNotePatch(body);
  if (!patch) {
    return NextResponse.json({ error: "Invalid note patch" }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const note = await saveNote({ id, userId: user.id, patch });
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json(note);
  } catch (err) {
    console.error(`Failed to save note ${id}:`, err);
    return NextResponse.json(
      { error: "Could not save the note. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const { count } = await prisma.note.deleteMany({
      where: { id, userId: user.id },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    await deleteNoteAttachmentDir(id); // best-effort cleanup of files on disk
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete note ${id}:`, err);
    return NextResponse.json(
      { error: "Could not delete the note. Please try again." },
      { status: 500 }
    );
  }
}
