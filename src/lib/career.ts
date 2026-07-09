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

export function jobStatusMeta(value: string) {
  return JOB_STATUSES.find((s) => s.value === value) ?? JOB_STATUSES[0];
}
