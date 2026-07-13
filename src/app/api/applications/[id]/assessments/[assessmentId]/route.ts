import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import {
  deleteAssessment,
  updateAssessment,
} from "@/lib/applications/assessment-service";
import { validateAssessmentInput } from "@/lib/applications/validation";

type Ctx = { params: Promise<{ id: string; assessmentId: string }> };

/** PATCH /api/applications/:id/assessments/:assessmentId */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { assessmentId } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const valid = validateAssessmentInput(parsed.body, { partial: true });
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    return NextResponse.json(
      await updateAssessment(auth.userId, assessmentId, valid.value)
    );
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/applications/:id/assessments/:assessmentId */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { assessmentId } = await params;
  try {
    return NextResponse.json(await deleteAssessment(auth.userId, assessmentId));
  } catch (err) {
    return errorResponse(err);
  }
}
