"use client";

import { useEffect, useMemo, useState } from "react";
import { KanbanSquare, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase } from "lucide-react";
import { TrackerDashboard } from "./dashboard";
import { KanbanBoard } from "./kanban-board";
import { ApplicationList } from "./application-list";
import { AddApplicationModal } from "./add-application-modal";
import {
  APPLICATION_STATUSES,
  isTerminal,
  statusMeta,
} from "@/lib/applications/status";
import type { AppDTO, TrackerSummaryDTO } from "./types";

const VIEW_KEY = "prinodia:tracker:view";
const PAGE_SIZE = 25;

type View = "board" | "list";
type Lifecycle = "active" | "closed" | "all";

export function TrackerClient({
  initialApps,
  summary,
}: {
  initialApps: AppDTO[];
  summary: TrackerSummaryDTO;
}) {
  const [apps, setApps] = useState<AppDTO[]>(initialApps);
  const [view, setView] = useState<View>("board");
  const [adding, setAdding] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [lifecycle, setLifecycle] = useState<Lifecycle>("active");
  const [status, setStatus] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [recruiter, setRecruiter] = useState("");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);

  // Persisted view preference.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(VIEW_KEY) : null;
    if (saved === "board" || saved === "list") setView(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  function updateStatus(id: string, next: string) {
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: next, lastActivityAt: new Date().toISOString() }
          : a
      )
    );
  }

  const filtered = useMemo(() => {
    const now = Date.now();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const todayMs = startToday.getTime();

    let rows = apps.filter((a) => {
      const closed = isTerminal(a.status);
      if (lifecycle === "active" && closed) return false;
      if (lifecycle === "closed" && !closed) return false;
      if (status && a.status !== status) return false;
      if (workplace && a.workplaceType !== workplace) return false;
      if (coverLetter === "yes" && !a.coverLetterId) return false;
      if (coverLetter === "no" && a.coverLetterId) return false;
      if (recruiter === "yes" && !a.recruiterName) return false;
      if (recruiter === "no" && a.recruiterName) return false;
      if (followUp) {
        const fu = a.followUpDate ? new Date(a.followUpDate).getTime() : null;
        if (followUp === "none" && fu) return false;
        if (followUp === "overdue" && !(fu !== null && fu < todayMs && !a.followUpCompleted))
          return false;
        if (
          followUp === "today" &&
          !(fu !== null && fu >= todayMs && fu < todayMs + 86_400_000 && !a.followUpCompleted)
        )
          return false;
        if (followUp === "upcoming" && !(fu !== null && fu >= todayMs + 86_400_000))
          return false;
      }
      if (q) {
        const hay = `${a.jobTitle} ${a.company} ${a.location ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });

    rows = rows.sort((a, b) => {
      switch (sort) {
        case "applied":
          return (dateVal(b.appliedDate) - dateVal(a.appliedDate));
        case "followUp":
          return dateVal(a.followUpDate, Infinity) - dateVal(b.followUpDate, Infinity);
        case "match":
          return (b.matchScore ?? -1) - (a.matchScore ?? -1);
        case "company":
          return a.company.localeCompare(b.company);
        case "status":
          return statusMeta(a.status).order - statusMeta(b.status).order;
        case "interview":
          return dateVal(a.nextInterviewAt, Infinity) - dateVal(b.nextInterviewAt, Infinity);
        case "updated":
        default:
          return dateVal(b.updatedAt) - dateVal(a.updatedAt);
      }
    });
    void now;
    return rows;
  }, [apps, q, lifecycle, status, workplace, followUp, coverLetter, recruiter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );
  useEffect(() => setPage(1), [q, lifecycle, status, workplace, followUp, coverLetter, recruiter, sort, view]);

  return (
    <div className="mx-auto max-w-8xl space-y-5 px-6 py-6 lg:px-8">
      <TrackerDashboard summary={summary} />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 border border-cds-border bg-cds-layer p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-cds-helper" aria-hidden="true" />
            <Input
              aria-label="Search applications"
              placeholder="Search title, company, location"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-56 pl-8"
            />
          </div>
          <FilterSelect label="Lifecycle" value={lifecycle} onChange={(v) => setLifecycle(v as Lifecycle)}>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </FilterSelect>
          <FilterSelect label="Status" value={status} onChange={setStatus}>
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusMeta(s).label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Workplace" value={workplace} onChange={setWorkplace}>
            <option value="">Any workplace</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ON_SITE">On-site</option>
          </FilterSelect>
          <FilterSelect label="Follow-up" value={followUp} onChange={setFollowUp}>
            <option value="">Any follow-up</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">None set</option>
          </FilterSelect>
          <FilterSelect label="Cover letter" value={coverLetter} onChange={setCoverLetter}>
            <option value="">Cover letter: any</option>
            <option value="yes">Has cover letter</option>
            <option value="no">No cover letter</option>
          </FilterSelect>
          <FilterSelect label="Recruiter" value={recruiter} onChange={setRecruiter}>
            <option value="">Recruiter: any</option>
            <option value="yes">Has recruiter</option>
            <option value="no">No recruiter</option>
          </FilterSelect>
          {view === "list" && (
            <FilterSelect label="Sort" value={sort} onChange={setSort}>
              <option value="updated">Recently updated</option>
              <option value="applied">Application date</option>
              <option value="followUp">Follow-up date</option>
              <option value="match">Match score</option>
              <option value="company">Company</option>
              <option value="status">Status stage</option>
              <option value="interview">Interview date</option>
            </FilterSelect>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex border border-cds-border" role="group" aria-label="View">
            <button
              onClick={() => setView("board")}
              aria-pressed={view === "board"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                view === "board" ? "bg-cds-blue text-white" : "text-cds-text-secondary hover:bg-cds-layer-accent"
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" aria-hidden="true" /> Board
            </button>
            <button
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                view === "list" ? "bg-cds-blue text-white" : "text-cds-text-secondary hover:bg-cds-layer-accent"
              }`}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" /> List
            </button>
          </div>
          <Button onClick={() => setAdding(true)} className="h-9">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </Button>
        </div>
      </div>

      {/* Views */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applications match your filters"
          description="Save a role from job discovery, or add one manually to start tracking."
          action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add application</Button>}
        />
      ) : view === "board" ? (
        <KanbanBoard apps={filtered} onStatusChange={updateStatus} />
      ) : (
        <>
          <ApplicationList apps={pageRows} onStatusChange={updateStatus} />
          {pageCount > 1 && (
            <div className="flex items-center justify-between text-xs text-cds-text-secondary">
              <span>
                {filtered.length} application{filtered.length === 1 ? "" : "s"} · page {page} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="h-8"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  className="h-8"
                  disabled={page === pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddApplicationModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(a) => setApps((prev) => [a, ...prev])}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <label className="sr-only">{label}</label>
      <Select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-auto border border-cds-border"
      >
        {children}
      </Select>
    </>
  );
}

function dateVal(iso: string | null, fallback = 0): number {
  return iso ? new Date(iso).getTime() : fallback;
}
