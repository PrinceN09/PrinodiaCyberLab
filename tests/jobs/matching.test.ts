import { describe, expect, it } from "vitest";
import { extractSkills, type TaxonomySkill } from "@/lib/jobs/skill-extraction";
import {
  computeMatch,
  MATCH_WEIGHTS,
  type CareerProfile,
  type MatchPosting,
} from "@/lib/jobs/matching";

// ── Fixtures ────────────────────────────────────

const TAXONOMY: TaxonomySkill[] = [
  { id: "siem", name: "SIEM", category: "SIEM", aliases: [] },
  { id: "splunk", name: "Splunk", category: "SIEM", aliases: ["splunk es", "spl"] },
  { id: "ir", name: "Incident Response", category: "Incident Response", aliases: ["dfir", "incident handling"] },
  { id: "nmap", name: "Nmap", category: "Tooling", aliases: ["network scanning"] },
  { id: "python", name: "Python", category: "Foundations", aliases: ["python scripting"] },
  { id: "iso", name: "ISO 27001", category: "GRC", aliases: ["iso/iec 27001"] },
  { id: "hunt", name: "Threat Hunting", category: "Threat Detection", aliases: [] },
];

const eligiblePosting = (over: Partial<MatchPosting> = {}): MatchPosting => ({
  title: "SOC Analyst",
  description:
    "Monitor SIEM alerts using Splunk. Incident Response duties. Python scripting is preferred but not required.",
  seniority: "ENTRY",
  locationPriority: 1,
  acceptsCanadianApplicants: true,
  requiresUSResidency: false,
  requiresCitizenship: false,
  requiresSecurityClearance: false,
  isActive: true,
  ...over,
});

const fullProfile: CareerProfile = {
  skills: [
    { skillId: "siem", name: "SIEM", category: "SIEM", provenance: "TRAINING_LAB" },
    { skillId: "splunk", name: "Splunk", category: "SIEM", provenance: "TRAINING_LAB" },
    { skillId: "ir", name: "Incident Response", category: "Incident Response", provenance: "TRAINING_LAB" },
    { skillId: "python", name: "Python", category: "Foundations", provenance: "PERSONAL_PROJECT" },
    { skillId: "nmap", name: "Nmap", category: "Tooling", provenance: "FAMILIARITY" },
  ],
  certifications: [{ name: "Security+", status: "IN_PROGRESS" }],
  projects: [
    {
      id: "lab1",
      title: "Splunk detection lab",
      kind: "lab",
      completed: true,
      skillIds: ["splunk", "siem"],
    },
    {
      id: "proj1",
      title: "Incomplete project",
      kind: "project",
      completed: false,
      skillIds: ["ir"],
    },
  ],
  repos: [
    {
      id: "repo1",
      fullName: "PrinceN09/log-parser",
      url: "https://github.com/PrinceN09/log-parser",
      topics: ["python", "log-analysis"],
      detectedSkills: ["Python"],
      languages: ["Python"],
    },
  ],
};

const emptyProfile: CareerProfile = {
  skills: [],
  certifications: [],
  projects: [],
  repos: [],
};

const skillsFor = (p: MatchPosting) =>
  extractSkills(TAXONOMY, p.title, p.description);

// ── Skill extraction ────────────────────────────

describe("skill extraction", () => {
  it("finds skills by name and alias with word boundaries", () => {
    const found = skillsFor(eligiblePosting());
    const names = found.map((s) => s.name).sort();
    expect(names).toEqual(["Incident Response", "Python", "SIEM", "Splunk"]);
  });

  it("classifies preferred-context skills as preferred", () => {
    const found = skillsFor(eligiblePosting());
    expect(found.find((s) => s.name === "Python")?.required).toBe(false);
    expect(found.find((s) => s.name === "Splunk")?.required).toBe(true);
  });

  it("handles special characters in names (ISO 27001)", () => {
    const found = extractSkills(
      TAXONOMY,
      "GRC Analyst",
      "Support our ISO/IEC 27001 program."
    );
    expect(found.map((s) => s.name)).toContain("ISO 27001");
  });

  it("does not match inside larger words", () => {
    const found = extractSkills(TAXONOMY, "Analyst", "We use splunking tools");
    expect(found.map((s) => s.name)).not.toContain("Splunk");
  });
});

// ── Hard eligibility gate ───────────────────────

describe("hard eligibility gate", () => {
  it("scores 0 for US-residency jobs even with a perfect skills profile", () => {
    const posting = eligiblePosting({ requiresUSResidency: false, acceptsCanadianApplicants: false });
    const result = computeMatch(posting, skillsFor(posting), fullProfile);
    expect(result.score).toBe(0);
    expect(result.eligible).toBe(false);
    expect(result.components).toHaveLength(0);
    expect(result.reasons[0]).toMatch(/never generated/i);
  });

  it("scores 0 for citizenship, clearance, and priority-99 postings", () => {
    for (const over of [
      { requiresCitizenship: true },
      { requiresSecurityClearance: true },
      { locationPriority: 99 },
    ] as Partial<MatchPosting>[]) {
      const posting = eligiblePosting(over);
      const result = computeMatch(posting, skillsFor(posting), fullProfile);
      expect(result.score).toBe(0);
      expect(result.eligible).toBe(false);
    }
  });
});

