import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import {
  assertNoDuplicateManual,
  createManualApplication,
  listApplications,
} from "@/lib/applications/application-service";
import {
  parseApplicationListQuery,
  validateManualApplication,
} from "@/lib/applications/validation";

/** GET /api/applications — user-scoped list with filters + pagination. */
export async function GET(req: Request) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const query = parseApplicationListQuery(new URL(req.url).searchParams);
  try {
    const result = await listApplications(auth.userId, query);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST /api/applications — create a manual application. */
export async function POST(req: Request) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;

  const valid = validateManualApplication(parsed.body);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }
  try {
    await assertNoDuplicateManual(
      auth.userId,
      valid.value.company,
      valid.value.jobTitle
    );
    const app = await createManualApplication(auth.userId, valid.value);
    return NextResponse.json(app, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
