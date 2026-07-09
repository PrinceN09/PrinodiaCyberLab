import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = await req.json();
  const goal = await prisma.studyGoal.update({
    where: { id },
    data: {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.type !== undefined && { type: b.type }),
      ...(b.target !== undefined && { target: Number(b.target) }),
      ...(b.current !== undefined && { current: Number(b.current) }),
      ...(b.unit !== undefined && { unit: b.unit }),
      ...(b.active !== undefined && { active: b.active }),
    },
  });
  return NextResponse.json(goal);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.studyGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
