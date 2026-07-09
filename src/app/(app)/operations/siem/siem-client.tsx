"use client";

import { useState } from "react";
import { Plus, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type Rule = {
  id: string;
  title: string;
  platform: string;
  description: string | null;
  query: string;
  mitre: string | null;
  severity: string;
  enabled: boolean;
};

const PLATFORMS = ["Splunk", "Microsoft Sentinel", "Elastic", "Sigma", "CrowdStrike"];
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];
const sevTone: Record<string, Tone> = {
  CRITICAL: "red",
  HIGH: "orange",
  MEDIUM: "yellow",
  LOW: "blue",
  INFORMATIONAL: "gray",
};
const EMPTY: Partial<Rule> = { platform: "Splunk", severity: "MEDIUM" };

export function SiemClient({ initial }: { initial: Rule[] }) {
  const [rules, setRules] = useState<Rule[]>(initial);
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/siem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      const saved = await res.json();
      setRules([saved, ...rules]);
      setEditing(null);
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-cds-helper">{rules.length} detection rules</div>
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> New rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="border border-cds-border bg-cds-layer">
          <EmptyState
            icon={Radar}
            title="No detection rules yet"
            description="Author SIEM correlation rules mapped to MITRE ATT&CK."
          />
        </div>
      ) : (
        <div className="divide-y divide-cds-border border border-cds-border bg-cds-layer">
          {rules.map((r) => {
            const open = openId === r.id;
            return (
              <div key={r.id}>
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-cds-layer-accent"
                >
                  <Radar className="h-4 w-4 shrink-0 text-cds-helper" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-cds-text">
                      {r.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-2xs text-cds-helper">
                      <span>{r.platform}</span>
                      {r.mitre && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{r.mitre}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge tone={sevTone[r.severity] ?? "gray"}>{r.severity}</Badge>
                </button>
                {open && (
                  <div className="animate-fade-in border-t border-cds-border bg-cds-bg px-5 py-4">
                    {r.description && (
                      <p className="mb-3 text-xs text-cds-text-secondary">
                        {r.description}
                      </p>
                    )}
                    <pre className="overflow-x-auto border border-cds-border bg-cds-code-bg p-3 font-mono text-xs text-cds-text-secondary">
                      {r.query}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="New detection rule"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <Label>Rule title</Label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Platform</Label>
                <Select
                  value={editing.platform ?? "Splunk"}
                  onChange={(e) =>
                    setEditing({ ...editing, platform: e.target.value })
                  }
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select
                  value={editing.severity ?? "MEDIUM"}
                  onChange={(e) =>
                    setEditing({ ...editing, severity: e.target.value })
                  }
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>MITRE ID</Label>
                <Input
                  placeholder="T1110.003"
                  value={editing.mitre ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, mitre: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editing.description ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Detection query</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={editing.query ?? ""}
                onChange={(e) => setEditing({ ...editing, query: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
