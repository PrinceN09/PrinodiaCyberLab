import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const hunts = await prisma.threatHunt.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(hunts);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const hunt = await prisma.threatHunt.create({
    data: {
      title: b.title ?? "New hunt",
      hypothesis: b.hypothesis ?? "",
      dataSource: b.dataSource ?? null,
      mitre: b.mitre ?? null,
      status: b.status ?? "PROPOSED",
      findings: b.findings ?? null,
      userId: user.id,
    },
  });
  return NextResponse.json(hunt, { status: 201 });
}
