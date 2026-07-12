/**
 * JobMatchingService — the pure, transparent scoring engine.
 * No I/O, no Prisma: (posting, extracted skills, career profile) →
 * a 0–100 score with a full component breakdown and explanations.
 *
 * Honesty rules (spec):
 * - Geographic/legal ineligibility is a HARD GATE: score 0, always.
 * - Provenance is never blurred: a skill learned in a training lab is
 *   reported as such — completing a lab is not professional experience.
 */
import type { SkillProvenance } from "@prisma/client";
import type { ExtractedSkill } from "./skill-extraction";

// ── Inputs ──────────────────────────────────────

export type MatchPosting = {
  title: string;
  description: string;
  seniority: string; // SeniorityLevel
  locationPriority: number;
  acceptsCanadianApplicants: boolean;
  requiresUSResidency: boolean;
  requiresCitizenship: boolean;
  requiresSecurityClearance: boolean;
  isActive: boolean;
};

export type ProfileSkill = {
  skillId: string;
  name: string;
  category: string;
  provenance: SkillProvenance;
};

export type ProfileProject = {
  id: string;
  title: string;
  kind: "project" | "lab";
  completed: boolean;
  skillIds: string[];
};

export type ProfileRepo = {
  id: string;
  fullName: string;
  url: string;
  topics: string[];
  detectedSkills: string[];
  languages: string[];
};

export type ProfileCertification = {
  name: string;
  status: string; // CertificationStatus
};

export type CareerProfile = {
  skills: ProfileSkill[];
  certifications: ProfileCertification[];
  projects: ProfileProject[];
  repos: ProfileRepo[];
};

// ── Output ──────────────────────────────────────

export type MatchComponent = {
  id: string;
  label: string;
  score: number;
  max: number;
  detail: string;
};

export type MatchedSkill = {
  name: string;
  required: boolean;
  provenance: SkillProvenance;
};

export type MatchResult = {
  score: number;
  eligible: boolean;
  components: MatchComponent[];
  matchedSkills: MatchedSkill[];
  missingSkills: { name: string; required: boolean }[];
  missingRequiredCount: number;
  reasons: string[];
  gaps: string[];
  relatedRepos: { id: string; fullName: string; url: string; reason: string }[];
  relatedProjects: { id: string; title: string; kind: "project" | "lab"; reason: string }[];
  computedAt: string;
};

// ── Weights (sum = 100, spec-mandated) ──────────

export const MATCH_WEIGHTS = {
  skills: 30,
  title: 15,
  experience: 15,
  location: 15,
  projects: 10,
  tools: 10,
  certifications: 5,
} as const;

/** Provenance ranked strongest → weakest for display/marking. */
export const PROVENANCE_ORDER: SkillProvenance[] = [
  "PROFESSIONAL",
  "PERSONAL_PROJECT",
  "DEMONSTRATED",
  "TRAINING_LAB",
  "CERTIFICATION",
  "FAMILIARITY",
];

export const PROVENANCE_LABELS: Record<SkillProvenance, string> = {
  PROFESSIONAL: "Professional experience",
  PERSONAL_PROJECT: "Personal project",
  DEMONSTRATED: "Demonstrated practical skill",
  TRAINING_LAB: "Training lab",
  CERTIFICATION: "Certification",
  FAMILIARITY: "Familiarity",
};

const TOOL_CATEGORIES = new Set(["SIEM", "Tooling", "Cloud", "DevSecOps"]);
const TOOL_FOUNDATION_NAMES = new Set([
  "Python",
  "Bash",
  "PowerShell",
  "SQL",
  "Docker",
  "Kubernetes",
  "Terraform",
]);

const TARGET_TITLE_RE =
  /\bsoc\b|security operations|cyber\s*security|cybersecurity|information security|incident respon|threat (hunt|detect|intel)|\bsiem\b|vulnerabilit|\bgrc\b|governance|cyber risk|security compliance|cloud security|\biam\b|identity (and|&) access|penetration test|pentest|application security|appsec|devsecops|security engineer|security analyst/i;
