import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

/** Returns a single version including its full content (for preview). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  const user = await getCurrentUser();

  const version = await prisma.noteVersion.findFirst({
    where: { id: versionId, noteId: id, note: { userId: user.id } },
  });
  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }
  return NextResponse.json(version);
}
