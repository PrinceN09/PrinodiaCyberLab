import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getCurrentUser } from "@/lib/current-user";
import {
  deleteApplication,
  updateApplication,
} from "@/lib/applications/application-service";
import { transitionApplication } from "@/lib/applications/transition-service";
import { validateApplicationUpdate } from "@/lib/applications/validation";
import { errorResponse } from "@/lib/applications/route-helpers";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Legacy tracker update — authenticated, user-scoped, and routed
 * through the services so status changes honor the transition graph
 * and write timeline events (previously an unscoped raw update).
 */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const user = await getCurrentUser();
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Status changes go through the transition service.
    if (typeof body.status === "string") {
      await transitionApplication(user.id, id, {
        to: body.status,
        reopen: body.reopen === true,
      });
    }
    const { status: _status, reopen: _reopen, ...rest } = body;
    void _status;
    void _reopen;
    if (Object.keys(rest).length > 0) {
      const valid = validateApplicationUpdate(rest);
      if (!valid.ok) {
        return NextResponse.json({ error: valid.error }, { status: 400 });
      }
      const updated = await updateApplication(user.id, id, valid.value);
      return NextResponse.json(updated);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const user = await getCurrentUser();
  const { id } = await params;
  try {
    return NextResponse.json(await deleteApplication(user.id, id));
  } catch (err) {
    return errorResponse(err);
  }
}