const SECURITY_HINT_RE = /secur|cyber|threat|soc\b|infosec/i;

const SENIORITY_SCORES: Record<string, { score: number; note: string }> = {
  ENTRY: { score: 15, note: "Entry-level role — aligned with your profile" },
  ASSOCIATE: { score: 15, note: "Associate-level role — aligned with your profile" },
  INTERMEDIATE: { score: 11, note: "Intermediate role — reachable next step" },
  UNKNOWN: { score: 8, note: "Seniority unclear from the posting" },
  SENIOR: { score: 4, note: "Senior role — a stretch target; shown because the rest of the match is informative" },
  LEAD: { score: 2, note: "Lead/management role — beyond current target level" },
};

/**
 * Location credit by the new priority ranking. Monotonic so score
 * order never contradicts priority order:
 *   1 Remote Canada — full credit
 *   2 Remote Canada+US — strong credit
 *   3 Vancouver/Metro — highly relevant, not exclusive
 *   4 BC · 5 Canada-wide relocation — valid credit
 *   6 NA-with-Canada · 7 low-confidence — reduced credit
 */
const LOCATION_SCORES: Record<number, number> = {
  1: 15, 2: 14, 3: 13, 4: 12, 5: 11, 6: 9, 7: 7,
};

const CERT_MENTION_RE =
  /certification|certified|security\+|comptia|cysa|cissp|ccsp|\bceh\b|\bgsec\b|\bgcih\b|\boscp\b|\bsscp\b|iso 27001 lead/i;

