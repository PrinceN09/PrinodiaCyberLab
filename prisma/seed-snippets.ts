/**
 * Starter snippets for the Code Workspace.
 *
 * NON-DESTRUCTIVE: unlike prisma/seed.ts (which wipes the database),
 * this script only inserts snippets that don't already exist (matched
 * by title). Safe to run on a live database:
 *
 *   npm run db:seed:snippets
 */
import { PrismaClient, CodeCategory, NoteDifficulty } from "@prisma/client";

const prisma = new PrismaClient();

type Starter = {
  title: string;
  description: string;
  language: string;
  category: CodeCategory;
  difficulty: NoteDifficulty;
  tags: string[];
  code: string;
};

const STARTERS: Starter[] = [
  {
    title: "Python — Auth log parser",
    description:
      "Parses /var/log/auth.log for failed SSH logins and summarizes attacking IPs.",
    language: "python",
    category: "SOC",
    difficulty: "BEGINNER",
    tags: ["Linux", "Detection", "SSH"],
    code: `#!/usr/bin/env python3
"""Parse auth.log for failed SSH logins and rank source IPs."""
import re
import sys
from collections import Counter

FAILED = re.compile(
    r"Failed password for (?:invalid user )?(?P<user>\\S+) "
    r"from (?P<ip>\\d{1,3}(?:\\.\\d{1,3}){3})"
)

def parse(path: str) -> Counter:
    hits: Counter = Counter()
    with open(path, errors="replace") as fh:
        for line in fh:
            m = FAILED.search(line)
            if m:
                hits[m["ip"]] += 1
    return hits

if __name__ == "__main__":
    log = sys.argv[1] if len(sys.argv) > 1 else "/var/log/auth.log"
    for ip, count in parse(log).most_common(20):
        flag = "  <-- investigate" if count >= 10 else ""
        print(f"{ip:15}  {count:5} failed logins{flag}")
`,
  },
  {
    title: "Bash — Network scan notes",
    description:
      "Common Nmap scans for lab recon with notes on when to use each.",
    language: "bash",
    category: "NETWORKING",
    difficulty: "BEGINNER",
    tags: ["Nmap", "Networking", "Recon"],
    code: `#!/usr/bin/env bash
# Nmap recon cheatsheet — LAB USE ONLY, always have authorization.
TARGET="10.10.10.0/24"

# 1. Fast host discovery (no port scan)
nmap -sn "$TARGET"

# 2. Top 1000 TCP ports + service versions
nmap -sV --top-ports 1000 "$TARGET" -oA scans/top1000

# 3. Full TCP sweep on a single host (slow, thorough)
nmap -p- -T4 10.10.10.5 -oA scans/fulltcp

# 4. Default NSE scripts + versions (good first deep look)
nmap -sC -sV 10.10.10.5 -oA scans/scripts

# 5. UDP top 100 (slow — run in background)
sudo nmap -sU --top-ports 100 10.10.10.5 -oA scans/udp

# Tip: -oA writes .nmap/.gnmap/.xml so results are grep-able later:
# grep -h "open" scans/*.gnmap | sort -u
`,
  },
  {
    title: "PowerShell — Windows event log queries",
    description:
      "Query Security event log for failed logons (4625) and new services (7045).",
    language: "powershell",
    category: "INCIDENT_RESPONSE",
    difficulty: "INTERMEDIATE",
    tags: ["Windows", "Event Logs", "Incident Response"],
    code: `# Failed logons in the last 24h, grouped by account and source IP
Get-WinEvent -FilterHashtable @{ LogName = 'Security'; Id = 4625; StartTime = (Get-Date).AddDays(-1) } |
  ForEach-Object {
    $x = [xml]$_.ToXml()
    [pscustomobject]@{
      Time    = $_.TimeCreated
      Account = ($x.Event.EventData.Data | Where-Object Name -eq 'TargetUserName').'#text'
      Source  = ($x.Event.EventData.Data | Where-Object Name -eq 'IpAddress').'#text'
      Logon   = ($x.Event.EventData.Data | Where-Object Name -eq 'LogonType').'#text'
    }
  } |
  Group-Object Account, Source |
  Sort-Object Count -Descending |
  Select-Object Count, Name -First 20

# New services installed (persistence check) — System log, event 7045
Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 7045; StartTime = (Get-Date).AddDays(-7) } |
  Select-Object TimeCreated, @{n='Service';e={$_.Properties[0].Value}},
                @{n='ImagePath';e={$_.Properties[1].Value}}
`,
  },
  {
    title: "SQL — Suspicious login analysis",
    description:
      "Finds brute-force patterns and impossible-travel candidates in an auth_events table.",
    language: "sql",
    category: "THREAT_HUNTING",
    difficulty: "INTERMEDIATE",
    tags: ["SQL", "Threat Hunting", "Detection"],
    code: `-- Assumes: auth_events(user_name, src_ip, country, success, event_time)

-- 1. Brute force: >20 failures in a 10-minute window per user+IP
SELECT user_name,
       src_ip,
       date_trunc('hour', event_time)
         + (extract(minute FROM event_time)::int / 10) * interval '10 min' AS window_start,
       count(*) AS failures
FROM auth_events
WHERE success = false
  AND event_time > now() - interval '1 day'
GROUP BY 1, 2, 3
HAVING count(*) > 20
ORDER BY failures DESC;

-- 2. Spray candidates: one IP failing against many accounts
SELECT src_ip,
       count(DISTINCT user_name) AS accounts_hit,
       count(*)                  AS failures
FROM auth_events
WHERE success = false
  AND event_time > now() - interval '1 day'
GROUP BY src_ip
HAVING count(DISTINCT user_name) >= 10
ORDER BY accounts_hit DESC;

-- 3. Impossible travel: same user, different countries within 1 hour
SELECT a.user_name, a.country AS from_country, b.country AS to_country,
       a.event_time, b.event_time
FROM auth_events a
JOIN auth_events b
  ON a.user_name = b.user_name
 AND a.success AND b.success
 AND a.country <> b.country
 AND b.event_time BETWEEN a.event_time AND a.event_time + interval '1 hour'
WHERE a.event_time > now() - interval '7 days';
`,
  },
  {
    title: "YAML — Sigma rule example",
    description:
      "Sigma rule detecting encoded PowerShell commands (T1059.001).",
    language: "yaml",
    category: "DETECTION_ENGINEERING",
    difficulty: "INTERMEDIATE",
    tags: ["Sigma", "Detection", "MITRE ATT&CK"],
    code: `title: Encoded PowerShell Command Execution
id: 3e4d1a2b-starter-example
status: experimental
description: >
  Detects PowerShell started with an encoded command, a common way to
  obfuscate malicious one-liners.
references:
  - https://attack.mitre.org/techniques/T1059/001/
author: Prinodia CyberLab
tags:
  - attack.execution
  - attack.t1059.001
logsource:
  category: process_creation
  product: windows
detection:
  selection_img:
    Image|endswith:
      - '\\powershell.exe'
      - '\\pwsh.exe'
  selection_flags:
    CommandLine|contains:
      - ' -enc '
      - ' -EncodedCommand '
      - ' -e JAB'
  condition: selection_img and selection_flags
falsepositives:
  - Legitimate administration scripts and some installers
level: medium
`,
  },
  {
    title: "JSON — IOC bundle example",
    description:
      "A minimal indicator bundle format for sharing IOCs between tools.",
    language: "json",
    category: "SIEM",
    difficulty: "BEGINNER",
    tags: ["IOC", "Threat Intelligence"],
    code: `{
  "bundle": "prinodia-ioc-example",
  "created": "2026-07-09T00:00:00Z",
  "source": "internal-hunt-042",
  "confidence": "medium",
  "indicators": [
    {
      "type": "ipv4",
      "value": "203.0.113.42",
      "context": "C2 beaconing observed over 443",
      "mitre": "T1071.001",
      "first_seen": "2026-07-01",
      "tlp": "AMBER"
    },
    {
      "type": "domain",
      "value": "updates-cdn.example-bad.top",
      "context": "Staging domain from phishing campaign",
      "mitre": "T1566.002",
      "first_seen": "2026-07-03",
      "tlp": "AMBER"
    },
    {
      "type": "sha256",
      "value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "context": "Dropper payload (empty-file hash placeholder)",
      "mitre": "T1204.002",
      "first_seen": "2026-07-03",
      "tlp": "AMBER"
    }
  ]
}
`,
  },
];

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found — run the main seed or sign in first.");
    process.exit(1);
  }

  const folder = await prisma.codeFolder.upsert({
    where: { name: "Starter Pack" },
    update: {},
    create: { name: "Starter Pack" },
  });

  let created = 0;
  for (const s of STARTERS) {
    const exists = await prisma.codeSnippet.findFirst({
      where: { title: s.title, userId: user.id },
      select: { id: true },
    });
    if (exists) {
      console.log(`skip   ${s.title} (already exists)`);
      continue;
    }
    await prisma.codeSnippet.create({
      data: {
        title: s.title,
        description: s.description,
        language: s.language,
        code: s.code,
        category: s.category,
        difficulty: s.difficulty,
        folderId: folder.id,
        userId: user.id,
        tags: {
          connectOrCreate: s.tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });
    created += 1;
    console.log(`create ${s.title}`);
  }
  console.log(`Done — ${created} snippet(s) created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
