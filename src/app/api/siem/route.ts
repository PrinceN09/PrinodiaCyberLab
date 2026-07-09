import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const rules = await prisma.siemRule.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const rule = await prisma.siemRule.create({
    data: {
      title: b.title ?? "New rule",
      platform: b.platform ?? "Splunk",
      description: b.description ?? null,
      query: b.query ?? "",
      mitre: b.mitre ?? null,
      severity: b.severity ?? "MEDIUM",
      userId: user.id,
    },
  });
  return NextResponse.json(rule, { status: 201 });
}
