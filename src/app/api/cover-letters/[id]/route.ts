import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = await req.json();
  const item = await prisma.coverLetter.update({
    where: { id },
    data: {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.company !== undefined && { company: b.company }),
      ...(b.role !== undefined && { role: b.role }),
      ...(b.content !== undefined && { content: b.content }),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.coverLetter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
