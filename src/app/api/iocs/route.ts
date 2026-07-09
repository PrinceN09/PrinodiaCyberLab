import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const iocs = await prisma.ioc.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(iocs);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const ioc = await prisma.ioc.create({
    data: {
      type: b.type ?? "IP",
      value: b.value ?? "",
      threatType: b.threatType ?? null,
      source: b.source ?? null,
      confidence: b.confidence ?? "Medium",
      notes: b.notes ?? null,
      userId: user.id,
    },
  });
  return NextResponse.json(ioc, { status: 201 });
}
