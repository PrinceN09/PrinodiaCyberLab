import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const folders = await prisma.folder.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(folders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const folder = await prisma.folder.create({ data: { name } });
  return NextResponse.json(folder, { status: 201 });
}
