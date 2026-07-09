import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const reports = await prisma.report.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  const report = await prisma.report.create({
    data: {
      title: body.title ?? "New report",
      type: body.type ?? "INCIDENT_RESPONSE",
      severity: body.severity ?? "MEDIUM",
      status: body.status ?? "DRAFT",
      reference: body.reference ?? null,
      content: body.content ?? "",
      userId: user.id,
    },
  });
  return NextResponse.json(report, { status: 201 });
}
