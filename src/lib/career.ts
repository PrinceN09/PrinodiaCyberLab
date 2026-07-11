import type { Tone } from "@/components/ui/badge";

export const JOB_STATUSES = [
  { value: "SAVED", label: "Saved", tone: "gray" as Tone },
  { value: "APPLIED", label: "Applied", tone: "blue" as Tone },
  { value: "INTERVIEW", label: "Interview", tone: "purple" as Tone },
  { value: "OFFER", label: "Offer", tone: "green" as Tone },
  { value: "REJECTED", label: "Rejected", tone: "red" as Tone },
] as const;

export const RESUME_ROLES = [
  "Cybersecurity Analyst",
  "SOC Analyst",
  "Threat Hunter",
  "Incident Response",
  "Vulnerability Management",
  "GRC",
  "Cloud Security",
  "DevSecOps",
] as const;

/**
 * Full application-lifecycle metadata (all 13 statuses). The
 * five-column tracker board still uses JOB_STATUSES; the full
 * board upgrade lands with the application-tracker phase.
 */
export const JOB_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  DISCOVERED: { label: "Discovered", tone: "gray" },
  SAVED: { label: "Saved", tone: "gray" },
  PREPARING: { label: "Preparing", tone: "cyan" },
  READY_TO_APPLY: { label: "Ready to apply", tone: "teal" },
  APPLIED: { label: "Applied", tone: "blue" },
  RECRUITER_CONTACT: { label: "Recruiter contact", tone: "cyan" },
  ASSESSMENT: { label: "Assessment", tone: "yellow" },
  INTERVIEW: { label: "Interview", tone: "purple" },
  FINAL_INTERVIEW: { label: "Final interview", tone: "purple" },
  OFFER: { label: "Offer", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  WITHDRAWN: { label: "Withdrawn", tone: "gray" },
  ARCHIVED: { label: "Archived", tone: "gray" },
};

export function jobStatusMeta(value: string): { label: string; tone: Tone } {
  return (
    JOB_STATUS_META[value] ??
    JOB_STATUSES.find((s) => s.value === value) ??
    JOB_STATUSES[0]
  );
}
