/**
 * Skills taxonomy for job matching (development seed data).
 *
 * NON-DESTRUCTIVE: upserts skills by name; never deletes. Safe to
 * re-run. Optionally records baseline UserSkill rows for the training
 * program's topics — always with provenance TRAINING_LAB or
 * FAMILIARITY, never PROFESSIONAL (spec: training is not presented
 * as professional experience).
 *
 *   npm run db:seed:skills
 */
import { PrismaClient, SkillProvenance } from "@prisma/client";

const prisma = new PrismaClient();

type SkillSeed = {
  name: string;
  category: string;
  aliases?: string[];
  /** Baseline claim for Prince's profile, if any. */
  baseline?: SkillProvenance;
};

const SKILLS: SkillSeed[] = [
  // ── SOC / Blue team ──
  { name: "Security Operations (SOC)", category: "SOC", aliases: ["soc", "security operations center", "security operations centre"], baseline: "TRAINING_LAB" },
  { name: "Alert Triage", category: "SOC", aliases: ["triage", "alert analysis"], baseline: "TRAINING_LAB" },
  { name: "Incident Response", category: "Incident Response", aliases: ["ir", "incident handling", "dfir"], baseline: "TRAINING_LAB" },
  { name: "Digital Forensics", category: "Incident Response", aliases: ["forensics", "dfir"], baseline: "FAMILIARITY" },
  { name: "Threat Hunting", category: "Threat Detection", aliases: ["threat hunt"], baseline: "TRAINING_LAB" },
  { name: "Threat Intelligence", category: "Threat Detection", aliases: ["cti", "threat intel"], baseline: "FAMILIARITY" },
  { name: "MITRE ATT&CK", category: "Threat Detection", aliases: ["attack framework", "mitre"], baseline: "TRAINING_LAB" },
  { name: "Detection Engineering", category: "Threat Detection", aliases: ["detection rules", "sigma"], baseline: "FAMILIARITY" },
  // ── SIEM / Tooling ──
  { name: "SIEM", category: "SIEM", aliases: ["security information and event management"], baseline: "TRAINING_LAB" },
  { name: "Splunk", category: "SIEM", aliases: ["splunk es", "spl"], baseline: "TRAINING_LAB" },
  { name: "Microsoft Sentinel", category: "SIEM", aliases: ["azure sentinel", "sentinel", "kql"], baseline: "FAMILIARITY" },
  { name: "Elastic / ELK", category: "SIEM", aliases: ["elasticsearch", "elastic stack", "kibana", "elk"], baseline: "FAMILIARITY" },
  { name: "EDR", category: "Tooling", aliases: ["endpoint detection", "crowdstrike", "defender for endpoint", "sentinelone"], baseline: "FAMILIARITY" },
  { name: "Wireshark", category: "Tooling", aliases: ["packet analysis", "pcap"], baseline: "TRAINING_LAB" },
  { name: "Nmap", category: "Tooling", aliases: ["network scanning"], baseline: "TRAINING_LAB" },
  { name: "Burp Suite", category: "Tooling", aliases: ["burp"], baseline: "FAMILIARITY" },
  { name: "Metasploit", category: "Tooling", baseline: "FAMILIARITY" },
  { name: "Nessus", category: "Vulnerability Management", aliases: ["tenable"], baseline: "FAMILIARITY" },
  { name: "Qualys", category: "Vulnerability Management" },
  // ── Vulnerability / Pentest ──
  { name: "Vulnerability Management", category: "Vulnerability Management", aliases: ["vulnerability assessment", "vuln management"], baseline: "TRAINING_LAB" },
  { name: "Penetration Testing", category: "Penetration Testing", aliases: ["pentesting", "ethical hacking", "offensive security"], baseline: "TRAINING_LAB" },
  { name: "Web Application Security", category: "Penetration Testing", aliases: ["owasp", "owasp top 10", "appsec"], baseline: "FAMILIARITY" },
  // ── GRC ──
  { name: "GRC", category: "GRC", aliases: ["governance risk and compliance", "governance, risk and compliance"], baseline: "TRAINING_LAB" },
  { name: "ISO 27001", category: "GRC", aliases: ["iso27001", "iso/iec 27001"], baseline: "TRAINING_LAB" },
  { name: "NIST Frameworks", category: "GRC", aliases: ["nist csf", "nist 800-53", "nist 800-61", "nist"], baseline: "TRAINING_LAB" },
  { name: "SOC 2", category: "GRC", aliases: ["soc2", "soc-2"], baseline: "TRAINING_LAB" },
  { name: "Risk Assessment", category: "GRC", aliases: ["risk analysis", "risk register"], baseline: "TRAINING_LAB" },
  { name: "Security Auditing", category: "GRC", aliases: ["audit", "compliance audit"], baseline: "FAMILIARITY" },
  { name: "PCI DSS", category: "GRC", aliases: ["pci-dss", "pci"] },
  // ── Cloud / DevSecOps ──
  { name: "Cloud Security", category: "Cloud", aliases: ["cloud security posture"], baseline: "TRAINING_LAB" },
  { name: "AWS", category: "Cloud", aliases: ["amazon web services"], baseline: "FAMILIARITY" },
  { name: "Microsoft Azure", category: "Cloud", aliases: ["azure"], baseline: "FAMILIARITY" },
  { name: "Google Cloud", category: "Cloud", aliases: ["gcp"] },
  { name: "IAM", category: "Cloud", aliases: ["identity and access management", "identity & access management", "entra id", "active directory", "okta"], baseline: "TRAINING_LAB" },
  { name: "DevSecOps", category: "DevSecOps", aliases: ["secure sdlc", "shift left"], baseline: "FAMILIARITY" },
  { name: "CI/CD Security", category: "DevSecOps", aliases: ["pipeline security", "github actions"], baseline: "FAMILIARITY" },
  { name: "Docker", category: "DevSecOps", aliases: ["containers", "container security"], baseline: "FAMILIARITY" },
  { name: "Kubernetes", category: "DevSecOps", aliases: ["k8s"] },
  { name: "Terraform", category: "DevSecOps", aliases: ["infrastructure as code", "iac"] },
  // ── Foundations ──
  { name: "Networking", category: "Foundations", aliases: ["tcp/ip", "dns", "network protocols", "network security"], baseline: "TRAINING_LAB" },
  { name: "Linux", category: "Foundations", aliases: ["linux administration", "ubuntu", "kali"], baseline: "TRAINING_LAB" },
  { name: "Windows Security", category: "Foundations", aliases: ["windows event logs", "active directory security"], baseline: "TRAINING_LAB" },
  { name: "Python", category: "Foundations", aliases: ["python scripting", "python3"], baseline: "PERSONAL_PROJECT" },
  { name: "Bash", category: "Foundations", aliases: ["shell scripting", "bash scripting"], baseline: "PERSONAL_PROJECT" },
  { name: "PowerShell", category: "Foundations", aliases: ["powershell scripting"], baseline: "TRAINING_LAB" },
  { name: "SQL", category: "Foundations", aliases: ["sql queries"], baseline: "PERSONAL_PROJECT" },
  { name: "Phishing Analysis", category: "SOC", aliases: ["email security", "email analysis"], baseline: "TRAINING_LAB" },
  { name: "Log Analysis", category: "SOC", aliases: ["log parsing", "log management"], baseline: "PERSONAL_PROJECT" },
  { name: "Malware Analysis", category: "Incident Response", aliases: ["malware triage"], baseline: "FAMILIARITY" },
];

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found — run the main seed or sign in first.");
    process.exit(1);
  }

  const withBaseline = process.argv.includes("--skills-only") === false;
  let created = 0;
  let claimed = 0;

  for (const s of SKILLS) {
    const skill = await prisma.skill.upsert({
      where: { name: s.name },
      update: { aliases: s.aliases ?? [], category: s.category },
      create: {
        name: s.name,
        aliases: s.aliases ?? [],
        category: s.category,
      },
    });
    created += 1;

    if (withBaseline && s.baseline) {
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: user.id, skillId: skill.id } },
        update: {}, // never downgrade/overwrite an existing claim
        create: {
          userId: user.id,
          skillId: skill.id,
          provenance: s.baseline,
          evidence: "Six-month cybersecurity training program (baseline seed)",
        },
      });
      claimed += 1;
    }
  }

  console.log(
    `Done — ${created} skills upserted${withBaseline ? `, ${claimed} baseline user-skill claims ensured` : ""}.`
  );
  console.log("Tip: pass --skills-only to skip baseline user-skill claims.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
