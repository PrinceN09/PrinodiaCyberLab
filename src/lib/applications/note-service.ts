/**
 * ApplicationNoteService — lightweight per-application notes (kept
 * decoupled from the main Notes module). User-scoped; note_added
 * timeline event on creation.
 */
import { prisma } from "@/lib/prisma";
import { forbidden, notFound } from "./errors";
import { requireOwnedApplication } from "./application-service";
import { recordEvent } from "./timeline";

export async function createNote(
  userId: string,
  applicationId: string,
  data: { body?: string; category?: string }
) {
  await requireOwnedApplication(userId, applicationId);
  return prisma.$transaction(async (tx) => {
    const note = await tx.applicationNote.create({
      data: {
        applicationId,
        userId,
        body: data.body as string,
        category: (data.category as never) ?? "GENERAL",
      },
    });
    await recordEvent(tx, applicationId, {
      kind: "note_added",
      userId,
      summary: (data.category as string) ?? "GENERAL",
      metadata: { noteId: note.id },
    });
    return note;
  });
}

export async function updateNote(
  userId: string,
  noteId: string,
  data: { body?: string; category?: string }
) {
  const existing = await prisma.applicationNote.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true },
  });
  if (!existing) throw notFound("Note not found");
  if (existing.userId !== userId) throw forbidden();
  return prisma.applicationNote.update({
    where: { id: noteId },
    data: {
      ...(data.body !== undefined && { body: data.body }),
      ...(data.category !== undefined && { category: data.category as never }),
    },
  });
}

export async function deleteNote(userId: string, noteId: string) {
  const existing = await prisma.applicationNote.findUnique({
    where: { id: noteId },
    select: { id: true, userId: true },
  });
  if (!existing) throw notFound("Note not found");
  if (existing.userId !== userId) throw forbidden();
  await prisma.applicationNote.delete({ where: { id: noteId } });
  return { ok: true };
}
