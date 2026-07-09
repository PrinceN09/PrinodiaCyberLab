import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

// Single LinkedIn profile per user — upsert.
export async function PUT(req: Request) {
  const b = await req.json();
  const user = await getCurrentUser();
  const data = {
    ...(b.headline !== undefined && { headline: b.headline }),
    ...(b.about !== undefined && { about: b.about }),
    ...(b.skills !== undefined && { skills: b.skills }),
    ...(b.certifications !== undefined && { certifications: b.certifications }),
    ...(b.featured !== undefined && { featured: b.featured }),
    ...(b.checklist !== undefined && { checklist: b.checklist }),
  };
  const profile = await prisma.linkedInProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      headline: b.headline ?? "",
      about: b.about ?? "",
      skills: b.skills ?? [],
      certifications: b.certifications ?? [],
      featured: b.featured ?? "",
      checklist: b.checklist ?? {},
    },
  });
  return NextResponse.json(profile);
}
