import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const snippets = await prisma.codeSnippet.findMany({
    orderBy: { updatedAt: "desc" },
    include: { tags: true },
  });
  return NextResponse.json(snippets);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  const snippet = await prisma.codeSnippet.create({
    data: {
      title: body.title ?? "New snippet",
      description: body.description ?? null,
      language: body.language ?? "python",
      code: body.code ?? "",
      userId: user.id,
    },
  });
  return NextResponse.json(snippet, { status: 201 });
}
