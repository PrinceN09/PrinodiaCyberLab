export const APP_VERSION = "0.2.0";

export const CYBER_TIPS = [
  "Enable phishing-resistant MFA everywhere — it stops the majority of account takeovers.",
  "Map every alert to a MITRE ATT&CK technique; it standardizes triage across the team.",
  "Least privilege isn't a setting, it's a habit. Review access quarterly.",
  "Patch internet-facing systems first — that's where attackers look before anywhere else.",
  "A password manager plus unique passwords beats any 'clever' memorable scheme.",
  "Log everything you can, but alert only on what you'll actually investigate.",
  "Back up offline. Ransomware can't encrypt what it can't reach.",
  "Before you scan it, make sure you're authorized to scan it — in writing.",
  "Assume breach. Design detection as if prevention already failed.",
  "The fastest way to shrink your attack surface is to decommission what you don't use.",
];

export function tipOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((+date - +start) / 864e5);
  return CYBER_TIPS[day % CYBER_TIPS.length];
}

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
  { value: "RISK_ASSESSMENT", label: "Risk Assessment" },
  { value: "SECURITY_ASSESSMENT", label: "Security Assessment" },
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
