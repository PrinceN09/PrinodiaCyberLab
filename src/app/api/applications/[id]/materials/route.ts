import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import {
  selectCoverLetter,
  selectResume,
} from "@/lib/applications/application-service";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/applications/:id/materials — attach/switch/clear the
 * selected resume and/or cover letter. The service verifies each
 * material belongs to the authenticated user (no cross-user attach).
 * Body: { resumeId?: string | null, coverLetterId?: string | null }
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body as {
    resumeId?: unknown;
    coverLetterId?: unknown;
  };

  function asIdOrNull(v: unknown, field: string): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v === "string" && v.length > 0 && v.length <= 64) return v;
    throw new Error(field);
  }

  let resumeId: string | null | undefined;
  let coverLetterId: string | null | undefined;
  try {
    resumeId = asIdOrNull(body.resumeId, "resumeId");
    coverLetterId = asIdOrNull(body.coverLetterId, "coverLetterId");
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid ${(e as Error).message}` },
      { status: 400 }
    );
  }

  try {
    let result;
    if (resumeId !== undefined) {
      result = await selectResume(auth.userId, id, resumeId);
    }
    if (coverLetterId !== undefined) {
      result = await selectCoverLetter(auth.userId, id, coverLetterId);
    }
    if (result === undefined) {
      return NextResponse.json(
        { error: "Provide resumeId and/or coverLetterId" },
        { status: 400 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
