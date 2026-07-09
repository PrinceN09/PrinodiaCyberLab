"use client";

import { useState } from "react";
import { Plus, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type Hunt = {
  id: string;
  title: string;
  hypothesis: string;
  dataSource: string | null;
  mitre: string | null;
  status: string;
  findings: string | null;
};

const STATUSES = [
  { value: "PROPOSED", label: "Proposed", tone: "gray" as Tone },
  { value: "ACTIVE", label: "Active", tone: "blue" as Tone },
  { value: "COMPLETED", label: "Completed", tone: "green" as Tone },
  { value: "ARCHIVED", label: "Archived", tone: "gray" as Tone },
];
const EMPTY: Partial<Hunt> = { status: "PROPOSED" };

export function HuntClient({ initial }: { initial: Hunt[] }) {
  const [hunts, setHunts] = useState<Hunt[]>(initial);
  const [editing, setEditing] = useState<Partial<Hunt> | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      const saved = await res.json();
      setHunts([saved, ...hunts]);
      setEditing(null);
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-cds-helper">{hunts.length} hunts</div>
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> New hunt
        </Button>
      </div>

      {hunts.length === 0 ? (
        <div className="border border-cds-border bg-cds-layer">
          <EmptyState
            icon={Crosshair}
            title="No hunts yet"
            description="Define a hypothesis-driven threat hunt to proactively search for adversary activity."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px overflow-hidden border border-cds-border bg-cds-border md:grid-cols-2">
          {hunts.map((h) => {
            const st = STATUSES.find((s) => s.value === h.status) ?? STATUSES[0];
            return (
              <div key={h.id} className="flex flex-col bg-cds-layer p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center border border-cds-border bg-cds-bg">
                    <Crosshair className="h-4 w-4 text-cds-text-secondary" />
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-cds-text">
                  {h.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-cds-text-secondary">
                  <span className="text-cds-helper">Hypothesis: </span>
                  {h.hypothesis}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs text-cds-helper">
                  {h.dataSource && (
                    <span className="border border-cds-border px-1.5 py-0.5">
                      {h.dataSource}
                    </span>
                  )}
                  {h.mitre && (
                    <span className="font-mono border border-cds-border px-1.5 py-0.5">
                      {h.mitre}
                    </span>
                  )}
                </div>
                {h.findings && (
                  <p className="mt-3 border-t border-cds-border pt-3 text-xs text-cds-text-secondary">
                    <span className="text-cds-helper">Findings: </span>
                    {h.findings}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="New threat hunt"
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
              <Label>Hunt title</Label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Hypothesis</Label>
              <Textarea
                rows={3}
                value={editing.hypothesis ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, hypothesis: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={editing.status ?? "PROPOSED"}
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Data source</Label>
                <Input
                  value={editing.dataSource ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, dataSource: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>MITRE ID</Label>
                <Input
                  value={editing.mitre ?? ""}
                  onChange={(e) => setEditing({ ...editing, mitre: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Findings</Label>
              <Textarea
                rows={3}
                value={editing.findings ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, findings: e.target.value })
                }
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
