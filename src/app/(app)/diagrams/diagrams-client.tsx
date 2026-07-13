"use client";

import { useState } from "react";
import { Plus, Save, Workflow } from "lucide-react";
import { MermaidRender } from "@/components/mermaid";
import { Button } from "@/components/ui/button";
import { cn, relativeTime } from "@/lib/utils";

type Diagram = {
  id: string;
  title: string;
  description: string | null;
  mermaidCode: string;
  updatedAt: string | Date;
};

const STARTER = `flowchart TD
  A[Start] --> B{Decision}
  B -- Yes --> C[Action]
  B -- No --> D[End]`;

export function DiagramsClient({
  initialDiagrams,
}: {
  initialDiagrams: Diagram[];
}) {
  const [diagrams, setDiagrams] = useState<Diagram[]>(initialDiagrams);
  const [activeId, setActiveId] = useState<string | null>(
    initialDiagrams[0]?.id ?? null
  );
  const [code, setCode] = useState(initialDiagrams[0]?.mermaidCode ?? "");
  const [saving, setSaving] = useState(false);

  const active = diagrams.find((d) => d.id === activeId) ?? null;

  function open(d: Diagram) {
    setActiveId(d.id);
    setCode(d.mermaidCode);
  }

  async function create() {
    const res = await fetch("/api/diagrams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New diagram",
        mermaidCode: STARTER,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setDiagrams([d, ...diagrams]);
      open(d);
    }
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    const res = await fetch(`/api/diagrams/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mermaidCode: code }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDiagrams(
        diagrams.map((d) => (d.id === updated.id ? { ...d, mermaidCode: code } : d))
      );
    }
    setSaving(false);
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <div className="flex w-72 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
        <div className="border-b border-cds-border p-4">
          <Button variant="primary" className="w-full" onClick={create}>
            <Plus className="h-4 w-4" /> New diagram
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {diagrams.map((d) => (
            <button
              key={d.id}
              onClick={() => open(d)}
              className={cn(
                "flex w-full flex-col items-start gap-1 border-b border-cds-border px-4 py-3 text-left transition-colors",
                activeId === d.id ? "bg-cds-layer-accent" : "hover:bg-cds-layer"
              )}
            >
              <div className="flex w-full items-center gap-2">
                <Workflow className="h-3.5 w-3.5 shrink-0 text-cds-helper" />
                <span className="truncate text-sm font-medium text-cds-text">
                  {d.title}
                </span>
              </div>
              {d.description && (
                <span className="line-clamp-2 text-2xs text-cds-helper">
                  {d.description}
                </span>
              )}
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
                <div className="mt-0.5 text-2xs text-cds-helper">
                  Updated {relativeTime(active.updatedAt)}
                </div>
              </div>
              <Button variant="primary" onClick={save} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-cds-border">
              <div className="flex flex-col">
                <div className="border-b border-cds-border px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                  Mermaid source
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="flex-1 resize-none bg-cds-bg p-4 font-mono text-sm leading-relaxed text-cds-text-secondary focus:outline-none"
                />
              </div>
              <div className="flex flex-col">
                <div className="border-b border-cds-border px-4 py-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                  Preview
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <MermaidRender code={code} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-cds-helper">
            Select or create a diagram.
          </div>
        )}
      </div>
    </div>
  );
}
