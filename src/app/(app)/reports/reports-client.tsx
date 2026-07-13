"use client";

import { useState } from "react";
import { Plus, Save, Eye, Pencil, FileWarning } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import {
  REPORT_TYPES,
  REPORT_SEVERITY,
  REPORT_STATUS,
  labelFor,
} from "@/lib/constants";

type Report = {
  id: string;
  title: string;
  type: string;
  severity: string;
  status: string;
  reference: string | null;
  content: string;
  updatedAt: string | Date;
};

const severityTone: Record<string, Tone> = {
  CRITICAL: "red",
  HIGH: "orange",
  MEDIUM: "yellow",
  LOW: "blue",
  INFORMATIONAL: "gray",
};

const statusTone: Record<string, Tone> = {
  DRAFT: "gray",
  IN_REVIEW: "yellow",
  FINAL: "green",
};

const TEMPLATES: Record<string, string> = {
  INCIDENT_RESPONSE: `# Incident Response Report

## 1. Executive Summary

## 2. Timeline (UTC)
| Time | Event |
|------|-------|
|      |       |

## 3. Impact

## 4. Root Cause

## 5. Remediation

## 6. Lessons Learned
`,
  VULNERABILITY: `# Vulnerability Report

## Summary

## Details
- **CVSS 3.1:**
- **Affected:**
- **CWE:**

## Proof of Concept

## Business Impact

## Remediation

## Recommended SLA
`,
  GRC: `# GRC Assessment

## Scope

## Findings Summary
| Control Area | Maturity | Gap |
|--------------|----------|-----|

## Priority Recommendations

## Next Steps
`,
  THREAT_INTEL: `# Threat Intelligence Brief

## Summary

## Threat Actor / Campaign

## TTPs (MITRE ATT&CK)

## Indicators of Compromise

## Recommended Actions
`,
};

export function ReportsClient({
  initialReports,
  lockType,
}: {
  initialReports: Report[];
  lockType?: string;
}) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [activeId, setActiveId] = useState<string | null>(
    initialReports[0]?.id ?? null
  );
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [draft, setDraft] = useState(initialReports[0]?.content ?? "");
  const [saving, setSaving] = useState(false);

  const active = reports.find((r) => r.id === activeId) ?? null;

  function open(r: Report) {
    setActiveId(r.id);
    setDraft(r.content);
    setMode("preview");
  }

  async function create(type: string) {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `New ${labelFor(REPORT_TYPES, type)} report`,
        type,
        content: TEMPLATES[type] ?? "# New report\n",
      }),
    });
    if (res.ok) {
      const r = await res.json();
      setReports([r, ...reports]);
      open(r);
      setMode("edit");
    }
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    const res = await fetch(`/api/reports/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReports(
        reports.map((r) => (r.id === updated.id ? { ...r, content: draft } : r))
      );
      setMode("preview");
    }
    setSaving(false);
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <div className="flex w-96 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
        <div className="border-b border-cds-border p-4">
          <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
            New report
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(lockType
              ? REPORT_TYPES.filter((t) => t.value === lockType)
              : REPORT_TYPES
            ).map((t) => (
              <button
                key={t.value}
                onClick={() => create(t.value)}
                className="flex items-center gap-1.5 border border-cds-border bg-cds-layer px-2.5 py-2 text-2xs font-medium text-cds-text-secondary transition-colors hover:border-cds-blue hover:text-cds-text"
              >
                <Plus className="h-3 w-3" /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => open(r)}
              className={cn(
                "flex w-full flex-col items-start gap-2 border-b border-cds-border px-4 py-3 text-left transition-colors",
                activeId === r.id ? "bg-cds-layer-accent" : "hover:bg-cds-layer"
              )}
            >
              <div className="flex w-full items-start gap-2">
                <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cds-helper" />
                <span className="text-sm font-medium leading-snug text-cds-text">
                  {r.title}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-5">
                <Badge tone={severityTone[r.severity]}>{r.severity}</Badge>
                <Badge tone={statusTone[r.status]}>
                  {labelFor(REPORT_STATUS, r.status)}
                </Badge>
                {r.reference && (
                  <span className="text-2xs font-mono text-cds-helper">
                    {r.reference}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <div className="flex items-center justify-between border-b border-cds-border px-6 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-cds-text">
                  {active.title}
                </div>
                <div className="mt-1 flex items-center gap-2 text-2xs text-cds-helper">
                  <span>{labelFor(REPORT_TYPES, active.type)}</span>
                  <span>·</span>
                  <span>Updated {formatDate(active.updatedAt)}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {mode === "preview" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDraft(active.content);
                      setMode("edit");
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setMode("preview")}>
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                    <Button variant="primary" onClick={save} disabled={saving}>
                      <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {mode === "preview" ? (
                <div className="mx-auto h-full max-w-3xl overflow-y-auto px-8 py-6">
                  <Markdown>{active.content}</Markdown>
                </div>
              ) : (
                <div className="grid h-full grid-cols-2 divide-x divide-cds-border">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                    className="h-full resize-none bg-cds-bg p-6 font-mono text-sm leading-relaxed text-cds-text-secondary focus:outline-none"
                  />
                  <div className="h-full overflow-y-auto px-6 py-4">
                    <Markdown>{draft}</Markdown>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-cds-helper">
            Select a report or start from a template.
          </div>
        )}
      </div>
    </div>
  );
}
