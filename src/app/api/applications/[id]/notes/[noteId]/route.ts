import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import { deleteNote, updateNote } from "@/lib/applications/note-service";
import { validateNoteInput } from "@/lib/applications/validation";

type Ctx = { params: Promise<{ id: string; noteId: string }> };

/** PATCH /api/applications/:id/notes/:noteId */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { noteId } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const valid = validateNoteInput(parsed.body, { partial: true });
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    return NextResponse.json(await updateNote(auth.userId, noteId, valid.value));
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/applications/:id/notes/:noteId */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { noteId } = await params;
  try {
    return NextResponse.json(await deleteNote(auth.userId, noteId));
  } catch (err) {
    return errorResponse(err);
  }
}
