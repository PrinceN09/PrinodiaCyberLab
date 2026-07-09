import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = await req.json();
  const item = await prisma.portfolioItem.update({
    where: { id },
    data: {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.description !== undefined && { description: b.description }),
      ...(b.category !== undefined && { category: b.category }),
      ...(b.url !== undefined && { url: b.url }),
      ...(b.repoUrl !== undefined && { repoUrl: b.repoUrl }),
      ...(b.tech !== undefined && { tech: b.tech }),
      ...(b.featured !== undefined && { featured: b.featured }),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.portfolioItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
