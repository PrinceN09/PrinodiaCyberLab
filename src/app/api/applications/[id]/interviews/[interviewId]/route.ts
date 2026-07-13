import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import {
  deleteInterview,
  updateInterview,
} from "@/lib/applications/interview-service";
import { validateInterviewInput } from "@/lib/applications/validation";

type Ctx = { params: Promise<{ id: string; interviewId: string }> };

/** PATCH /api/applications/:id/interviews/:interviewId */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { interviewId } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const valid = validateInterviewInput(parsed.body, { partial: true });
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    return NextResponse.json(
      await updateInterview(auth.userId, interviewId, valid.value)
    );
  } catch (err) {
    return errorResponse(err);
  }
}

/** DELETE /api/applications/:id/interviews/:interviewId */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { interviewId } = await params;
  try {
    return NextResponse.json(await deleteInterview(auth.userId, interviewId));
  } catch (err) {
    return errorResponse(err);
  }
}
