import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = await req.json();
  const card = await prisma.flashcard.update({
    where: { id },
    data: {
      ...(b.deck !== undefined && { deck: b.deck }),
      ...(b.front !== undefined && { front: b.front }),
      ...(b.back !== undefined && { back: b.back }),
      ...(b.confidence !== undefined && { confidence: b.confidence }),
      ...(b.timesSeen !== undefined && { timesSeen: b.timesSeen }),
      ...(b.reviewed && { lastReviewed: new Date() }),
    },
  });
  return NextResponse.json(card);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.flashcard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
