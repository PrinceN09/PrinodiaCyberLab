import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import { createAssessment } from "@/lib/applications/assessment-service";
import { validateAssessmentInput } from "@/lib/applications/validation";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/applications/:id/assessments — add an assessment record. */
export async function POST(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const valid = validateAssessmentInput(parsed.body);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    const assessment = await createAssessment(auth.userId, id, valid.value);
    return NextResponse.json(assessment, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
