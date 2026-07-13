import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import { transitionApplication } from "@/lib/applications/transition-service";
import { validateTransition } from "@/lib/applications/validation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/applications/:id/transition — change status.
 * Body: { status | to, reopen?, note? }. All transition validation
 * happens in the transition service against the central graph.
 */
export async function POST(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const valid = validateTransition(parsed.body);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    const result = await transitionApplication(auth.userId, id, {
      to: valid.value.to,
      reopen: valid.value.reopen,
      note: valid.value.note,
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
