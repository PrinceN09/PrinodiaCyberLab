import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { parseSnippetPatch, saveSnippet } from "@/lib/code/save-snippet";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = parseSnippetPatch(body);
  if (!patch) {
    return NextResponse.json(
      { error: "Invalid snippet patch" },
      { status: 400 }
    );
  }

  try {
    const user = await getCurrentUser();
    const snippet = await saveSnippet({ id, userId: user.id, patch });
    if (!snippet) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }
    return NextResponse.json(snippet);
  } catch (err) {
    console.error(`Failed to save snippet ${id}:`, err);
    return NextResponse.json(
      { error: "Could not save the snippet. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const { count } = await prisma.codeSnippet.deleteMany({
      where: { id, userId: user.id },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Snippet not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete snippet ${id}:`, err);
    return NextResponse.json(
      { error: "Could not delete the snippet. Please try again." },
      { status: 500 }
    );
  }
}
