"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  FileText,
  Handshake,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusControl } from "../_components/status-control";
import { AttentionPill, StatusBadge } from "../_components/indicators";
import { computeAttention } from "@/lib/applications/attention";
import { eventLabel } from "@/lib/applications/timeline";
import { statusMeta } from "@/lib/applications/status";

type Picker = { id: string; title: string };
// The serialized application (dates are ISO strings). Kept loose on
// purpose — the server sends the full Prisma include.
type DetailApp = Record<string, unknown> & {
  id: string;
  company: string;
  jobTitle: string;
  status: string;
};

function fmt(iso: unknown): string {
  if (!iso || typeof iso !== "string") return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function dateLocal(iso: unknown): string {
  if (!iso || typeof iso !== "string") return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function ApplicationDetailClient({
  app,
  resumes,
  coverLetters,
}: {
  app: DetailApp;
  resumes: Picker[];
  coverLetters: Picker[];
}) {
  const router = useRouter();
  const a = app;
  const interviews = (a.interviews as Record<string, unknown>[]) ?? [];
  const assessments = (a.assessments as Record<string, unknown>[]) ?? [];
  const notes = (a.appNotes as Record<string, unknown>[]) ?? [];
  const events = (a.events as Record<string, unknown>[]) ?? [];
  const offer = a.offer as Record<string, unknown> | null;
  const posting = a.jobPosting as Record<string, unknown> | null;

  const attention = computeAttention(
    {
      status: a.status,
      followUpDate: a.followUpDate ? new Date(a.followUpDate as string) : null,
      followUpCompleted: !!a.followUpCompleted,
      lastActivityAt: a.lastActivityAt ? new Date(a.lastActivityAt as string) : null,
      interviews: interviews.map((iv) => ({
        status: iv.status as string,
        when: (iv.scheduledAt ?? iv.startTime)
          ? new Date((iv.scheduledAt ?? iv.startTime) as string)
          : null,
      })),
      assessments: assessments.map((as) => ({
        status: as.status as string,
        dueDate: as.dueDate ? new Date(as.dueDate as string) : null,
      })),
      offer: offer
        ? {
            decision: offer.decision as string,
            expiryDate: offer.expiryDate ? new Date(offer.expiryDate as string) : null,
          }
        : null,
    },
    new Date()
  );

  const refresh = () => router.refresh();

  return (
    <div className="mx-auto max-w-8xl space-y-4 px-6 py-6 lg:px-8">
      {/* Status + attention header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-cds-border bg-cds-layer p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={a.status} />
          {a.source === "MANUAL" && (
            <span className="border border-cds-border px-1.5 py-0.5 text-2xs text-cds-helper">
              Manual entry
            </span>
          )}
          {attention.map((f) => (
            <AttentionPill key={f.kind} flag={f} />
          ))}
        </div>
        <StatusControl applicationId={a.id} status={a.status} onChanged={refresh} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SummarySection app={a} posting={posting} />
          <MaterialsSection
            app={a}
            resumes={resumes}
            coverLetters={coverLetters}
            onSaved={refresh}
          />
          <InterviewsSection appId={a.id} interviews={interviews} onSaved={refresh} />
          <AssessmentsSection appId={a.id} assessments={assessments} onSaved={refresh} />
          <OfferSection appId={a.id} offer={offer} onSaved={refresh} />
          <NotesSection appId={a.id} notes={notes} onSaved={refresh} />
        </div>

        <div className="space-y-4">
          <ContactsSection app={a} onSaved={refresh} />
          <FollowUpSection app={a} onSaved={refresh} />
          <TimelineSection events={events} />
        </div>
      </div>
    </div>
  );
}

// ── Summary + links ──────────────────────────────

function SummarySection({
  app,
  posting,
}: {
  app: DetailApp;
  posting: Record<string, unknown> | null;
}) {
  const rows: [string, string][] = [
    ["Workplace", labelize(app.workplaceType as string)],
    ["Employment", labelize(app.employmentType as string)],
    ["Salary", (app.salary as string) || salaryFromPosting(posting) || "—"],
    ["Match score", app.matchScore != null ? `${app.matchScore}%` : "—"],
    ["Discovered", fmt(app.discoveredAt)],
    ["Saved", fmt(app.savedAt)],
    ["Applied", fmt(app.appliedDate)],
    ["Last updated", fmt(app.updatedAt)],
  ];
  const jobUrl = (app.url as string) || (posting?.primarySourceUrl as string) || null;
  const applyUrl =
    (app.applicationUrl as string) || (posting?.applicationUrl as string) || null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application summary</CardTitle>
        <span className="inline-flex items-center gap-1 text-2xs text-cds-helper">
          <Building2 className="h-3 w-3" aria-hidden="true" /> {app.company as string}
        </span>
      </CardHeader>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-5 sm:grid-cols-4">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="text-2xs uppercase tracking-wider text-cds-helper">{k}</div>
            <div className="mt-0.5 text-sm text-cds-text">{v}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-cds-border p-4">
        {posting?.id ? (
          <LinkBtn href={`/jobs/${posting.id as string}`}>
            <FileText className="h-3.5 w-3.5" /> Job details
          </LinkBtn>
        ) : null}
        {jobUrl && (
          <LinkBtn href={jobUrl} external>
            <ExternalLink className="h-3.5 w-3.5" /> Original source
          </LinkBtn>
        )}
        {applyUrl && (
          <LinkBtn href={applyUrl} external>
            <ExternalLink className="h-3.5 w-3.5" /> Apply link
          </LinkBtn>
        )}
      </div>
    </Card>
  );
}

function LinkBtn({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex items-center gap-1.5 border border-cds-border px-3 py-1.5 text-xs text-cds-text-secondary hover:bg-cds-layer-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-cds-blue";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

// ── Materials ────────────────────────────────────

function MaterialsSection({
  app,
  resumes,
  coverLetters,
  onSaved,
}: {
  app: DetailApp;
  resumes: Picker[];
  coverLetters: Picker[];
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function set(field: "resumeId" | "coverLetterId", value: string) {
    setBusy(true);
    await fetch(`/api/applications/${app.id}/materials`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    setBusy(false);
    onSaved();
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Application materials</CardTitle>
      </CardHeader>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="mat-resume">Resume</Label>
          <Select
            id="mat-resume"
            disabled={busy}
            value={(app.resumeId as string) ?? ""}
            onChange={(e) => set("resumeId", e.target.value)}
          >
            <option value="">No resume attached</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="mat-cl">Cover letter</Label>
          <Select
            id="mat-cl"
            disabled={busy}
            value={(app.coverLetterId as string) ?? ""}
            onChange={(e) => set("coverLetterId", e.target.value)}
          >
            <option value="">No cover letter attached</option>
            {coverLetters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Card>
  );
}

// ── Contacts ─────────────────────────────────────

function ContactsSection({ app, onSaved }: { app: DetailApp; onSaved: () => void }) {
  const [form, setForm] = useState({
    recruiterName: (app.recruiterName as string) ?? "",
    recruiterTitle: (app.recruiterTitle as string) ?? "",
    recruiterCompany: (app.recruiterCompany as string) ?? "",
    recruiterEmail: (app.recruiterEmail as string) ?? "",
    recruiterPhone: (app.recruiterPhone as string) ?? "",
    hiringManagerName: (app.hiringManagerName as string) ?? "",
    hiringManagerEmail: (app.hiringManagerEmail as string) ?? "",
    contactNotes: (app.contactNotes as string) ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function upd<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) onSaved();
    else setErr((await res.json().catch(() => ({}))).error ?? "Could not save");
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
      </CardHeader>
      <div className="space-y-3 p-5">
        {err && <p role="alert" className="text-2xs text-cds-red">{err}</p>}
        <TextField label="Recruiter name" value={form.recruiterName} onChange={(v) => upd("recruiterName", v)} />
        <TextField label="Recruiter title" value={form.recruiterTitle} onChange={(v) => upd("recruiterTitle", v)} />
        <TextField label="Recruiter company" value={form.recruiterCompany} onChange={(v) => upd("recruiterCompany", v)} />
        <TextField label="Recruiter email" type="email" value={form.recruiterEmail} onChange={(v) => upd("recruiterEmail", v)} />
        <TextField label="Recruiter phone" value={form.recruiterPhone} onChange={(v) => upd("recruiterPhone", v)} />
        <TextField label="Hiring manager" value={form.hiringManagerName} onChange={(v) => upd("hiringManagerName", v)} />
        <TextField label="Hiring manager email" type="email" value={form.hiringManagerEmail} onChange={(v) => upd("hiringManagerEmail", v)} />
        <div>
          <Label htmlFor="c-notes">Other contact notes</Label>
          <Textarea id="c-notes" rows={2} value={form.contactNotes} onChange={(e) => upd("contactNotes", e.target.value)} />
        </div>
        <Button onClick={save} disabled={busy} className="h-8 w-full">
          {busy ? "Saving…" : "Save contacts"}
        </Button>
      </div>
    </Card>
  );
}

// ── Follow-up ────────────────────────────────────

function FollowUpSection({ app, onSaved }: { app: DetailApp; onSaved: () => void }) {
  const [date, setDate] = useState(dateLocal(app.followUpDate));
  const [reason, setReason] = useState((app.followUpReason as string) ?? "");
  const [notes, setNotes] = useState((app.followUpNotes as string) ?? "");
  const [busy, setBusy] = useState(false);
  const completed = !!app.followUpCompleted;

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    onSaved();
  }

  const state = followUpState(app.followUpDate, completed);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-up</CardTitle>
        {state && (
          <span className={`text-2xs font-medium ${state.tone}`}>{state.label}</span>
        )}
      </CardHeader>
      <div className="space-y-3 p-5">
        <div>
          <Label htmlFor="fu-date">Next follow-up date</Label>
          <Input id="fu-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TextField label="Reason" value={reason} onChange={setReason} />
        <div>
          <Label htmlFor="fu-notes">Notes</Label>
          <Textarea id="fu-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              save({
                followUpDate: date ? new Date(date).toISOString() : null,
                followUpReason: reason,
                followUpNotes: notes,
                followUpCompleted: false,
              })
            }
            disabled={busy}
            className="h-8 flex-1"
          >
            Save
          </Button>
          {!completed && app.followUpDate ? (
            <Button
              variant="secondary"
              className="h-8"
              disabled={busy}
              onClick={() => save({ followUpCompleted: true })}
            >
              Mark done
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

// ── Interviews ───────────────────────────────────

const INTERVIEW_TYPES = [
  "RECRUITER_SCREEN", "HR_INTERVIEW", "HIRING_MANAGER", "TECHNICAL_INTERVIEW",
  "SOC_SCENARIO", "BEHAVIOURAL", "PANEL", "EXECUTIVE", "FINAL_INTERVIEW", "OTHER",
];
const INTERVIEW_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"];

function InterviewsSection({
  appId,
  interviews,
  onSaved,
}: {
  appId: string;
  interviews: Record<string, unknown>[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  async function updateStatus(id: string, status: string) {
    await fetch(`/api/applications/${appId}/interviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onSaved();
  }
  async function remove(id: string) {
    await fetch(`/api/applications/${appId}/interviews/${id}`, { method: "DELETE" });
    onSaved();
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Interviews ({interviews.length})</CardTitle>
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </CardHeader>
      <div className="divide-y divide-cds-border/60">
        {interviews.length === 0 && (
          <p className="px-5 py-6 text-center text-xs text-cds-helper">No interviews yet.</p>
        )}
        {interviews.map((iv) => (
          <div key={iv.id as string} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-cds-text">
                {labelize(iv.type as string)}
                {iv.stage ? ` · ${iv.stage as string}` : ""}
              </div>
              <div className="mt-0.5 text-2xs text-cds-text-secondary">
                {fmt(iv.scheduledAt ?? iv.startTime)}
                {iv.locationOrLink ? ` · ${iv.locationOrLink as string}` : ""}
              </div>
              {iv.outcome ? (
                <div className="mt-1 text-2xs text-cds-text-secondary">Outcome: {iv.outcome as string}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Select
                aria-label="Interview status"
                value={iv.status as string}
                onChange={(e) => updateStatus(iv.id as string, e.target.value)}
                className="h-8 w-auto border border-cds-border text-2xs"
              >
                {INTERVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>{labelize(s)}</option>
                ))}
              </Select>
              <button
                aria-label="Delete interview"
                onClick={() => remove(iv.id as string)}
                className="p-1 text-cds-helper hover:text-cds-red"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <InterviewModal appId={appId} open={open} onClose={() => setOpen(false)} onSaved={onSaved} />
    </Card>
  );
}

function InterviewModal({
  appId,
  open,
  onClose,
  onSaved,
}: {
  appId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    type: "RECRUITER_SCREEN",
    stage: "",
    scheduledAt: "",
    startTime: "",
    endTime: "",
    timezone: "",
    locationOrLink: "",
    prepNotes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function upd<K extends keyof typeof f>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }
  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/applications/${appId}/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: f.type,
        stage: f.stage || undefined,
        scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : undefined,
        startTime: f.startTime ? new Date(f.startTime).toISOString() : undefined,
        endTime: f.endTime ? new Date(f.endTime).toISOString() : undefined,
        timezone: f.timezone || undefined,
        locationOrLink: f.locationOrLink || undefined,
        prepNotes: f.prepNotes || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setErr((await res.json().catch(() => ({}))).error ?? "Could not add interview");
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add interview"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add"}</Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p role="alert" className="text-xs text-cds-red">{err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="iv-type">Type</Label>
            <Select id="iv-type" value={f.type} onChange={(e) => upd("type", e.target.value)}>
              {INTERVIEW_TYPES.map((t) => (
                <option key={t} value={t}>{labelize(t)}</option>
              ))}
            </Select>
          </div>
          <TextField label="Stage (e.g. Round 1)" value={f.stage} onChange={(v) => upd("stage", v)} />
          <div>
            <Label htmlFor="iv-start">Start</Label>
            <Input id="iv-start" type="datetime-local" value={f.startTime} onChange={(e) => upd("startTime", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="iv-end">End</Label>
            <Input id="iv-end" type="datetime-local" value={f.endTime} onChange={(e) => upd("endTime", e.target.value)} />
          </div>
          <TextField label="Timezone" value={f.timezone} onChange={(v) => upd("timezone", v)} />
          <TextField label="Location / video link" value={f.locationOrLink} onChange={(v) => upd("locationOrLink", v)} />
        </div>
        <div>
          <Label htmlFor="iv-prep">Preparation notes</Label>
          <Textarea id="iv-prep" rows={3} value={f.prepNotes} onChange={(e) => upd("prepNotes", e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// ── Assessments ──────────────────────────────────

const ASSESSMENT_TYPES = [
  "TECHNICAL_TEST", "CODING_TEST", "CYBERSECURITY_LAB", "SOC_INVESTIGATION",
  "TAKE_HOME", "PERSONALITY", "COGNITIVE", "BACKGROUND_CHECK", "OTHER",
];
const ASSESSMENT_STATUSES = [
  "NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "PASSED", "FAILED", "EXPIRED", "CANCELLED",
];

function AssessmentsSection({
  appId,
  assessments,
  onSaved,
}: {
  appId: string;
  assessments: Record<string, unknown>[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  async function updateStatus(id: string, status: string) {
    await fetch(`/api/applications/${appId}/assessments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onSaved();
  }
  async function remove(id: string) {
    await fetch(`/api/applications/${appId}/assessments/${id}`, { method: "DELETE" });
    onSaved();
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessments ({assessments.length})</CardTitle>
        <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </CardHeader>
      <div className="divide-y divide-cds-border/60">
        {assessments.length === 0 && (
          <p className="px-5 py-6 text-center text-xs text-cds-helper">No assessments yet.</p>
        )}
        {assessments.map((as) => (
          <div key={as.id as string} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-cds-text">{as.name as string}</div>
              <div className="mt-0.5 text-2xs text-cds-text-secondary">
                {labelize(as.type as string)}
                {as.dueDate ? ` · due ${fmt(as.dueDate)}` : ""}
                {as.score ? ` · ${as.score as string}` : ""}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Select
                aria-label="Assessment status"
                value={as.status as string}
                onChange={(e) => updateStatus(as.id as string, e.target.value)}
                className="h-8 w-auto border border-cds-border text-2xs"
              >
                {ASSESSMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{labelize(s)}</option>
                ))}
              </Select>
              <button
                aria-label="Delete assessment"
                onClick={() => remove(as.id as string)}
                className="p-1 text-cds-helper hover:text-cds-red"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <AssessmentModal appId={appId} open={open} onClose={() => setOpen(false)} onSaved={onSaved} />
    </Card>
  );
}

function AssessmentModal({
  appId,
  open,
  onClose,
  onSaved,
}: {
  appId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: "", type: "TECHNICAL_TEST", provider: "", dueDate: "", link: "", notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function upd<K extends keyof typeof f>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }
  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/applications/${appId}/assessments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name,
        type: f.type,
        provider: f.provider || undefined,
        dueDate: f.dueDate ? new Date(f.dueDate).toISOString() : undefined,
        link: f.link || undefined,
        notes: f.notes || undefined,
        receivedAt: new Date().toISOString(),
      }),
    });
    setBusy(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else setErr((await res.json().catch(() => ({}))).error ?? "Could not add assessment");
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add assessment"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !f.name.trim()}>{busy ? "Adding…" : "Add"}</Button>
        </div>
      }
    >
      <div className="space-y-3">
        {err && <p role="alert" className="text-xs text-cds-red">{err}</p>}
        <TextField label="Name *" value={f.name} onChange={(v) => upd("name", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="as-type">Type</Label>
            <Select id="as-type" value={f.type} onChange={(e) => upd("type", e.target.value)}>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>{labelize(t)}</option>
              ))}
            </Select>
          </div>
          <TextField label="Provider" value={f.provider} onChange={(v) => upd("provider", v)} />
          <div>
            <Label htmlFor="as-due">Due date</Label>
            <Input id="as-due" type="date" value={f.dueDate} onChange={(e) => upd("dueDate", e.target.value)} />
          </div>
          <TextField label="Link" value={f.link} onChange={(v) => upd("link", v)} />
        </div>
        <div>
          <Label htmlFor="as-notes">Notes</Label>
          <Textarea id="as-notes" rows={2} value={f.notes} onChange={(e) => upd("notes", e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// ── Offer ────────────────────────────────────────

const OFFER_DECISIONS = ["PENDING", "ACCEPTED", "DECLINED", "NEGOTIATING"];

function OfferSection({
  appId,
  offer,
  onSaved,
}: {
  appId: string;
  offer: Record<string, unknown> | null;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    positionTitle: (offer?.positionTitle as string) ?? "",
    baseSalary: offer?.baseSalary != null ? String(offer.baseSalary) : "",
    salaryCurrency: (offer?.salaryCurrency as string) ?? "CAD",
    bonus: (offer?.bonus as string) ?? "",
    vacationDays: offer?.vacationDays != null ? String(offer.vacationDays) : "",
    remotePolicy: (offer?.remotePolicy as string) ?? "",
    startDate: dateLocal(offer?.startDate),
    expiryDate: dateLocal(offer?.expiryDate),
    receivedDate: dateLocal(offer?.receivedDate) || dateLocal(new Date().toISOString()),
    negotiationNotes: (offer?.negotiationNotes as string) ?? "",
    decision: (offer?.decision as string) ?? "PENDING",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function upd<K extends keyof typeof f>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }
  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/applications/${appId}/offer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionTitle: f.positionTitle || undefined,
        baseSalary: f.baseSalary ? Number(f.baseSalary) : null,
        salaryCurrency: f.salaryCurrency || undefined,
        bonus: f.bonus || undefined,
        vacationDays: f.vacationDays ? Number(f.vacationDays) : null,
        remotePolicy: f.remotePolicy || undefined,
        startDate: f.startDate ? new Date(f.startDate).toISOString() : null,
        expiryDate: f.expiryDate ? new Date(f.expiryDate).toISOString() : null,
        receivedDate: f.receivedDate ? new Date(f.receivedDate).toISOString() : null,
        negotiationNotes: f.negotiationNotes || undefined,
        decision: f.decision,
      }),
    });
    setBusy(false);
    if (res.ok) onSaved();
    else setErr((await res.json().catch(() => ({}))).error ?? "Could not save offer");
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            <Handshake className="h-3.5 w-3.5" aria-hidden="true" /> Offer
          </span>
        </CardTitle>
      </CardHeader>
      <div className="space-y-3 p-5">
        {err && <p role="alert" className="text-xs text-cds-red">{err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Position title" value={f.positionTitle} onChange={(v) => upd("positionTitle", v)} />
          <TextField label="Base salary" value={f.baseSalary} onChange={(v) => upd("baseSalary", v)} type="number" />
          <TextField label="Currency" value={f.salaryCurrency} onChange={(v) => upd("salaryCurrency", v)} />
          <TextField label="Bonus" value={f.bonus} onChange={(v) => upd("bonus", v)} />
          <TextField label="Vacation days" value={f.vacationDays} onChange={(v) => upd("vacationDays", v)} type="number" />
          <TextField label="Remote policy" value={f.remotePolicy} onChange={(v) => upd("remotePolicy", v)} />
          <div>
            <Label htmlFor="of-received">Received</Label>
            <Input id="of-received" type="date" value={f.receivedDate} onChange={(e) => upd("receivedDate", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="of-start">Start date</Label>
            <Input id="of-start" type="date" value={f.startDate} onChange={(e) => upd("startDate", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="of-expiry">Expiry</Label>
            <Input id="of-expiry" type="date" value={f.expiryDate} onChange={(e) => upd("expiryDate", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="of-decision">Decision</Label>
            <Select id="of-decision" value={f.decision} onChange={(e) => upd("decision", e.target.value)}>
              {OFFER_DECISIONS.map((d) => (
                <option key={d} value={d}>{labelize(d)}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="of-notes">Negotiation notes</Label>
          <Textarea id="of-notes" rows={2} value={f.negotiationNotes} onChange={(e) => upd("negotiationNotes", e.target.value)} />
        </div>
        <Button onClick={save} disabled={busy} className="h-8">
          {busy ? "Saving…" : offer ? "Update offer" : "Save offer"}
        </Button>
      </div>
    </Card>
  );
}

// ── Notes ────────────────────────────────────────

const NOTE_CATEGORIES = [
  "GENERAL", "RECRUITER", "INTERVIEW", "TECHNICAL", "FOLLOW_UP", "SALARY", "COMPANY_RESEARCH",
];

function NotesSection({
  appId,
  notes,
  onSaved,
}: {
  appId: string;
  notes: Record<string, unknown>[];
  onSaved: () => void;
}) {
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [busy, setBusy] = useState(false);
  async function add() {
    if (!body.trim()) return;
    setBusy(true);
    await fetch(`/api/applications/${appId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, category }),
    });
    setBusy(false);
    setBody("");
    onSaved();
  }
  async function remove(id: string) {
    await fetch(`/api/applications/${appId}/notes/${id}`, { method: "DELETE" });
    onSaved();
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <div className="space-y-3 p-5">
        <div className="flex gap-2">
          <Select
            aria-label="Note category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-auto border border-cds-border"
          >
            {NOTE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{labelize(c)}</option>
            ))}
          </Select>
        </div>
        <Textarea
          rows={2}
          placeholder="Add a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Note body"
        />
        <Button onClick={add} disabled={busy || !body.trim()} className="h-8">
          Add note
        </Button>
        <div className="divide-y divide-cds-border/60">
          {notes.map((n) => (
            <div key={n.id as string} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <span className="mb-1 inline-block border border-cds-border px-1.5 text-2xs text-cds-helper">
                  {labelize(n.category as string)}
                </span>
                <p className="whitespace-pre-wrap text-sm text-cds-text">{n.body as string}</p>
                <p className="mt-0.5 text-2xs text-cds-helper">{fmt(n.createdAt)}</p>
              </div>
              <button
                aria-label="Delete note"
                onClick={() => remove(n.id as string)}
                className="p-1 text-cds-helper hover:text-cds-red"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Timeline ─────────────────────────────────────

function TimelineSection({ events }: { events: Record<string, unknown>[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity timeline</CardTitle>
      </CardHeader>
      <ol className="space-y-0 p-5">
        {events.length === 0 && (
          <p className="text-xs text-cds-helper">No activity recorded yet.</p>
        )}
        {events.map((e, i) => (
          <li key={(e.id as string) ?? i} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cds-blue" aria-hidden="true" />
              {i < events.length - 1 && <span className="w-px flex-1 bg-cds-border" aria-hidden="true" />}
            </div>
            <div className="min-w-0 pb-1">
              <div className="text-xs font-medium text-cds-text">
                {(e.summary as string) || eventLabel(e.kind as string)}
              </div>
              {e.note ? (
                <div className="mt-0.5 text-2xs text-cds-text-secondary">{e.note as string}</div>
              ) : null}
              <div className="mt-0.5 text-2xs text-cds-helper">
                {new Date(e.occurredAt as string).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ── Small shared helpers ─────────────────────────

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function labelize(v: string | null | undefined): string {
  if (!v) return "—";
  return v
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function salaryFromPosting(posting: Record<string, unknown> | null): string | null {
  if (!posting) return null;
  const min = posting.salaryMin as number | null;
  const max = posting.salaryMax as number | null;
  if (min == null && max == null) return null;
  const cur = (posting.salaryCurrency as string) ?? "$";
  return `${cur} ${min ?? "?"}–${max ?? "?"}`;
}

function followUpState(
  iso: unknown,
  completed: boolean
): { label: string; tone: string } | null {
  if (completed) return { label: "Completed", tone: "text-cds-green" };
  if (!iso || typeof iso !== "string") return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(iso);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - start.getTime()) / 86_400_000);
  if (diff < 0) return { label: "Overdue", tone: "text-cds-red" };
  if (diff === 0) return { label: "Due today", tone: "text-cds-orange" };
  return { label: "Upcoming", tone: "text-cds-text-secondary" };
}
