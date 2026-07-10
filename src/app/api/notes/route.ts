import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { NOTE_INCLUDE, parseNotePatch } from "@/lib/notes/save-note";

export async function GET() {
  const user = await getCurrentUser();
  const notes = await prisma.note.findMany({
    where: { userId: user.id },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: NOTE_INCLUDE,
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = parseNotePatch(body);
  if (!patch) {
    return NextResponse.json({ error: "Invalid note payload" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const { tags, ...fields } = patch;

  const note = await prisma.note.create({
    data: {
      ...fields,
      title: fields.title?.trim() || "Untitled note",
      content: fields.content ?? "",
      userId: user.id,
      ...(tags &&
        tags.length > 0 && {
          tags: {
            connectOrCreate: tags.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
        }),
    },
    include: NOTE_INCLUDE,
  });
  return NextResponse.json(note, { status: 201 });
}
