import type { Tone } from "@/components/ui/badge";
import type { JobPostingDto } from "@/lib/jobs/posting-dto";
import type { JobStats } from "@/lib/jobs/queries";

export { apiFetch } from "@/lib/knowledge-types";
export type { JobPostingDto, JobStats };

export type JobPage = {
  items: JobPostingDto[];
  total: number;
  page: number;
  pageSize: number;
};

export const WORKPLACE_META: Record<string, { label: string; tone: Tone }> = {
  REMOTE: { label: "Remote", tone: "green" },
  HYBRID: { label: "Hybrid", tone: "teal" },
  ON_SITE: { label: "On-site", tone: "blue" },
  UNKNOWN: { label: "Workplace n/a", tone: "gray" },
};

export const EMPLOYMENT_META: Record<string, { label: string; tone: Tone }> = {
  FULL_TIME: { label: "Full-time", tone: "blue" },
  PART_TIME: { label: "Part-time", tone: "gray" },
  CONTRACT: { label: "Contract", tone: "yellow" },
  TEMPORARY: { label: "Temporary", tone: "yellow" },
  INTERNSHIP: { label: "Internship", tone: "gray" },
  COMMISSION: { label: "Commission", tone: "gray" },
  UNKNOWN: { label: "Type n/a", tone: "gray" },
};

export const SENIORITY_LABELS: Record<string, string> = {
  ENTRY: "Entry level",
  ASSOCIATE: "Associate",
  INTERMEDIATE: "Intermediate",
  SENIOR: "Senior",
  LEAD: "Lead",
  UNKNOWN: "Level n/a",
};

export const SOURCE_LABELS: Record<string, string> = {
  GREENHOUSE: "Greenhouse",
  LEVER: "Lever",
  ASHBY: "Ashby",
  SMARTRECRUITERS: "SmartRecruiters",
  WORKDAY: "Workday",
  JOB_BANK_CA: "Job Bank",
  HIRING_CAFE: "HiringCafe",
  EMPLOYER_DIRECT: "Employer site",
  MANUAL: "Manual",
};

/** Eligibility chip tone by location priority (1 best … 7). */
export function priorityTone(priority: number): Tone {
  if (priority <= 2) return "green";
  if (priority <= 5) return "blue";
  return "teal";
}
