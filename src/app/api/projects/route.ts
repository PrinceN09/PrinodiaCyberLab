import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { tags: true },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  const project = await prisma.project.create({
    data: {
      name: body.name ?? "New project",
      description: body.description ?? null,
      category: body.category ?? "SOC_ANALYST",
      status: body.status ?? "PLANNED",
      progress: body.progress ?? 0,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      userId: user.id,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
