import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const report = await prisma.report.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.severity !== undefined && { severity: body.severity }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.reference !== undefined && { reference: body.reference }),
      ...(body.content !== undefined && { content: body.content }),
    },
  });
  return NextResponse.json(report);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.report.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
