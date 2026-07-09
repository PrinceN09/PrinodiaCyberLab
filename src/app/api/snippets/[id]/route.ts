import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const snippet = await prisma.codeSnippet.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.language !== undefined && { language: body.language }),
      ...(body.code !== undefined && { code: body.code }),
    },
  });
  return NextResponse.json(snippet);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.codeSnippet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
