"use client";

import { useState } from "react";
import { Plus, Save, Trash2, Printer, FileText as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/input";
import { cn, relativeTime } from "@/lib/utils";
import { RESUME_ROLES } from "@/lib/career";

type Experience = { role: string; org: string; period: string; bullets: string[] };
type Education = { school: string; detail: string; period: string };
type ResumeContent = {
  fullName?: string;
  title?: string;
  email?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Experience[];
  education?: Education[];
  certifications?: string[];
};
type Resume = {
  id: string;
  title: string;
  targetRole: string;
  content: ResumeContent;
  updatedAt: string;
};

export function ResumeClient({ initialResumes }: { initialResumes: Resume[] }) {
  const [resumes, setResumes] = useState<Resume[]>(initialResumes);
  const [activeId, setActiveId] = useState<string | null>(
    initialResumes[0]?.id ?? null
  );
  const [saving, setSaving] = useState(false);

  const active = resumes.find((r) => r.id === activeId) ?? null;

  function patchActive(patch: Partial<Resume>) {
    if (!active) return;
    setResumes((prev) =>
      prev.map((r) => (r.id === active.id ? { ...r, ...patch } : r))
    );
  }
  function patchContent(patch: Partial<ResumeContent>) {
    if (!active) return;
    patchActive({ content: { ...active.content, ...patch } });
  }

  async function createResume() {
    const res = await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New resume",
        targetRole: "SOC Analyst",
        content: {
          fullName: "Prince Ntunka",
          title: "SOC Analyst",
          email: "princentunka09@gmail.com",
          location: "Remote",
          summary: "",
          skills: [],
          experience: [],
          education: [],
          certifications: [],
        },
      }),
    });
    if (res.ok) {
      const r = await res.json();
      setResumes([r, ...resumes]);
      setActiveId(r.id);
    }
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    await fetch(`/api/resumes/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: active.title,
        targetRole: active.targetRole,
        content: active.content,
      }),
    });
    setSaving(false);
  }

  async function remove(id: string) {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    if (activeId === id) setActiveId(resumes.find((r) => r.id !== id)?.id ?? null);
    await fetch(`/api/resumes/${id}`, { method: "DELETE" });
  }

  const c = active?.content ?? {};

  return (
    <div className="flex h-[calc(100vh-8.5rem)]">
      {/* Resume list */}
      <div className="flex w-64 shrink-0 flex-col border-r border-cds-border bg-cds-bg">
        <div className="border-b border-cds-border p-4">
          <Button variant="primary" className="w-full" onClick={createResume}>
            <Plus className="h-4 w-4" /> New resume
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {resumes.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveId(r.id)}
              className={cn(
                "group flex w-full items-start gap-2 border-b border-cds-border px-4 py-3 text-left transition-colors",
                activeId === r.id ? "bg-cds-layer-accent" : "hover:bg-cds-layer"
              )}
            >
              <FileIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cds-helper" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-cds-text">
                  {r.title}
                </div>
                <div className="text-2xs text-cds-helper">{r.targetRole}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <div className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-cds-border">
          {/* Editor */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-cds-border px-5 py-2.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                Editor
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => remove(active.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="primary" onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Resume name</Label>
                  <Input
                    value={active.title}
                    onChange={(e) => patchActive({ title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Target role</Label>
                  <Select
                    value={active.targetRole}
                    onChange={(e) => patchActive({ targetRole: e.target.value })}
                  >
                    {RESUME_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full name</Label>
                  <Input
                    value={c.fullName ?? ""}
                    onChange={(e) => patchContent({ fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Headline / title</Label>
                  <Input
                    value={c.title ?? ""}
                    onChange={(e) => patchContent({ title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={c.email ?? ""}
                    onChange={(e) => patchContent({ email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={c.location ?? ""}
                    onChange={(e) => patchContent({ location: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Professional summary</Label>
                <Textarea
                  rows={4}
                  value={c.summary ?? ""}
                  onChange={(e) => patchContent({ summary: e.target.value })}
                />
              </div>

              <div>
                <Label>Skills (comma-separated)</Label>
                <Input
                  value={(c.skills ?? []).join(", ")}
                  onChange={(e) =>
                    patchContent({
                      skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <Label>Certifications (comma-separated)</Label>
                <Input
                  value={(c.certifications ?? []).join(", ")}
                  onChange={(e) =>
                    patchContent({
                      certifications: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              {/* Experience */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="mb-0">Experience</Label>
                  <button
                    className="text-2xs text-cds-link hover:underline"
                    onClick={() =>
                      patchContent({
                        experience: [
                          ...(c.experience ?? []),
                          { role: "", org: "", period: "", bullets: [""] },
                        ],
                      })
                    }
                  >
                    + Add role
                  </button>
                </div>
                <div className="space-y-3">
                  {(c.experience ?? []).map((exp, i) => (
                    <div
                      key={i}
                      className="space-y-2 border border-cds-border bg-cds-bg p-3"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Role"
                          value={exp.role}
                          onChange={(e) => {
                            const next = [...(c.experience ?? [])];
                            next[i] = { ...exp, role: e.target.value };
                            patchContent({ experience: next });
                          }}
                        />
                        <Input
                          placeholder="Organization"
                          value={exp.org}
                          onChange={(e) => {
                            const next = [...(c.experience ?? [])];
                            next[i] = { ...exp, org: e.target.value };
                            patchContent({ experience: next });
                          }}
                        />
                        <Input
                          placeholder="Period"
                          value={exp.period}
                          onChange={(e) => {
                            const next = [...(c.experience ?? [])];
                            next[i] = { ...exp, period: e.target.value };
                            patchContent({ experience: next });
                          }}
                        />
                      </div>
                      <Textarea
                        rows={3}
                        placeholder="One bullet per line"
                        value={exp.bullets.join("\n")}
                        onChange={(e) => {
                          const next = [...(c.experience ?? [])];
                          next[i] = {
                            ...exp,
                            bullets: e.target.value.split("\n"),
                          };
                          patchContent({ experience: next });
                        }}
                      />
                      <button
                        className="text-2xs text-cds-red hover:underline"
                        onClick={() =>
                          patchContent({
                            experience: (c.experience ?? []).filter(
                              (_, x) => x !== i
                            ),
                          })
                        }
                      >
                        Remove role
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="mb-0">Education</Label>
                  <button
                    className="text-2xs text-cds-link hover:underline"
                    onClick={() =>
                      patchContent({
                        education: [
                          ...(c.education ?? []),
                          { school: "", detail: "", period: "" },
                        ],
                      })
                    }
                  >
                    + Add entry
                  </button>
                </div>
                <div className="space-y-2">
                  {(c.education ?? []).map((ed, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="School"
                        value={ed.school}
                        onChange={(e) => {
                          const next = [...(c.education ?? [])];
                          next[i] = { ...ed, school: e.target.value };
                          patchContent({ education: next });
                        }}
                      />
                      <Input
                        placeholder="Detail"
                        value={ed.detail}
                        onChange={(e) => {
                          const next = [...(c.education ?? [])];
                          next[i] = { ...ed, detail: e.target.value };
                          patchContent({ education: next });
                        }}
                      />
                      <Input
                        placeholder="Period"
                        value={ed.period}
                        onChange={(e) => {
                          const next = [...(c.education ?? [])];
                          next[i] = { ...ed, period: e.target.value };
                          patchContent({ education: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-cds-border px-5 py-2.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                Export preview
              </span>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print / PDF
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto bg-cds-bg p-6">
              <div
                id="resume-print"
                className="mx-auto max-w-2xl border border-cds-border bg-cds-layer p-8"
              >
                <div className="border-b border-cds-border pb-4">
                  <h1 className="text-2xl font-bold text-cds-text">
                    {c.fullName || "Your Name"}
                  </h1>
                  <div className="mt-1 text-sm font-medium text-cds-blue">
                    {c.title || active.targetRole}
                  </div>
                  <div className="mt-1 text-xs text-cds-helper">
                    {[c.email, c.location].filter(Boolean).join("  ·  ")}
                  </div>
                </div>

                {c.summary && (
                  <section className="mt-4">
                    <h2 className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                      Summary
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-cds-text-secondary">
                      {c.summary}
                    </p>
                  </section>
                )}

                {(c.skills ?? []).length > 0 && (
                  <section className="mt-4">
                    <h2 className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                      Skills
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(c.skills ?? []).map((s) => (
                        <span
                          key={s}
                          className="border border-cds-border px-2 py-0.5 text-2xs text-cds-text-secondary"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {(c.experience ?? []).length > 0 && (
                  <section className="mt-4">
                    <h2 className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                      Experience
                    </h2>
                    <div className="mt-2 space-y-3">
                      {(c.experience ?? []).map((exp, i) => (
                        <div key={i}>
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-cds-text">
                              {exp.role}
                              {exp.org && (
                                <span className="font-normal text-cds-text-secondary">
                                  {" "}
                                  · {exp.org}
                                </span>
                              )}
                            </span>
                            <span className="text-2xs text-cds-helper">
                              {exp.period}
                            </span>
                          </div>
                          <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            {exp.bullets
                              .filter(Boolean)
                              .map((b, x) => (
                                <li
                                  key={x}
                                  className="text-xs leading-relaxed text-cds-text-secondary"
                                >
                                  {b}
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {(c.education ?? []).length > 0 && (
                  <section className="mt-4">
                    <h2 className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                      Education
                    </h2>
                    <div className="mt-2 space-y-1.5">
                      {(c.education ?? []).map((ed, i) => (
                        <div
                          key={i}
                          className="flex items-baseline justify-between"
                        >
                          <span className="text-sm text-cds-text">
                            {ed.school}
                            {ed.detail && (
                              <span className="text-cds-text-secondary">
                                {" "}
                                — {ed.detail}
                              </span>
                            )}
                          </span>
                          <span className="text-2xs text-cds-helper">
                            {ed.period}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {(c.certifications ?? []).length > 0 && (
                  <section className="mt-4">
                    <h2 className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
                      Certifications
                    </h2>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                      {(c.certifications ?? []).map((cert) => (
                        <li
                          key={cert}
                          className="text-xs text-cds-text-secondary"
                        >
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
              <p className="mx-auto mt-3 max-w-2xl text-2xs text-cds-helper">
                Last edited {relativeTime(active.updatedAt)} · Use Print / PDF and
                choose “Save as PDF” for an export-ready copy.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-cds-helper">
          Create your first resume to begin.
        </div>
      )}
    </div>
  );
}
