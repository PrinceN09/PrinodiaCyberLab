import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { parseSnippetPatch, SNIPPET_INCLUDE } from "@/lib/code/save-snippet";

export async function GET() {
  const user = await getCurrentUser();
  const snippets = await prisma.codeSnippet.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: SNIPPET_INCLUDE,
  });
  return NextResponse.json(snippets);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch = parseSnippetPatch(body);
  if (!patch) {
    return NextResponse.json(
      { error: "Invalid snippet payload" },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  const { tags, ...fields } = patch;

  const snippet = await prisma.codeSnippet.create({
    data: {
      ...fields,
      title: fields.title?.trim() || "New snippet",
      language: fields.language ?? "python",
      code: fields.code ?? "",
      userId: user.id,
      ...(tags &&
        tags.length > 0 && {
          tags: {
            connectOrCreate: tags.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
        }),
    },
    include: SNIPPET_INCLUDE,
  });
  return NextResponse.json(snippet, { status: 201 });
}
