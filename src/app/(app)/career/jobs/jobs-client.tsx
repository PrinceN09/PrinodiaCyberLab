"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ExternalLink,
  MapPin,
  Banknote,
  CalendarDays,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Label, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase } from "lucide-react";
import { JOB_STATUSES } from "@/lib/career";
import { formatDate } from "@/lib/utils";

type Job = {
  id: string;
  company: string;
  jobTitle: string;
  location: string | null;
  salary: string | null;
  url: string | null;
  status: string;
  appliedDate: string | null;
  interviewDate: string | null;
  notes: string | null;
};

const EMPTY: Partial<Job> = { status: "SAVED" };

export function JobsClient({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [editing, setEditing] = useState<Partial<Job> | null>(null);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of JOB_STATUSES) c[s.value] = 0;
    for (const j of jobs) c[j.status] = (c[j.status] ?? 0) + 1;
    return c;
  }, [jobs]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    const isNew = !editing.id;
    const res = await fetch(
      isNew ? "/api/jobs" : `/api/jobs/${editing.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      }
    );
    if (res.ok) {
      const saved = await res.json();
      setJobs((prev) =>
        isNew
          ? [saved, ...prev]
          : prev.map((j) => (j.id === saved.id ? saved : j))
      );
      setEditing(null);
    }
    setSaving(false);
  }

  async function updateStatus(job: Job, status: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status } : j))
    );
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden border border-cds-border bg-cds-border sm:grid-cols-5">
          {JOB_STATUSES.map((s) => (
            <div key={s.value} className="bg-cds-layer px-4 py-3">
              <div className="text-lg font-semibold text-cds-text">
                {counts[s.value]}
              </div>
              <div className="text-2xs text-cds-helper">{s.label}</div>
            </div>
          ))}
        </div>
        <Button
          variant="primary"
          className="ml-4 shrink-0"
          onClick={() => setEditing({ ...EMPTY })}
        >
          <Plus className="h-4 w-4" /> Add job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="border border-cds-border bg-cds-layer">
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Track roles from hiring.cafe and other boards. Add your first application to get started."
            action={
              <Button variant="primary" onClick={() => setEditing({ ...EMPTY })}>
                <Plus className="h-4 w-4" /> Add job
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {JOB_STATUSES.map((col) => {
            const colJobs = jobs.filter((j) => j.status === col.value);
            return (
              <div key={col.value} className="flex flex-col">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                    {col.label}
                  </span>
                  <Badge tone={col.tone}>{colJobs.length}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {colJobs.map((j) => (
                    <div
                      key={j.id}
                      className="group border border-cds-border bg-cds-layer p-3.5 transition-colors hover:border-cds-border-strong"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-cds-text">
                            {j.company}
                          </div>
                          <div className="truncate text-xs text-cds-text-secondary">
                            {j.jobTitle}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setEditing(j)}
                            className="flex h-6 w-6 items-center justify-center text-cds-helper hover:text-cds-text"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(j.id)}
                            className="flex h-6 w-6 items-center justify-center text-cds-helper hover:text-cds-red"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        {j.location && (
                          <div className="flex items-center gap-1.5 text-2xs text-cds-helper">
                            <MapPin className="h-3 w-3" /> {j.location}
                          </div>
                        )}
                        {j.salary && (
                          <div className="flex items-center gap-1.5 text-2xs text-cds-helper">
                            <Banknote className="h-3 w-3" /> {j.salary}
                          </div>
                        )}
                        {j.interviewDate && (
                          <div className="flex items-center gap-1.5 text-2xs text-cds-purple">
                            <CalendarDays className="h-3 w-3" /> Interview{" "}
                            {formatDate(j.interviewDate)}
                          </div>
                        )}
                        {j.appliedDate && !j.interviewDate && (
                          <div className="flex items-center gap-1.5 text-2xs text-cds-helper">
                            <CalendarDays className="h-3 w-3" /> Applied{" "}
                            {formatDate(j.appliedDate)}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <select
                          value={j.status}
                          onChange={(e) => updateStatus(j, e.target.value)}
                          className="h-7 flex-1 border border-cds-border bg-cds-field px-1.5 text-2xs text-cds-text focus:border-cds-blue focus:outline-none"
                        >
                          {JOB_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        {j.url && (
                          <a
                            href={j.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 w-7 items-center justify-center border border-cds-border text-cds-helper hover:text-cds-link"
                            aria-label="Open posting"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit application" : "Add application"}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Company</Label>
              <Input
                value={editing.company ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, company: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Job title</Label>
              <Input
                value={editing.jobTitle ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, jobTitle: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={editing.location ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, location: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Salary</Label>
              <Input
                value={editing.salary ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, salary: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Posting URL</Label>
              <Input
                placeholder="https://hiring.cafe/…"
                value={editing.url ?? ""}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={editing.status ?? "SAVED"}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value })
                }
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div />
            <div>
              <Label>Applied date</Label>
              <Input
                type="date"
                value={editing.appliedDate?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, appliedDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Interview date</Label>
              <Input
                type="date"
                value={editing.interviewDate?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, interviewDate: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={editing.notes ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
