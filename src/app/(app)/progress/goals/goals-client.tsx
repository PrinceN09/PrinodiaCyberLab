"use client";

import { useState } from "react";
import { Plus, Target, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";

type Goal = {
  id: string;
  title: string;
  type: string;
  target: number;
  current: number;
  unit: string;
  active: boolean;
};

const TYPES = [
  { value: "WEEKLY_HOURS", label: "Weekly hours", unit: "hours" },
  { value: "DAILY_HOURS", label: "Daily hours", unit: "hours/day" },
  { value: "MODULES", label: "Modules", unit: "modules" },
  { value: "SESSIONS", label: "Sessions", unit: "sessions" },
  { value: "CUSTOM", label: "Custom", unit: "units" },
];
const EMPTY: Partial<Goal> = { type: "WEEKLY_HOURS", target: 10, current: 0, unit: "hours" };

export function GoalsClient({ initial }: { initial: Goal[] }) {
  const [goals, setGoals] = useState<Goal[]>(initial);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const isNew = !editing.id;
    const res = await fetch(isNew ? "/api/goals" : `/api/goals/${editing.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      const saved = await res.json();
      setGoals((prev) =>
        isNew ? [...prev, saved] : prev.map((g) => (g.id === saved.id ? saved : g))
      );
      setEditing(null);
    }
    setSaving(false);
  }

  async function bump(goal: Goal, delta: number) {
    const current = Math.max(0, goal.current + delta);
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, current } : g))
    );
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current }),
    });
  }

  async function remove(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs text-cds-helper">{goals.length} goals</div>
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="border border-cds-border bg-cds-layer">
          <EmptyState
            icon={Target}
            title="No goals set"
            description="Set weekly and daily study targets to keep your learning on track."
            action={
              <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
                <Plus className="h-4 w-4" /> New goal
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
            const done = pct >= 100;
            return (
              <div
                key={g.id}
                className="group border border-cds-border bg-cds-layer p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-cds-text">
                      {done && <Check className="h-4 w-4 text-cds-green" />}
                      {g.title}
                    </div>
                    <div className="mt-0.5 text-2xs text-cds-helper">
                      {TYPES.find((t) => t.value === g.type)?.label ?? g.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-cds-text-secondary">
                      {g.current} / {g.target} {g.unit}
                    </span>
                    <button
                      onClick={() => remove(g.id)}
                      className="text-cds-helper opacity-0 transition-opacity hover:text-cds-red group-hover:opacity-100"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <ProgressBar
                  value={pct}
                  tone={done ? "green" : "blue"}
                  className="mt-3"
                />
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => bump(g, -0.5)}
                    className="h-7 w-7 border border-cds-border text-sm text-cds-text-secondary hover:bg-cds-layer-accent"
                  >
                    −
                  </button>
                  <button
                    onClick={() => bump(g, 0.5)}
                    className="h-7 w-7 border border-cds-border text-sm text-cds-text-secondary hover:bg-cds-layer-accent"
                  >
                    +
                  </button>
                  <span className="text-2xs text-cds-helper">
                    Log progress toward this goal
                  </span>
                  <button
                    onClick={() => setEditing(g)}
                    className="ml-auto text-2xs text-cds-link hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit goal" : "New goal"}
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
              <Label>Goal title</Label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label>Type</Label>
                <Select
                  value={editing.type ?? "WEEKLY_HOURS"}
                  onChange={(e) => {
                    const t = TYPES.find((x) => x.value === e.target.value);
                    setEditing({
                      ...editing,
                      type: e.target.value,
                      unit: t?.unit ?? editing.unit,
                    });
                  }}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Current</Label>
                <Input
                  type="number"
                  value={editing.current ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, current: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Target</Label>
                <Input
                  type="number"
                  value={editing.target ?? 0}
                  onChange={(e) =>
                    setEditing({ ...editing, target: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