function isToolSkill(s: { category: string; name: string }): boolean {
  return TOOL_CATEGORIES.has(s.category) || TOOL_FOUNDATION_NAMES.has(s.name);
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ── Engine ──────────────────────────────────────

export function computeMatch(
  posting: MatchPosting,
  postingSkills: ExtractedSkill[],
  profile: CareerProfile,
  now: Date = new Date()
): MatchResult {
  const reasons: string[] = [];
  const gaps: string[] = [];

  // ── HARD GATE: geographic / legal eligibility ──
  const eligible =
    posting.isActive !== false &&
    posting.locationPriority < 99 &&
    posting.acceptsCanadianApplicants &&
    !posting.requiresUSResidency &&
    !posting.requiresCitizenship &&
    !posting.requiresSecurityClearance;

  if (!eligible) {
    const why = posting.requiresUSResidency
      ? "requires US residency"
      : posting.requiresCitizenship
        ? "requires US citizenship"
        : posting.requiresSecurityClearance
          ? "requires a security clearance"
          : "has no Canadian location eligibility";
    return {
      score: 0,
      eligible: false,
      components: [],
      matchedSkills: [],
      missingSkills: [],
      missingRequiredCount: 0,
      reasons: [
        `Not scored: this posting ${why}. Match scores are never generated for geographically or legally ineligible roles.`,
      ],
      gaps: [],
      relatedRepos: [],
      relatedProjects: [],
      computedAt: now.toISOString(),
    };
  }

  const bySkillId = new Map(profile.skills.map((s) => [s.skillId, s]));
  const components: MatchComponent[] = [];

  // ── Skills (30) ──
  const matchedSkills: MatchedSkill[] = [];
  const missingSkills: { name: string; required: boolean }[] = [];
  let skillsScore: number;

  if (postingSkills.length === 0) {
    skillsScore = MATCH_WEIGHTS.skills / 2;
    reasons.push(
      "No recognizable skills could be extracted from this posting — skills were scored neutrally, check the description yourself."
    );
    components.push({
      id: "skills",
      label: "Skills match",
      score: skillsScore,
      max: MATCH_WEIGHTS.skills,
      detail: "No extractable skill requirements (neutral credit)",
    });
  } else {
    let earned = 0;
    let possible = 0;
    for (const ps of postingSkills) {
      const weight = ps.required ? 1 : 0.5;
      possible += weight;
      const mine = bySkillId.get(ps.skillId);
      if (mine) {
        earned += weight;
        matchedSkills.push({
          name: ps.name,
          required: ps.required,
          provenance: mine.provenance,
        });
      } else {
        missingSkills.push({ name: ps.name, required: ps.required });
      }
    }
    const coverage = possible > 0 ? earned / possible : 0;
    skillsScore = MATCH_WEIGHTS.skills * coverage;
    reasons.push(
      `You cover ${pct(coverage)} of the ${postingSkills.length} skills mentioned (${matchedSkills.length} matched, ${missingSkills.length} missing).`
    );
    components.push({
      id: "skills",
      label: "Skills match",
      score: skillsScore,
      max: MATCH_WEIGHTS.skills,
      detail: `${matchedSkills.length}/${postingSkills.length} skills covered (required weighted double)`,
    });
  }

  // ── Title (15) ──
  let titleScore = 0;
  if (TARGET_TITLE_RE.test(posting.title)) {
    titleScore = MATCH_WEIGHTS.title;
    reasons.push("Job title aligns with your target cybersecurity roles.");
  } else if (SECURITY_HINT_RE.test(posting.title)) {
    titleScore = 8;
    reasons.push("Security-adjacent title — not one of your primary targets.");
  } else {
    reasons.push("Title is outside your target role families.");
  }
  components.push({
    id: "title",
    label: "Job-title alignment",
    score: titleScore,
    max: MATCH_WEIGHTS.title,
    detail: posting.title,
  });

  // ── Experience (15) ──
  const seniority =
    SENIORITY_SCORES[posting.seniority] ?? SENIORITY_SCORES.UNKNOWN;
  components.push({
    id: "experience",
    label: "Experience alignment",
    score: seniority.score,
    max: MATCH_WEIGHTS.experience,
    detail: seniority.note,
  });
  reasons.push(seniority.note + ".");
  if (posting.seniority === "SENIOR" || posting.seniority === "LEAD") {
    gaps.push(
      "This is a senior posting — treat its requirements as a roadmap rather than a blocker."
    );
  }

  // ── Location (15) ──
  const locationScore = LOCATION_SCORES[posting.locationPriority] ?? 7;
  components.push({
    id: "location",
    label: "Location & work authorization",
    score: locationScore,
    max: MATCH_WEIGHTS.location,
    detail: `Location priority ${posting.locationPriority} of 7`,
  });

  // ── Projects & portfolio (10) ──
  const completedProjects = profile.projects.filter((p) => p.completed);
  const evidenceSkillIds = new Set(
    completedProjects.flatMap((p) => p.skillIds)
  );
  const repoTermSets = profile.repos.map((r) => ({
    repo: r,
    terms: new Set(
      [...r.detectedSkills, ...r.topics, ...r.languages].map((t) =>
        t.toLowerCase()
      )
    ),
  }));

  const relatedProjects: MatchResult["relatedProjects"] = [];
  const relatedRepos: MatchResult["relatedRepos"] = [];
  let projectsScore: number;

  if (postingSkills.length === 0) {
    projectsScore = MATCH_WEIGHTS.projects / 2;
  } else {
    let covered = 0;
    for (const ps of postingSkills) {
      let hit = false;
      if (evidenceSkillIds.has(ps.skillId)) hit = true;
      for (const { repo, terms } of repoTermSets) {
        if (terms.has(ps.name.toLowerCase())) {
          hit = true;
          if (!relatedRepos.some((r) => r.id === repo.id)) {
            relatedRepos.push({
              id: repo.id,
              fullName: repo.fullName,
              url: repo.url,
              reason: `Demonstrates ${ps.name}`,
            });
          }
        }
      }
      if (hit) covered += 1;
    }
    projectsScore =
      MATCH_WEIGHTS.projects * Math.min(1, covered / Math.max(3, Math.min(postingSkills.length, 6)));

    for (const p of completedProjects) {
      const overlap = postingSkills.filter((ps) => p.skillIds.includes(ps.skillId));
      if (overlap.length > 0) {
        relatedProjects.push({
          id: p.id,
          title: p.title,
          kind: p.kind,
          reason: `Covers ${overlap.map((o) => o.name).slice(0, 3).join(", ")}`,
        });
      }
    }
  }
  components.push({
    id: "projects",
    label: "Cybersecurity project alignment",
    score: projectsScore,
    max: MATCH_WEIGHTS.projects,
    detail:
      relatedProjects.length + relatedRepos.length > 0
        ? `${relatedProjects.length} project/lab(s) and ${relatedRepos.length} repo(s) demonstrate requested skills`
        : "No completed projects or opted-in repos demonstrate the requested skills yet",
  });

  // ── Tools & technologies (10) ──
  const toolSkills = postingSkills.filter(isToolSkill);
  let toolsScore: number;
  if (toolSkills.length === 0) {
    toolsScore = MATCH_WEIGHTS.tools / 2;
    components.push({
      id: "tools",
      label: "Tools & technologies",
      score: toolsScore,
      max: MATCH_WEIGHTS.tools,
      detail: "No specific tools requested (neutral credit)",
    });
  } else {
    const coveredTools = toolSkills.filter((t) => bySkillId.has(t.skillId));
    toolsScore = MATCH_WEIGHTS.tools * (coveredTools.length / toolSkills.length);
    components.push({
      id: "tools",
      label: "Tools & technologies",
      score: toolsScore,
      max: MATCH_WEIGHTS.tools,
      detail: `${coveredTools.length}/${toolSkills.length} requested tools covered (${toolSkills.map((t) => t.name).join(", ")})`,
    });
  }

  // ── Education & certifications (5) ──
  const text = `${posting.title} ${posting.description}`;
  const mentionsCerts = CERT_MENTION_RE.test(text);
  let certScore: number;
  let certDetail: string;
  if (!mentionsCerts) {
    certScore = 3;
    certDetail = "No certifications mentioned (neutral credit)";
  } else {
    const earned = profile.certifications.filter(
      (c) => c.status === "EARNED" && termInText(c.name, text)
    );
    const inProgress = profile.certifications.filter(
      (c) => c.status === "IN_PROGRESS" && termInText(c.name, text)
    );
    if (earned.length > 0) {
      certScore = MATCH_WEIGHTS.certifications;
      certDetail = `Earned: ${earned.map((c) => c.name).join(", ")}`;
    } else if (inProgress.length > 0) {
      certScore = 3;
      certDetail = `In progress: ${inProgress.map((c) => c.name).join(", ")}`;
    } else {
      certScore = 1;
      certDetail = "Certifications are mentioned but none of yours match";
      gaps.push(
        "This posting references certifications — consider prioritizing one that recurs across your target roles."
      );
    }
  }
  components.push({
    id: "certifications",
    label: "Education & certifications",
    score: certScore,
    max: MATCH_WEIGHTS.certifications,
    detail: certDetail,
  });

  // ── Skill-gap recommendations ──
  for (const missing of missingSkills.filter((m) => m.required).slice(0, 5)) {
    gaps.push(
      `Missing required skill: ${missing.name} — add a lab, project, or note covering it.`
    );
  }
  for (const m of matchedSkills.filter((s) => s.provenance === "FAMILIARITY").slice(0, 3)) {
    gaps.push(
      `${m.name} is currently only "familiarity" — complete a lab or project to turn it into demonstrated evidence.`
    );
  }

  const total = Math.min(
    100,
    Math.round(
      skillsScore +
        titleScore +
        seniority.score +
        locationScore +
        projectsScore +
        toolsScore +
        certScore
    )
  );

  // Sort matched skills strongest-provenance first for display.
  matchedSkills.sort(
    (a, b) =>
      PROVENANCE_ORDER.indexOf(a.provenance) -
      PROVENANCE_ORDER.indexOf(b.provenance)
  );

  return {
    score: total,
    eligible: true,
    components,
    matchedSkills,
    missingSkills,
    missingRequiredCount: missingSkills.filter((m) => m.required).length,
    reasons,
    gaps,
    relatedRepos,
    relatedProjects,
    computedAt: now.toISOString(),
  };
}

function termInText(term: string, text: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w+])${escaped}`, "i").test(text);
}
