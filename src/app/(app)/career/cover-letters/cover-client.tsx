"use client";

import { useState } from "react";
import { Plus, Save, Trash2, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn, relativeTime } from "@/lib/utils";

type CoverLetter = {
  id: string;
  title: string;
  company: string | null;
  role: string | null;
  content: string;
  updatedAt: string;
};

export function CoverClient({ initial }: { initial: CoverLetter[] }) {
  const [items, setItems] = useState<CoverLetter[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null);
  const [saving, setSaving] = useState(false);

  const active = items.find((i) => i.id === activeId) ?? null;

  function patch(p: Partial<CoverLetter>) {
    if (!active) return;
    setItems((prev) => prev.map((i) => (i.id === active.id ? { ...i, ...p } : i)));
  }

  async function create() {
    const res = await fetch("/api/cover-letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New cover letter",
        content: "Dear Hiring Manager,\n\n",
      }),
    });
    if (res.ok) {
      const cl = await res.json();
      setItems([cl, ...items]);
      setActiveId(cl.id);
    }
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    await fetch(`/api/cover-letters/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(active),
    });
    setSaving(false);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (activeId === id) setActiveId(items.find((i) => i.id !== id)?.id ?? null);
    await fetch(`/api/cover-letters/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)]">
      <div className="flex w-64 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
        <div className="border-b border-cds-border p-4">
          <Button variant="primary" className="w-full" onClick={create}>
            <Plus className="h-4 w-4" /> New letter
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.map((i) => (
            <button
              key={i.id}
              onClick={() => setActiveId(i.id)}
              className={cn(
                "flex w-full items-start gap-2 border-b border-cds-border px-4 py-3 text-left transition-colors",
                activeId === i.id ? "bg-cds-layer-accent" : "hover:bg-cds-layer"
              )}
            >
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cds-helper" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-cds-text">
                  {i.title}
                </div>
                <div className="truncate text-2xs text-cds-helper">
                  {[i.company, i.role].filter(Boolean).join(" · ") || "No company"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-cds-border px-5 py-2.5">
            <div className="grid flex-1 grid-cols-3 gap-3 pr-4">
              <Input
                placeholder="Letter name"
                value={active.title}
                onChange={(e) => patch({ title: e.target.value })}
              />
              <Input
                placeholder="Company"
                value={active.company ?? ""}
                onChange={(e) => patch({ company: e.target.value })}
              />
              <Input
                placeholder="Role"
                value={active.role ?? ""}
                onChange={(e) => patch({ role: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => remove(active.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="primary" onClick={save} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-cds-border">
            <textarea
              value={active.content}
              onChange={(e) => patch({ content: e.target.value })}
              spellCheck
              className="h-full resize-none bg-cds-bg p-6 font-sans text-sm leading-relaxed text-cds-text-secondary focus:outline-none"
            />
            <div className="overflow-y-auto bg-cds-bg p-6">
              <div
                id="cover-print"
                className="mx-auto max-w-2xl whitespace-pre-wrap border border-cds-border bg-cds-layer p-8 text-sm leading-relaxed text-cds-text-secondary"
              >
                {active.content}
              </div>
              <p className="mx-auto mt-3 max-w-2xl text-2xs text-cds-helper">
                Last edited {relativeTime(active.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-cds-helper">
          Create a cover letter to begin.
        </div>
      )}
    </div>
  );
}
