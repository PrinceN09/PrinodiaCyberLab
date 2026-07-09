import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Prinodia CyberLab…");

  // Clean slate (order matters for relations)
  await prisma.studyLog.deleteMany();
  await prisma.learningProgress.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.report.deleteMany();
  await prisma.project.deleteMany();
  await prisma.diagram.deleteMany();
  await prisma.codeSnippet.deleteMany();
  await prisma.note.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  // ── User ──────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      name: "Prince Ntunka",
      email: "princentunka09@gmail.com",
      role: "SOC Analyst (in training)",
    },
  });

  // ── Tags ──────────────────────────────────────
  const tagData = [
    { name: "MITRE ATT&CK", color: "purple" },
    { name: "SIEM", color: "blue" },
    { name: "Splunk", color: "cyan" },
    { name: "Detection", color: "teal" },
    { name: "Linux", color: "yellow" },
    { name: "Networking", color: "green" },
    { name: "Nmap", color: "orange" },
    { name: "Incident Response", color: "red" },
    { name: "GRC", color: "magenta" },
    { name: "Cloud", color: "cyan" },
    { name: "Python", color: "blue" },
    { name: "Wireshark", color: "teal" },
  ];
  const tags: Record<string, string> = {};
  for (const t of tagData) {
    const tag = await prisma.tag.create({ data: t });
    tags[t.name] = tag.id;
  }
  const tag = (name: string) => ({ id: tags[name] });

  // ── Folders ───────────────────────────────────
  const socFolder = await prisma.folder.create({ data: { name: "SOC Fundamentals" } });
  const irFolder = await prisma.folder.create({ data: { name: "Incident Response" } });
  const netFolder = await prisma.folder.create({ data: { name: "Networking & Linux" } });
  await prisma.folder.create({ data: { name: "Cloud Security" } });

  // ── Notes ─────────────────────────────────────
  await prisma.note.createMany({
    data: [
      {
        title: "MITRE ATT&CK — Initial Access Techniques",
        pinned: true,
        folderId: socFolder.id,
        userId: user.id,
        content: `# Initial Access (TA0001)

Adversary techniques used to gain an initial foothold within a network.

## Key Techniques
- **T1566 Phishing** — spearphishing attachment / link / via service
- **T1190 Exploit Public-Facing Application** — web servers, VPN appliances
- **T1078 Valid Accounts** — default, domain, local, cloud accounts
- **T1133 External Remote Services** — RDP, VPN, Citrix exposed to internet

## Detection Focus
Watch for anomalous authentication, first-seen process execution, and
outbound connections immediately following inbound access.

> Map every alert back to a technique ID — it standardizes triage language.`,
      },
      {
        title: "Windows Event IDs Every Analyst Should Know",
        folderId: socFolder.id,
        userId: user.id,
        content: `# Critical Windows Security Event IDs

| Event ID | Meaning |
|----------|---------|
| 4624 | Successful logon |
| 4625 | Failed logon |
| 4672 | Special privileges assigned (admin logon) |
| 4688 | New process created |
| 4720 | User account created |
| 7045 | New service installed |
| 1102 | Audit log cleared |

**Logon types worth memorizing:** 2 (interactive), 3 (network),
10 (RemoteInteractive/RDP). A burst of Type 3 failures followed by a
success is a classic password-spray signature.`,
      },
      {
        title: "Incident Response Lifecycle (NIST 800-61)",
        pinned: true,
        folderId: irFolder.id,
        userId: user.id,
        content: `# NIST SP 800-61r2 — IR Lifecycle

1. **Preparation** — tooling, playbooks, comms plans, baselines
2. **Detection & Analysis** — validate, scope, prioritize by impact
3. **Containment, Eradication & Recovery** — short/long-term containment,
   remove artefacts, restore from known-good
4. **Post-Incident Activity** — lessons learned within 2 weeks

## Containment decision factors
Potential damage, evidence preservation, service availability, time and
resources needed, effectiveness (partial vs full).`,
      },
      {
        title: "Nmap Cheatsheet",
        folderId: netFolder.id,
        userId: user.id,
        content: `# Nmap Quick Reference

\`\`\`
nmap -sS -sV -O 10.0.0.0/24        # SYN scan + version + OS
nmap -p- --min-rate 5000 target    # all 65535 ports, fast
nmap -sC -sV -oA scan target       # default scripts, all output formats
nmap --script vuln target          # NSE vuln category
\`\`\`

Always get written authorization before scanning anything you don't own.`,
      },
      {
        title: "Linux Privilege Escalation Checklist",
        folderId: netFolder.id,
        userId: user.id,
        content: `# Linux PrivEsc — First Moves

- \`id\`, \`sudo -l\`, \`uname -a\`
- SUID binaries: \`find / -perm -4000 -type f 2>/dev/null\`
- Writable cron jobs in \`/etc/crontab\`
- Kernel exploits (match version to CVE carefully)
- Check \`/etc/passwd\` write perms, exposed \`.ssh\` keys

Cross-reference findings against GTFOBins before attempting anything.`,
      },
    ],
  });

  // ── Code Snippets ─────────────────────────────
  await prisma.codeSnippet.create({
    data: {
      title: "Splunk — Detect Password Spray",
      description: "Flags accounts with many failed logons from a single source in a short window.",
      language: "sql",
      userId: user.id,
      tags: { connect: [tag("SIEM"), tag("Splunk"), tag("Detection")] },
      code: `index=windows EventCode=4625
| bin _time span=5m
| stats dc(Account_Name) as unique_users count as attempts by src_ip, _time
| where unique_users > 10 AND attempts > 25
| sort - attempts`,
    },
  });
  await prisma.codeSnippet.create({
    data: {
      title: "Python — Bulk Hash Lookup (VirusTotal)",
      description: "Query VT v3 API for a list of file hashes and print detection ratios.",
      language: "python",
      userId: user.id,
      tags: { connect: [tag("Python"), tag("Detection")] },
      code: `import requests, os, time

API_KEY = os.environ["VT_API_KEY"]
HEADERS = {"x-apikey": API_KEY}

def lookup(sha256: str) -> None:
    r = requests.get(
        f"https://www.virustotal.com/api/v3/files/{sha256}",
        headers=HEADERS,
        timeout=20,
    )
    if r.status_code == 200:
        stats = r.json()["data"]["attributes"]["last_analysis_stats"]
        print(f"{sha256[:12]}…  malicious={stats['malicious']}  harmless={stats['harmless']}")
    else:
        print(f"{sha256[:12]}…  error {r.status_code}")

if __name__ == "__main__":
    for h in open("hashes.txt"):
        lookup(h.strip())
        time.sleep(15)  # public API rate limit`,
    },
  });
  await prisma.codeSnippet.create({
    data: {
      title: "Bash — Triage a Suspicious Linux Host",
      description: "Fast live-response collection for an on-call analyst.",
      language: "shell",
      userId: user.id,
      tags: { connect: [tag("Linux"), tag("Incident Response")] },
      code: `#!/usr/bin/env bash
set -euo pipefail
OUT="triage_$(hostname)_$(date +%s)"
mkdir -p "$OUT"

ps auxww                 > "$OUT/processes.txt"
netstat -tulpn 2>/dev/null > "$OUT/listening.txt"
ss -tanp                 > "$OUT/connections.txt"
last -50                 > "$OUT/logins.txt"
crontab -l 2>/dev/null   > "$OUT/crontab.txt"
find /tmp /dev/shm -type f -mtime -2 2>/dev/null > "$OUT/recent_tmp.txt"

echo "Collected to $OUT/"`,
    },
  });
  await prisma.codeSnippet.create({
    data: {
      title: "Sigma Rule — Suspicious PowerShell EncodedCommand",
      description: "Portable detection rule for base64-encoded PowerShell execution.",
      language: "yaml",
      userId: user.id,
      tags: { connect: [tag("Detection"), tag("MITRE ATT&CK")] },
      code: `title: Suspicious PowerShell EncodedCommand
status: experimental
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith: '\\powershell.exe'
    CommandLine|contains:
      - '-enc'
      - '-EncodedCommand'
  condition: selection
level: high
tags:
  - attack.execution
  - attack.t1059.001`,
    },
  });

  // ── Diagrams ──────────────────────────────────
  await prisma.diagram.create({
    data: {
      title: "SOC Alert Triage Flow",
      description: "Tier-1 decision path from alert ingestion to escalation.",
      userId: user.id,
      mermaidCode: `flowchart TD
  A[Alert received in SIEM] --> B{True positive?}
  B -- No --> C[Tune rule / close as FP]
  B -- Yes --> D{Severity}
  D -- Low/Med --> E[Document + monitor]
  D -- High/Critical --> F[Create incident ticket]
  F --> G[Contain affected host]
  G --> H[Escalate to Tier 2 / IR]
  H --> I[Post-incident review]`,
    },
  });
  await prisma.diagram.create({
    data: {
      title: "Cyber Kill Chain",
      description: "Lockheed Martin intrusion phases with defensive actions.",
      userId: user.id,
      mermaidCode: `flowchart LR
  R[Reconnaissance] --> W[Weaponization]
  W --> D[Delivery]
  D --> E[Exploitation]
  E --> I[Installation]
  I --> C[Command & Control]
  C --> A[Actions on Objectives]`,
    },
  });
  await prisma.diagram.create({
    data: {
      title: "Incident Response Escalation Matrix",
      description: "Who gets notified as severity climbs.",
      userId: user.id,
      mermaidCode: `sequenceDiagram
  participant SIEM
  participant T1 as Tier-1 Analyst
  participant T2 as Tier-2 / IR
  participant MGR as SOC Manager
  SIEM->>T1: Alert triggered
  T1->>T1: Validate & triage
  T1->>T2: Escalate confirmed incident
  T2->>MGR: Notify on Critical severity
  MGR->>T2: Approve containment actions`,
    },
  });

  // ── Projects ──────────────────────────────────
  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 864e5);
  await prisma.project.create({
    data: {
      name: "Build a Home SOC Lab",
      description: "Deploy Wazuh + Elastic + Sysmon on a virtualized network and generate/analyze test alerts.",
      category: "SOC_ANALYST",
      status: "ACTIVE",
      progress: 65,
      dueDate: inDays(14),
      userId: user.id,
      tags: { connect: [tag("SIEM"), tag("Detection")] },
    },
  });
  await prisma.project.create({
    data: {
      name: "Splunk Detection Engineering Sprint",
      description: "Author 10 correlation searches mapped to MITRE ATT&CK and tune false positives.",
      category: "SIEM",
      status: "ACTIVE",
      progress: 40,
      dueDate: inDays(21),
      userId: user.id,
      tags: { connect: [tag("Splunk"), tag("MITRE ATT&CK")] },
    },
  });
  await prisma.project.create({
    data: {
      name: "Ransomware Tabletop Exercise",
      description: "Design and run an IR tabletop for a simulated ransomware outbreak; produce an after-action report.",
      category: "INCIDENT_RESPONSE",
      status: "PLANNED",
      progress: 10,
      dueDate: inDays(30),
      userId: user.id,
      tags: { connect: [tag("Incident Response")] },
    },
  });
  await prisma.project.create({
    data: {
      name: "Internal Vulnerability Scan Program",
      description: "Stand up Nessus/OpenVAS, define a scan cadence, and build a remediation SLA tracker.",
      category: "VULNERABILITY_MANAGEMENT",
      status: "ACTIVE",
      progress: 55,
      dueDate: inDays(10),
      userId: user.id,
    },
  });
  await prisma.project.create({
    data: {
      name: "ISO 27001 Control Mapping",
      description: "Map current controls to Annex A and identify gaps ahead of a mock audit.",
      category: "GRC",
      status: "ON_HOLD",
      progress: 25,
      dueDate: inDays(45),
      userId: user.id,
      tags: { connect: [tag("GRC")] },
    },
  });
  await prisma.project.create({
    data: {
      name: "TryHackMe — Offensive Pentesting Path",
      description: "Complete the offensive pentesting learning path and document each box.",
      category: "PENETRATION_TESTING",
      status: "ACTIVE",
      progress: 72,
      userId: user.id,
      tags: { connect: [tag("Nmap")] },
    },
  });
  await prisma.project.create({
    data: {
      name: "AWS Security Hardening Lab",
      description: "Apply CIS AWS Foundations Benchmark to a sandbox account and verify with Prowler.",
      category: "CLOUD_SECURITY",
      status: "PLANNED",
      progress: 5,
      dueDate: inDays(28),
      userId: user.id,
      tags: { connect: [tag("Cloud")] },
    },
  });
  await prisma.project.create({
    data: {
      name: "Packet Analysis Fundamentals",
      description: "Work through malware-traffic-analysis.net exercises with Wireshark.",
      category: "LINUX_NETWORKING",
      status: "COMPLETED",
      progress: 100,
      userId: user.id,
      tags: { connect: [tag("Wireshark"), tag("Networking")] },
    },
  });

  // ── Reports ───────────────────────────────────
  await prisma.report.create({
    data: {
      title: "IR-2026-014: Phishing-Led Credential Compromise",
      type: "INCIDENT_RESPONSE",
      severity: "HIGH",
      status: "FINAL",
      reference: "IR-2026-014",
      userId: user.id,
      content: `# Incident Response Report — IR-2026-014

## 1. Executive Summary
On 2026-06-28, a finance-team user submitted credentials to a spoofed
Microsoft 365 login page delivered via a phishing email. The attacker
authenticated from a foreign IP and created an inbox rule to hide replies.
The account was disabled within 42 minutes of detection. No financial loss
was confirmed.

## 2. Timeline (UTC)
| Time | Event |
|------|-------|
| 13:02 | Phishing email delivered to 6 recipients |
| 13:19 | User clicks link, submits credentials |
| 13:24 | Successful sign-in from 45.148.x.x (impossible travel alert) |
| 13:26 | Malicious inbox rule created |
| 13:58 | SOC disables account, revokes sessions |

## 3. Impact
One mailbox compromised. Inbox rule forwarded/deleted select messages.
No evidence of lateral movement or data exfiltration beyond the mailbox.

## 4. Root Cause
Successful social-engineering; MFA was not enforced on the affected account.

## 5. Remediation
- Force password reset + revoke tokens (done)
- Enforce phishing-resistant MFA org-wide
- Block sender domain and sinkhole the phishing URL
- Deliver targeted awareness training to finance team

## 6. Lessons Learned
Conditional Access MFA gap allowed the sign-in to succeed. Prioritize
closing MFA exceptions this quarter.`,
    },
  });
  await prisma.report.create({
    data: {
      title: "VULN-2026-002: Unauthenticated RCE on Internal Jenkins",
      type: "VULNERABILITY",
      severity: "CRITICAL",
      status: "IN_REVIEW",
      reference: "VULN-2026-002",
      userId: user.id,
      content: `# Vulnerability Report — VULN-2026-002

## Summary
An internal Jenkins server (ci.internal.local) is running a version
vulnerable to unauthenticated remote code execution.

## Details
- **CVSS 3.1:** 9.8 (Critical) — AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
- **Affected:** Jenkins 2.441 with Script Console exposed
- **CWE:** CWE-94 Improper Control of Generation of Code

## Proof of Concept
Access to \`/script\` was reachable without authentication on the internal
network, permitting arbitrary Groovy execution.

## Business Impact
Full compromise of the CI/CD host, enabling supply-chain tampering of build
artefacts and pivot into the build network.

## Remediation
1. Restrict \`/script\` and enable authentication immediately
2. Upgrade Jenkins to the latest LTS
3. Place CI behind network segmentation + SSO
4. Rotate any credentials stored on the host

## Recommended SLA
Remediate within 72 hours given criticality and internet-adjacent exposure.`,
    },
  });
  await prisma.report.create({
    data: {
      title: "GRC-2026-Q2: ISO 27001 Annex A Gap Assessment",
      type: "GRC",
      severity: "MEDIUM",
      status: "DRAFT",
      reference: "GRC-2026-Q2",
      userId: user.id,
      content: `# GRC Gap Assessment — ISO 27001 Annex A

## Scope
Assessment of current control maturity against ISO/IEC 27001:2022 Annex A
ahead of a Q3 certification readiness review.

## Findings Summary
| Control Area | Maturity | Gap |
|--------------|----------|-----|
| A.5 Organizational | Partial | Policy set incomplete |
| A.6 People | Adequate | Onboarding checklist missing security steps |
| A.7 Physical | Adequate | — |
| A.8 Technological | Partial | Logging/monitoring coverage < 70% of assets |

## Priority Recommendations
1. Complete and ratify the information security policy suite
2. Extend centralized logging to remaining server estate
3. Formalize access-review cadence (quarterly)

## Next Steps
Assign control owners and schedule a follow-up assessment in 60 days.`,
    },
  });

  // ── Learning Progress ─────────────────────────
  const socTrack = "SOC Analyst Level 1";
  const socModules = [
    ["Security Operations Fundamentals", "COMPLETED", 100, 12],
    ["SIEM & Log Analysis", "IN_PROGRESS", 70, 18],
    ["Network Traffic Analysis", "IN_PROGRESS", 45, 9],
    ["Endpoint Detection & Response", "NOT_STARTED", 0, 0],
    ["Threat Intelligence", "NOT_STARTED", 0, 0],
    ["Incident Response Handling", "IN_PROGRESS", 30, 6],
  ] as const;
  let order = 0;
  for (const [module, status, progress, hours] of socModules) {
    await prisma.learningProgress.create({
      data: {
        track: socTrack,
        module,
        status: status as any,
        progress,
        hoursSpent: hours,
        order: order++,
        userId: user.id,
      },
    });
  }

  // ── Resources ─────────────────────────────────
  await prisma.resource.createMany({
    data: [
      { title: "TryHackMe — SOC Level 1 Path", type: "LAB", provider: "TryHackMe", status: "IN_PROGRESS", url: "https://tryhackme.com", userId: user.id, notes: "Great hands-on triage practice." },
      { title: "CompTIA Security+ (SY0-701)", type: "CERTIFICATION", provider: "CompTIA", status: "IN_PROGRESS", userId: user.id, notes: "Exam booked for next month." },
      { title: "Blue Team Handbook: Incident Response Edition", type: "BOOK", provider: "Don Murdoch", status: "TO_START", userId: user.id },
      { title: "Splunk Fundamentals 1", type: "COURSE", provider: "Splunk", status: "COMPLETED", url: "https://education.splunk.com", userId: user.id },
      { title: "MITRE ATT&CK Navigator", type: "TOOL", provider: "MITRE", status: "IN_PROGRESS", url: "https://mitre-attack.github.io/attack-navigator/", userId: user.id },
      { title: "malware-traffic-analysis.net", type: "LAB", provider: "Brad Duncan", status: "IN_PROGRESS", url: "https://malware-traffic-analysis.net", userId: user.id, notes: "PCAP exercises for Wireshark." },
      { title: "Practical Malware Analysis", type: "BOOK", provider: "Sikorski & Honig", status: "TO_START", userId: user.id },
      { title: "AWS Security Best Practices", type: "ARTICLE", provider: "AWS", status: "COMPLETED", url: "https://aws.amazon.com/security/", userId: user.id },
    ],
  });

  // ── Study Logs (last 7 days) ──────────────────
  const topics = ["SIEM", "Nmap", "IR playbooks", "Wireshark", "Splunk SPL", "MITRE ATT&CK", "Linux privesc"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 864e5);
    await prisma.studyLog.create({
      data: {
        date: d,
        minutes: [90, 45, 120, 60, 0, 75, 105][i],
        topic: topics[i],
        userId: user.id,
      },
    });
  }

  console.log("Seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
