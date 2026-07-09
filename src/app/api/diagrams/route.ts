import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const diagrams = await prisma.diagram.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(diagrams);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  const diagram = await prisma.diagram.create({
    data: {
      title: body.title ?? "New diagram",
      description: body.description ?? null,
      mermaidCode: body.mermaidCode ?? "",
      userId: user.id,
    },
  });
  return NextResponse.json(diagram, { status: 201 });
}
