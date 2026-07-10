import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; relationId: string }> }
) {
  const { id, relationId } = await params;
  const user = await getCurrentUser();

  const { count } = await prisma.codeSnippetRelation.deleteMany({
    where: { id: relationId, snippetId: id, snippet: { userId: user.id } },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Relation not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
