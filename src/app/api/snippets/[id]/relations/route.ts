import { NextResponse } from "next/server";
import type { NoteLinkType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

/** Snippets can link to notes, projects, courses, and lessons. */
const ALLOWED_TARGETS: NoteLinkType[] = ["NOTE", "PROJECT", "COURSE", "LESSON"];

async function ownedSnippet(id: string, userId: string) {
  return prisma.codeSnippet.findFirst({
    where: { id, userId },
    select: { id: true },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!(await ownedSnippet(id, user.id))) {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  }

  const relations = await prisma.codeSnippetRelation.findMany({
    where: { snippetId: id },
    orderBy: [{ targetType: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(relations);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!(await ownedSnippet(id, user.id))) {
    return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const targetType = body?.targetType as NoteLinkType | undefined;
  const targetId = typeof body?.targetId === "string" ? body.targetId : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";

  if (
    !targetType ||
    !ALLOWED_TARGETS.includes(targetType) ||
    !targetId ||
    !label
  ) {
    return NextResponse.json(
      { error: "Invalid relation payload" },
      { status: 400 }
    );
  }

  const relation = await prisma.codeSnippetRelation.upsert({
    where: {
      snippetId_targetType_targetId: { snippetId: id, targetType, targetId },
    },
    update: { label },
    create: { snippetId: id, targetType, targetId, label },
  });
  return NextResponse.json(relation, { status: 201 });
}
