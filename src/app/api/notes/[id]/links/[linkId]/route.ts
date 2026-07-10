import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { id, linkId } = await params;
  const user = await getCurrentUser();

  const { count } = await prisma.noteLink.deleteMany({
    where: { id: linkId, noteId: id, note: { userId: user.id } },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
