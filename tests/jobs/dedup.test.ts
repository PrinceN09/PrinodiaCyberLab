import { describe, expect, it } from "vitest";
import {
  areDuplicates,
  descriptionSimilarity,
  findDuplicate,
  type DedupCandidate,
} from "@/lib/jobs/dedup";

const DESCRIPTION =
  "Monitor SIEM alerts, triage security incidents, escalate to Tier 2, " +
  "tune Splunk detections, document investigations, collaborate with the " +
  "incident response team on containment and remediation activities.";

const base: DedupCandidate = {
  normalizedCompany: "acme security",
  normalizedTitle: "soc analyst",
  city: "Vancouver",
  workplaceType: "ON_SITE",
  applicationUrl: "https://acme.com/careers/soc-analyst-123",
  sourceJobId: "123",
  description: DESCRIPTION,
};

describe("duplicate detection", () => {
  it("matches identical application URLs across sources", () => {
    const fromHiringCafe = {
      ...base,
      sourceJobId: null,
      normalizedTitle: "soc analyst tier 1", // slightly different listing title
      applicationUrl: "https://acme.com/careers/soc-analyst-123?utm_source=hc",
    };
    expect(areDuplicates(base, fromHiringCafe)).toBe(true); // tracking params ignored
  });

  it("matches same employer job id at the same company", () => {
    const other = { ...base, applicationUrl: null, normalizedTitle: "security analyst" };
    expect(areDuplicates(base, other)).toBe(true);
  });

  it("matches same company + title + city", () => {
    const other = {
      ...base,
      applicationUrl: null,
      sourceJobId: null,
    };
    expect(areDuplicates(base, other)).toBe(true);
  });

  it("matches similar titles with near-identical descriptions", () => {
    const other: DedupCandidate = {
      ...base,
      applicationUrl: null,
      sourceJobId: null,
      normalizedTitle: "soc analyst 1",
      description: DESCRIPTION + " Competitive benefits.",
    };
    expect(areDuplicates(base, other)).toBe(true);
  });

  it("does not match different companies", () => {
    // Same title/description but a different employer and different URL.
    expect(
      areDuplicates(base, {
        ...base,
        normalizedCompany: "fortinet",
        applicationUrl: "https://fortinet.com/careers/soc-analyst-9",
        sourceJobId: "9",
      })
    ).toBe(false);
  });

  it("matches identical URLs even when company names differ across boards", () => {
    // "Acme" vs "Acme Security" naming variance — the URL is authoritative.
    expect(
      areDuplicates(base, { ...base, normalizedCompany: "acme" })
    ).toBe(true);
  });

  it("does not match same company with a genuinely different role", () => {
    const other: DedupCandidate = {
      ...base,
      applicationUrl: null,
      sourceJobId: null,
      normalizedTitle: "grc analyst",
      description:
        "Own ISO 27001 audits, maintain the risk register, run vendor " +
        "assessments, prepare SOC 2 evidence, and report compliance posture " +
        "to leadership on a quarterly basis.",
    };
    expect(areDuplicates(base, other)).toBe(false);
  });

  it("treats two remote listings at the same company/title as one", () => {
    const a = { ...base, city: null, workplaceType: "REMOTE", applicationUrl: null, sourceJobId: null };
    const b = { ...a, description: DESCRIPTION + " Apply today." };
    expect(areDuplicates(a, b)).toBe(true);
  });

  it("findDuplicate returns the first match or null", () => {
    const candidate = { ...base, sourceJobId: null, applicationUrl: null };
    expect(findDuplicate(candidate, [base])).toBe(base);
    expect(
      findDuplicate(candidate, [{ ...base, normalizedCompany: "other co" }])
    ).toBeNull();
  });
});

describe("description similarity", () => {
  it("is ~1 for identical text and low for unrelated text", () => {
    expect(descriptionSimilarity(DESCRIPTION, DESCRIPTION)).toBe(1);
    expect(
      descriptionSimilarity(DESCRIPTION, "Completely unrelated marketing job.")
    ).toBeLessThan(0.1);
  });
});
