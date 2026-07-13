import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import {
  deleteApplication,
  getApplication,
  updateApplication,
} from "@/lib/applications/application-service";
import { validateApplicationUpdate } from "@/lib/applications/validation";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/applications/:id — full detail (user-scoped). */
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    return NextResponse.json(await getApplication(auth.userId, id));
  } catch (err) {
    return errorResponse(err);
  }
}

/** PATCH /api/applications/:id — update fields / contacts / follow-up. */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const valid = validateApplicationUpdate(parsed.body);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    return NextResponse.json(await updateApplication(auth.userId, id, valid.value));
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/applications/:id */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    return NextResponse.json(await deleteApplication(auth.userId, id));
  } catch (err) {
    return errorResponse(err);
  }
}
