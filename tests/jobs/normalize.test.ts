import { describe, expect, it } from "vitest";
import {
  classifyEmployment,
  classifySeniority,
  classifyWorkplace,
  htmlToText,
  normalizeCompany,
  normalizeJob,
  normalizeTitle,
  parseLocation,
  titleFamily,
} from "@/lib/jobs/normalize";

describe("company normalization", () => {
  it("strips legal suffixes and punctuation", () => {
    expect(normalizeCompany("Arctic Wolf Networks Inc.")).toBe(
      "arctic wolf networks"
    );
    expect(normalizeCompany("ACME Corp Ltd.")).toBe("acme");
    expect(normalizeCompany("Fortinet")).toBe("fortinet");
  });

  it("treats variants of the same employer identically", () => {
    expect(normalizeCompany("Telus Communications Inc")).toBe(
      normalizeCompany("TELUS Communications")
    );
  });
});

describe("title normalization", () => {
  it("removes noise and unifies spelling", () => {
    expect(normalizeTitle("Cyber Security Analyst (Remote)")).toBe(
      "cybersecurity analyst"
    );
  });

  it("unifies tier notation", () => {
    expect(normalizeTitle("Tier 1 SOC Analyst")).toBe(
      normalizeTitle("Tier I SOC Analyst")
    );
  });

  it("maps titles to target families", () => {
    expect(titleFamily("Tier 2 SOC Analyst")).toBe("SOC Analyst");
    expect(titleFamily("Junior Penetration Tester")).toBe("Penetration Testing");
    expect(titleFamily("Identity and Access Management Analyst")).toBe("IAM");
    expect(titleFamily("DevSecOps Engineer")).toBe("DevSecOps");
    expect(titleFamily("Marketing Coordinator")).toBeNull();
  });
});

describe("location parsing", () => {
  it("parses Vancouver, BC", () => {
    expect(parseLocation("Vancouver, BC, Canada")).toEqual({
      city: "Vancouver",
      province: "BC",
      country: "Canada",
    });
  });

  it("infers Canada from a province", () => {
    expect(parseLocation("Burnaby, British Columbia")).toEqual({
      city: "Burnaby",
      province: "BC",
      country: "Canada",
    });
  });

  it("handles remote-only strings", () => {
    const parsed = parseLocation("Remote - Canada");
    expect(parsed.city).toBeNull();
    expect(parsed.country).toBe("Canada");
  });

  it("detects US locations", () => {
    expect(parseLocation("Austin, TX").country).toBe("United States");
  });
});

describe("remote classification", () => {
  it("classifies remote from text", () => {
    expect(classifyWorkplace(null, "SOC Analyst", "Remote - Canada")).toBe(
      "REMOTE"
    );
  });

  it("classifies hybrid over remote when both appear", () => {
    expect(
      classifyWorkplace(null, "Analyst", "Hybrid (2 days remote per week)")
    ).toBe("HYBRID");
  });

  it("prefers the structured hint when present", () => {
    expect(classifyWorkplace("ON_SITE", "Analyst", "remote culture")).toBe(
      "ON_SITE"
    );
  });
});

describe("full-time classification", () => {
  it("classifies full-time and permanent", () => {
    expect(classifyEmployment(null, "Full-time permanent role")).toBe(
      "FULL_TIME"
    );
  });

  it("classifies internships and co-ops", () => {
    expect(classifyEmployment(null, "Cybersecurity Co-op")).toBe("INTERNSHIP");
  });

  it("classifies commission-only", () => {
    expect(classifyEmployment(null, "Commission-only sales")).toBe("COMMISSION");
  });
});

describe("seniority classification", () => {
  it("classifies entry/associate/senior from title", () => {
    expect(classifySeniority(null, "Junior SOC Analyst")).toBe("ENTRY");
    expect(classifySeniority(null, "Associate Security Analyst")).toBe(
      "ASSOCIATE"
    );
    expect(classifySeniority(null, "Senior Threat Hunter")).toBe("SENIOR");
    expect(classifySeniority(null, "Intermediate SIEM Analyst")).toBe(
      "INTERMEDIATE"
    );
  });
});

describe("html to text", () => {
  it("converts lists and paragraphs", () => {
    const text = htmlToText(
      "<p>Duties:</p><ul><li>Triage &amp; escalate</li><li>Hunt threats</li></ul>"
    );
    expect(text).toContain("• Triage & escalate");
    expect(text).toContain("• Hunt threats");
    expect(text).not.toContain("<");
  });
});

describe("normalizeJob end-to-end", () => {
  it("produces a fully classified NormalizedJob", () => {
    const job = normalizeJob({
      sourceType: "GREENHOUSE",
      sourceUrl: "https://boards.greenhouse.io/acme/jobs/123",
      applicationUrl: "https://boards.greenhouse.io/acme/jobs/123",
      title: "Tier 1 SOC Analyst (Remote)",
      company: "Acme Security Inc.",
      descriptionHtml:
        "<p>Full-time permanent. Remote within Canada. Monitor Splunk SIEM.</p>",
      location: "Remote - Canada",
      postedAt: new Date("2026-07-09T00:00:00Z"),
    });

    expect(job.normalizedCompany).toBe("acme security");
    expect(job.workplaceType).toBe("REMOTE");
    expect(job.employmentType).toBe("FULL_TIME");
    expect(job.seniority).toBe("ENTRY");
    expect(job.country).toBe("Canada");
    expect(job.acceptsCanadianApplicants).toBe(true);
    expect(job.requiresUSResidency).toBe(false);
    expect(job.description).toContain("Splunk");
  });

  it("flags US-only remote jobs during normalization", () => {
    const job = normalizeJob({
      sourceType: "LEVER",
      sourceUrl: "https://jobs.lever.co/acme/456",
      title: "Security Analyst",
      company: "Acme",
      descriptionText:
        "Remote (US only). Applicants must reside in the United States.",
      location: "Remote",
    });
    expect(job.requiresUSResidency).toBe(true);
    expect(job.acceptsCanadianApplicants).toBe(false);
  });
});
