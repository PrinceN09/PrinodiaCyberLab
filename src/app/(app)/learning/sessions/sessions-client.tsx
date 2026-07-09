"use client";

import { useState } from "react";
import { Plus, CalendarClock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

type Session = {
  id: string;
  date: string;
  minutes: number;
  topic: string;
  focus: string | null;
  notes: string | null;
  course: { title: string } | null;
};
type Course = { id: string; title: string };

const EMPTY = {
  topic: "",
  minutes: "60",
  focus: "",
  courseId: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

export function SessionsClient({
  initial,
  courses,
}: {
  initial: Session[];
  courses: Course[];
}) {
  const [sessions, setSessions] = useState<Session[]>(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const totalMin = sessions.reduce((s, x) => s + x.minutes, 0);
  const thisWeek = sessions
    .filter((s) => Date.now() - +new Date(s.date) < 7 * 864e5)
    .reduce((s, x) => s + x.minutes, 0);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        minutes: Number(form.minutes),
        courseId: form.courseId || null,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      const course = courses.find((c) => c.id === saved.courseId) ?? null;
      setSessions([{ ...saved, course }, ...sessions]);
      setForm({ ...EMPTY });
      setOpen(false);
    }
    setSaving(false);
  }

  const kpis = [
    { label: "Total logged", value: `${(totalMin / 60).toFixed(1)}h` },
    { label: "This week", value: `${(thisWeek / 60).toFixed(1)}h` },
    { label: "Sessions", value: sessions.length },
  ];

  return (
    <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="grid flex-1 grid-cols-3 gap-px overflow-hidden border border-cds-border bg-cds-border sm:max-w-md">
          {kpis.map((k) => (
            <div key={k.label} className="bg-cds-layer px-4 py-3">
              <div className="text-lg font-semibold text-cds-text">{k.value}</div>
              <div className="text-2xs text-cds-helper">{k.label}</div>
            </div>
          ))}
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Log session
        </Button>
      </div>

      <div className="border border-cds-border bg-cds-layer">
        {sessions.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No study sessions yet"
            description="Log your study sessions to build streaks and track hours toward your goals."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> Log session
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-cds-border">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-cds-border bg-cds-bg">
                  <Clock className="h-4 w-4 text-cds-text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-cds-text">
                    {s.topic}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-2xs text-cds-helper">
                    <span>{formatDate(s.date)}</span>
                    {s.focus && (
                      <>
                        <span>·</span>
                        <span>{s.focus}</span>
                      </>
                    )}
                    {s.course && (
                      <>
                        <span>·</span>
                        <span className="text-cds-link">{s.course.title}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold tabular-nums text-cds-text">
                  {(s.minutes / 60).toFixed(1)}h
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log study session"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Log session"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Topic</Label>
            <Input
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: e.target.value })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Focus / source</Label>
            <Input
              placeholder="e.g. TryHackMe, 10Alytics Module 2"
              value={form.focus}
              onChange={(e) => setForm({ ...form, focus: e.target.value })}
            />
          </div>
          <div>
            <Label>Linked course (optional)</Label>
            <Select
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            >
              <option value="">None</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
