export const PROJECT_CATEGORIES = [
  { value: "SOC_ANALYST", label: "SOC Analyst" },
  { value: "SIEM", label: "SIEM" },
  { value: "THREAT_DETECTION", label: "Threat Detection" },
  { value: "INCIDENT_RESPONSE", label: "Incident Response" },
  { value: "VULNERABILITY_MANAGEMENT", label: "Vulnerability Management" },
  { value: "GRC", label: "GRC" },
  { value: "PENETRATION_TESTING", label: "Penetration Testing" },
  { value: "LINUX_NETWORKING", label: "Linux & Networking" },
  { value: "CLOUD_SECURITY", label: "Cloud Security" },
] as const;

export const PROJECT_STATUS = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export const REPORT_TYPES = [
  { value: "INCIDENT_RESPONSE", label: "Incident Response" },
  { value: "VULNERABILITY", label: "Vulnerability" },
  { value: "GRC", label: "GRC" },
  { value: "THREAT_INTEL", label: "Threat Intel" },
] as const;

export const REPORT_SEVERITY = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "INFORMATIONAL", label: "Informational" },
] as const;

export const REPORT_STATUS = [
  { value: "DRAFT", label: "Draft" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "FINAL", label: "Final" },
] as const;

export function labelFor(
  list: readonly { value: string; label: string }[],
  value: string
) {
  return list.find((i) => i.value === value)?.label ?? value;
}
