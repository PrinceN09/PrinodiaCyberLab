import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const note = await prisma.note.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
      ...(body.folderId !== undefined && { folderId: body.folderId || null }),
      ...(Array.isArray(body.tags) && {
        tags: {
          set: [],
          connectOrCreate: (body.tags as string[]).map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      }),
    },
    include: { folder: true, tags: true },
  });
  return NextResponse.json(note);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
