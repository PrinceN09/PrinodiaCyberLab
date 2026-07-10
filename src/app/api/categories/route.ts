import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  // Idempotent: creating an existing category returns it.
  const category = await prisma.category.upsert({
    where: { name },
    update: {},
    create: { name },
  });
  return NextResponse.json(category, { status: 201 });
}
