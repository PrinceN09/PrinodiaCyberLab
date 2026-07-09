"use client";

import { useState } from "react";
import { Plus, Fingerprint, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";

type Ioc = {
  id: string;
  type: string;
  value: string;
  threatType: string | null;
  source: string | null;
  confidence: string;
  notes: string | null;
};

const TYPES = ["IP", "DOMAIN", "URL", "FILE_HASH", "EMAIL", "REGISTRY"];
const typeTone: Record<string, Tone> = {
  IP: "cyan",
  DOMAIN: "purple",
  URL: "blue",
  FILE_HASH: "orange",
  EMAIL: "magenta",
  REGISTRY: "teal",
};
const confTone: Record<string, Tone> = {
  High: "red",
  Medium: "yellow",
  Low: "gray",
};
const EMPTY: Partial<Ioc> = { type: "IP", confidence: "Medium" };

export function IocClient({ initial }: { initial: Ioc[] }) {
  const [items, setItems] = useState<Ioc[]>(initial);
  const [editing, setEditing] = useState<Partial<Ioc> | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/iocs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      const saved = await res.json();
      setItems([saved, ...items]);
      setEditing(null);
    }
    setSaving(false);
  }

  function copy(v: string) {
    navigator.clipboard.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-cds-helper">{items.length} indicators</div>
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> Add IOC
        </Button>
      </div>

      <div className="border border-cds-border bg-cds-layer">
        {items.length === 0 ? (
          <EmptyState
            icon={Fingerprint}
            title="No indicators yet"
            description="Add indicators of compromise gathered from investigations and threat intel."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cds-border text-left text-2xs uppercase tracking-wider text-cds-helper">
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Indicator</th>
                  <th className="px-5 py-3 font-semibold">Threat</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cds-border">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-cds-layer-accent">
                    <td className="px-5 py-3">
                      <Badge tone={typeTone[i.type] ?? "gray"}>
                        {i.type.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => copy(i.value)}
                        className="group inline-flex items-center gap-2 font-mono text-xs text-cds-text"
                        title="Copy"
                      >
                        <span className="break-all">{i.value}</span>
                        {copied === i.value ? (
                          <Check className="h-3 w-3 shrink-0 text-cds-green" />
                        ) : (
                          <Copy className="h-3 w-3 shrink-0 text-cds-helper opacity-0 group-hover:opacity-100" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-xs text-cds-text-secondary">
                      {i.threatType ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-cds-text-secondary">
                      {i.source ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={confTone[i.confidence] ?? "gray"}>
                        {i.confidence}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Add indicator"
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={editing.type ?? "IP"}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Confidence</Label>
                <Select
                  value={editing.confidence ?? "Medium"}
                  onChange={(e) =>
                    setEditing({ ...editing, confidence: e.target.value })
                  }
                >
                  {["High", "Medium", "Low"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>Indicator value</Label>
              <Input
                value={editing.value ?? ""}
                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Threat type</Label>
                <Input
                  value={editing.threatType ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, threatType: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Source</Label>
                <Input
                  value={editing.source ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, source: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={editing.notes ?? ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
