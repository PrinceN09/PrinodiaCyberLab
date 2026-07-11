/**
 * Matching persistence: loads the career profile + skill taxonomy,
 * extracts each posting's skills (persisted as JobSkillRequirement),
 * runs the pure engine, and stores score/breakdown on the posting.
 *
 * Recomputation triggers:
 * - after every ingestion run (scripts/ingest-jobs.ts)
 * - POST /api/matching/recompute (profile/labs/projects changed)
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { extractSkills, type TaxonomySkill } from "./skill-extraction";
import { computeMatch, type CareerProfile, type MatchResult } from "./matching";

export async function loadTaxonomy(): Promise<TaxonomySkill[]> {
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true, category: true, aliases: true },
  });
  return skills;
}

export async function loadCareerProfile(userId: string): Promise<CareerProfile> {
  const [userSkills, certifications, labs, projects, repos] = await Promise.all([
    prisma.userSkill.findMany({
      where: { userId },
      select: {
        provenance: true,
        skill: { select: { id: true, name: true, category: true } },
      },
    }),
    prisma.certification.findMany({
      where: { userId },
      select: { name: true, status: true },
    }),
    prisma.lab.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        skills: { select: { skillId: true } },
      },
    }),
    prisma.cybersecurityProject.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        status: true,
        skills: { select: { skillId: true } },
      },
    }),
    prisma.portfolioRepo.findMany({
      where: { userId, includeInMatching: true },
      select: {
        id: true,
        fullName: true,
        url: true,
        topics: true,
        detectedSkills: true,
        languages: true,
      },
    }),
  ]);

  return {
    skills: userSkills.map((us) => ({
      skillId: us.skill.id,
      name: us.skill.name,
      category: us.skill.category,
      provenance: us.provenance,
    })),
    certifications,
    projects: [
      ...labs.map((l) => ({
        id: l.id,
        title: l.title,
        kind: "lab" as const,
        completed: l.status === "COMPLETED",
        skillIds: l.skills.map((s) => s.skillId),
      })),
      ...projects.map((p) => ({
        id: p.id,
        title: p.title,
        kind: "project" as const,
        completed: p.status === "COMPLETED",
        skillIds: p.skills.map((s) => s.skillId),
      })),
    ],
    repos: repos.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      url: r.url,
      topics: r.topics,
      detectedSkills: r.detectedSkills,
      languages: languageNames(r.languages),
    })),
  };
}

function languageNames(languages: Prisma.JsonValue | null): string[] {
  if (!languages || typeof languages !== "object" || Array.isArray(languages)) {
    return Array.isArray(languages) ? languages.map(String) : [];
  }
  return Object.keys(languages);
}

export type RecomputeSummary = {
  postings: number;
  scored: number;
  ineligible: number;
  durationMs: number;
};

/**
 * Recomputes matches. With `postingIds`, only those postings;
 * otherwise every active posting.
 */
export async function recomputeMatches(
  userId: string,
  postingIds?: string[]
): Promise<RecomputeSummary> {
  const started = Date.now();
  const [taxonomy, profile] = await Promise.all([
    loadTaxonomy(),
    loadCareerProfile(userId),
  ]);

  const postings = await prisma.jobPosting.findMany({
    where: postingIds ? { id: { in: postingIds } } : { isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      seniority: true,
      locationPriority: true,
      acceptsCanadianApplicants: true,
      requiresUSResidency: true,
      requiresCitizenship: true,
      requiresSecurityClearance: true,
      isActive: true,
    },
  });

  let scored = 0;
  let ineligible = 0;

  for (const posting of postings) {
    const extracted = extractSkills(taxonomy, posting.title, posting.description);
    const result = computeMatch(posting, extracted, profile);
    if (result.eligible) scored += 1;
    else ineligible += 1;

    await prisma.$transaction([
      prisma.jobSkillRequirement.deleteMany({
        where: { jobPostingId: posting.id },
      }),
      prisma.jobSkillRequirement.createMany({
        data: extracted.map((s) => ({
          jobPostingId: posting.id,
          skillId: s.skillId,
          required: s.required,
          rawText: s.matchedTerm,
        })),
        skipDuplicates: true,
      }),
      prisma.jobPosting.update({
        where: { id: posting.id },
        data: matchFields(result),
      }),
    ]);
  }

  return {
    postings: postings.length,
    scored,
    ineligible,
    durationMs: Date.now() - started,
  };
}

function matchFields(result: MatchResult) {
  return {
    matchScore: result.score,
    matchBreakdown: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
    matchedSkills: result.matchedSkills.map((s) => s.name),
    missingSkills: result.missingSkills.map((s) => s.name),
    missingSkillCount: result.missingRequiredCount,
  };
}
