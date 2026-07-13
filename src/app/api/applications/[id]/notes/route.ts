import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import { createNote } from "@/lib/applications/note-service";
import { validateNoteInput } from "@/lib/applications/validation";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/applications/:id/notes — add an application note. */
export async function POST(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const valid = validateNoteInput(parsed.body);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    const note = await createNote(auth.userId, id, valid.value);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
