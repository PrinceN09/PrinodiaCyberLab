import { NextResponse } from "next/server";
import {
  authenticate,
  errorResponse,
  readJson,
} from "@/lib/applications/route-helpers";
import { getOffer, upsertOffer } from "@/lib/applications/offer-service";
import { validateOfferInput } from "@/lib/applications/validation";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/applications/:id/offer */
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    return NextResponse.json(await getOffer(auth.userId, id));
  } catch (err) {
    return errorResponse(err);
  }
}

/** PUT /api/applications/:id/offer — create or update the offer record. */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const valid = validateOfferInput(parsed.body);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    return NextResponse.json(await upsertOffer(auth.userId, id, valid.value));
  } catch (err) {
    return errorResponse(err);
  }
}
