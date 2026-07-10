import { NextResponse } from "next/server";
import type { NoteLinkType } from "@prisma/client";
import { getCurrentUser } from "@/lib/current-user";
import { NOTE_LINK_TYPES, searchKnowledge } from "@/lib/notes/knowledge";

/**
 * GET /api/knowledge/search?q=…&types=COURSE,LESSON&exclude=<noteId>
 * Cross-module search for the Related Knowledge link picker.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const excludeNoteId = url.searchParams.get("exclude") ?? undefined;

  const typesParam = url.searchParams.get("types");
  const types: NoteLinkType[] = typesParam
    ? (typesParam
        .split(",")
        .filter((t) =>
          NOTE_LINK_TYPES.includes(t as NoteLinkType)
        ) as NoteLinkType[])
    : [...NOTE_LINK_TYPES];

  if (types.length === 0) {
    return NextResponse.json({ error: "No valid types" }, { status: 400 });
  }

  const results = await searchKnowledge({
    userId: user.id,
    q,
    types,
    excludeNoteId,
  });
  return NextResponse.json(results);
}
