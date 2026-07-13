import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getCurrentUser } from "@/lib/current-user";
import {
  assertNoDuplicateManual,
  createManualApplication,
} from "@/lib/applications/application-service";
import { validateManualApplication } from "@/lib/applications/validation";
import { errorResponse } from "@/lib/applications/route-helpers";

/**
 * Legacy tracker endpoints — now authenticated and strictly
 * user-scoped (previously returned every user's applications).
 */
export async function GET() {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const user = await getCurrentUser();
  const jobs = await prisma.jobApplication.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const user = await getCurrentUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const valid = validateManualApplication(body);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    await assertNoDuplicateManual(user.id, valid.value.company, valid.value.jobTitle);
    const job = await createManualApplication(user.id, valid.value);
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
