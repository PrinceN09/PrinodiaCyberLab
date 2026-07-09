import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const items = await prisma.portfolioItem.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const item = await prisma.portfolioItem.create({
    data: {
      title: b.title ?? "New portfolio item",
      description: b.description ?? null,
      category: b.category ?? "Project",
      url: b.url ?? null,
      repoUrl: b.repoUrl ?? null,
      tech: b.tech ?? [],
      featured: b.featured ?? false,
      userId: user.id,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
