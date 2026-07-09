"use client";

import { useMemo, useState } from "react";
import { Plus, ChevronDown, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Prep = {
  id: string;
  category: string;
  question: string;
  answer: string;
  confidence: number;
};

const CATEGORIES = [
  "General",
  "Behavioral",
  "SOC",
  "Networking",
  "Incident Response",
  "Threat Detection",
  "Cloud",
  "GRC",
];

const EMPTY: Partial<Prep> = { category: "General", confidence: 0 };

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onChange ? () => onChange(n) : undefined}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} of 5`}
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              n <= value ? "text-cds-yellow" : "text-cds-border-strong"
            )}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

export function InterviewClient({ initial }: { initial: Prep[] }) {
  const [items, setItems] = useState<Prep[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Prep> | null>(null);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const g: Record<string, Prep[]> = {};
    for (const i of items) (g[i.category] ??= []).push(i);
    return g;
  }, [items]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const isNew = !editing.id;
    const res = await fetch(
      isNew ? "/api/interview" : `/api/interview/${editing.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      }
    );
    if (res.ok) {
      const saved = await res.json();
      setItems((prev) =>
        isNew ? [...prev, saved] : prev.map((i) => (i.id === saved.id ? saved : i))
      );
      setEditing(null);
    }
    setSaving(false);
  }

  async function setConfidence(item: Prep, confidence: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, confidence } : i))
    );
    await fetch(`/api/interview/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confidence }),
    });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/interview/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-cds-helper">
          {items.length} questions ·{" "}
          {items.filter((i) => i.confidence >= 4).length} interview-ready
        </div>
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, qs]) => (
          <div key={cat}>
            <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
              {cat}
            </div>
            <div className="divide-y divide-cds-border border border-cds-border bg-cds-layer">
              {qs.map((q) => {
                const open = openId === q.id;
                return (
                  <div key={q.id}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => setOpenId(open ? null : q.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-cds-helper transition-transform",
                            open ? "rotate-0" : "-rotate-90"
                          )}
                        />
                        <span className="truncate text-sm text-cds-text">
                          {q.question}
                        </span>
                      </button>
                      <Stars
                        value={q.confidence}
                        onChange={(v) => setConfidence(q, v)}
                      />
                      <button
                        onClick={() => setEditing(q)}
                        className="text-cds-helper hover:text-cds-text"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(q.id)}
                        className="text-cds-helper hover:text-cds-red"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {open && (
                      <div className="animate-fade-in border-t border-cds-border bg-cds-bg px-4 py-3 pl-10 text-sm leading-relaxed text-cds-text-secondary">
                        {q.answer ? (
                          <p className="whitespace-pre-wrap">{q.answer}</p>
                        ) : (
                          <span className="text-cds-helper">
                            No answer yet — click the pencil to add one.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit question" : "Add question"}
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
              <Label>Category</Label>
              <Select
                value={editing.category ?? "General"}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Question</Label>
              <Input
                value={editing.question ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, question: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Your answer</Label>
              <Textarea
                rows={6}
                value={editing.answer ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, answer: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Confidence</Label>
              <Stars
                value={editing.confidence ?? 0}
                onChange={(v) => setEditing({ ...editing, confidence: v })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
