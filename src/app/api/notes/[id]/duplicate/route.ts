import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { NOTE_INCLUDE } from "@/lib/notes/save-note";

/**
 * Duplicates a note: content + metadata + tags + knowledge links.
 * Versions and attachments intentionally stay with the original.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  const source = await prisma.note.findFirst({
    where: { id, userId: user.id },
    include: { tags: true, links: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const copy = await prisma.note.create({
    data: {
      title: `${source.title} (copy)`,
      summary: source.summary,
      description: source.description,
      content: source.content,
      status: "DRAFT",
      difficulty: source.difficulty,
      categoryId: source.categoryId,
      folderId: source.folderId,
      lessonId: source.lessonId,
      userId: user.id,
      tags: { connect: source.tags.map((t) => ({ id: t.id })) },
      links: {
        create: source.links.map((l) => ({
          targetType: l.targetType,
          targetId: l.targetId,
          label: l.label,
        })),
      },
    },
    include: NOTE_INCLUDE,
  });
  return NextResponse.json(copy, { status: 201 });
}
