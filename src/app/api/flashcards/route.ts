import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const cards = await prisma.flashcard.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const card = await prisma.flashcard.create({
    data: {
      deck: b.deck ?? "General",
      front: b.front ?? "",
      back: b.back ?? "",
      userId: user.id,
    },
  });
  return NextResponse.json(card, { status: 201 });
}