// ── Scoring behavior ────────────────────────────

describe("scoring", () => {
  it("gives a strong (but honest) score for a well-matched entry SOC role", () => {
    const posting = eligiblePosting();
    const result = computeMatch(posting, skillsFor(posting), fullProfile);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.matchedSkills.map((s) => s.name)).toContain("Splunk");
    expect(result.missingSkills).toHaveLength(0);
  });

  it("never exceeds component caps or 100 total", () => {
    const posting = eligiblePosting();
    const result = computeMatch(posting, skillsFor(posting), fullProfile);
    for (const c of result.components) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(c.max);
    }
    const maxSum = result.components.reduce((s, c) => s + c.max, 0);
    expect(maxSum).toBe(100);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("scores an empty profile low but not zero for an eligible job", () => {
    const posting = eligiblePosting();
    const result = computeMatch(posting, skillsFor(posting), emptyProfile);
    expect(result.eligible).toBe(true);
    expect(result.score).toBeGreaterThan(0); // title/location/seniority still count
    expect(result.score).toBeLessThan(60);
    expect(result.missingSkills.length).toBeGreaterThan(0);
  });

  it("is fair when no skills can be extracted (neutral, not zero)", () => {
    const posting = eligiblePosting({
      description: "An exciting opportunity. Great team. Apply now!",
    });
    const result = computeMatch(posting, [], fullProfile);
    const skills = result.components.find((c) => c.id === "skills")!;
    expect(skills.score).toBe(MATCH_WEIGHTS.skills / 2);
    expect(result.reasons.join(" ")).toMatch(/neutral/i);
  });

  it("penalizes senior roles without hiding them", () => {
    const posting = eligiblePosting({ seniority: "SENIOR", title: "Senior SOC Analyst" });
    const entry = computeMatch(eligiblePosting(), skillsFor(eligiblePosting()), fullProfile);
    const senior = computeMatch(posting, skillsFor(posting), fullProfile);
    expect(senior.score).toBeLessThan(entry.score);
    expect(senior.score).toBeGreaterThan(0);
    expect(senior.gaps.join(" ")).toMatch(/senior posting/i);
  });

  it("scores lower-priority locations lower, all else equal", () => {
    const van = computeMatch(eligiblePosting(), skillsFor(eligiblePosting()), fullProfile);
    const usRemote = eligiblePosting({ locationPriority: 7 });
    const us = computeMatch(usRemote, skillsFor(usRemote), fullProfile);
    expect(us.score).toBeLessThan(van.score);
  });
});

// ── Transparency & provenance ───────────────────

describe("transparency and provenance separation", () => {
  it("annotates every matched skill with its evidence type", () => {
    const posting = eligiblePosting();
    const result = computeMatch(posting, skillsFor(posting), fullProfile);
    const splunk = result.matchedSkills.find((s) => s.name === "Splunk")!;
    const python = result.matchedSkills.find((s) => s.name === "Python")!;
    expect(splunk.provenance).toBe("TRAINING_LAB"); // never "professional"
    expect(python.provenance).toBe("PERSONAL_PROJECT");
  });

  it("counts only COMPLETED labs/projects as evidence and links them", () => {
    const posting = eligiblePosting();
    const result = computeMatch(posting, skillsFor(posting), fullProfile);
    const ids = result.relatedProjects.map((p) => p.id);
    expect(ids).toContain("lab1");
    expect(ids).not.toContain("proj1"); // incomplete → no evidence
  });

  it("surfaces relevant GitHub repos with reasons", () => {
    const posting = eligiblePosting();
    const result = computeMatch(posting, skillsFor(posting), fullProfile);
    expect(result.relatedRepos[0]?.fullName).toBe("PrinceN09/log-parser");
    expect(result.relatedRepos[0]?.reason).toMatch(/Python/);
  });

  it("recommends gap actions for missing required skills and weak evidence", () => {
    const posting = eligiblePosting({
      description: "Threat Hunting required. SIEM required. Nmap required.",
    });
    const result = computeMatch(posting, skillsFor(posting), fullProfile);
    const gapText = result.gaps.join(" | ");
    expect(gapText).toMatch(/Missing required skill: Threat Hunting/);
    expect(gapText).toMatch(/Nmap.*familiarity/i); // strengthen weak evidence
  });

  it("counts missing required skills for the gaps sort", () => {
    const posting = eligiblePosting({
      description: "Threat Hunting required. ISO 27001 required. Python preferred.",
    });
    const result = computeMatch(posting, skillsFor(posting), emptyProfile);
    expect(result.missingRequiredCount).toBe(2);
  });

  it("gives certification credit only for matching earned certs", () => {
    const posting = eligiblePosting({
      description: "CompTIA Security+ certification required. SIEM monitoring.",
    });
    const inProgress = computeMatch(posting, skillsFor(posting), fullProfile);
    const certComponent = inProgress.components.find((c) => c.id === "certifications")!;
    expect(certComponent.score).toBe(3); // Security+ in progress

    const earned = computeMatch(posting, skillsFor(posting), {
      ...fullProfile,
      certifications: [{ name: "Security+", status: "EARNED" }],
    });
    expect(
      earned.components.find((c) => c.id === "certifications")!.score
    ).toBe(MATCH_WEIGHTS.certifications);
  });
});
