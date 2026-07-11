"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  CalendarDays,
  Wifi,
  MapPin,
  Send,
  MessagesSquare,
  Compass,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { JobCard } from "./_components/job-card";
import {
  DEFAULT_FILTERS,
  filtersToParams,
  JobFilters,
  type FilterState,
} from "./_components/job-filters";
import { apiFetch, type JobPage, type JobPostingDto, type JobStats } from "./_components/types";

export function JobsClient({
  initialPage,
  initialStats,
}: {
  initialPage: JobPage;
  initialStats: JobStats;
}) {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<JobPage>(initialPage);
  const [stats, setStats] = useState<JobStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const load = useCallback(async (f: FilterState, p: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await apiFetch<JobPage>(
          `/api/job-postings?${filtersToParams(f, p).toString()}`
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on filter/page change (debounced for keystrokes),
  // skipping the server-rendered initial state.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(filters, page), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [filters, page, load]);

  function updateFilters(next: FilterState) {
    setFilters(next);
    setPage(1);
  }

  async function refreshStats() {
    try {
      setStats(await apiFetch<JobStats>("/api/job-postings/stats"));
    } catch {
      // non-critical
    }
  }

  function patchJob(id: string, patch: Partial<JobPostingDto>) {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    }));
  }

  async function save(job: JobPostingDto) {
    setSavingId(job.id);
    try {
      const application = await apiFetch<{ id: string; status: string }>(
        `/api/job-postings/${job.id}/save`,
        { method: "POST" }
      );
      patchJob(job.id, {
        application: application as JobPostingDto["application"],
      });
      void refreshStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the job.");
    } finally {
      setSavingId(null);
    }
  }

  async function unsave(job: JobPostingDto) {
    setSavingId(job.id);
    try {
      await apiFetch(`/api/job-postings/${job.id}/save`, { method: "DELETE" });
      patchJob(job.id, { application: null });
      void refreshStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unsave the job.");
    } finally {
      setSavingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const rangeEnd = Math.min(data.total, data.page * data.pageSize);
  const hasFilters =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="mx-auto max-w-8xl space-y-4 px-6 py-6 lg:px-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-cds-border bg-cds-border sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="New today" value={stats.newToday} icon={Sparkles} />
        <StatCard
          label="Last 7 days"
          value={stats.lastSevenDays}
          icon={CalendarDays}
        />
        <StatCard
          label="Remote Canada"
          value={stats.remoteCanada}
          icon={Wifi}
        />
        <StatCard label="Vancouver area" value={stats.vancouver} icon={MapPin} />
        <StatCard
          label="Applications in progress"
          value={stats.applicationsInProgress}
          icon={Send}
          href="/career/jobs"
        />
        <StatCard
          label="Interviews"
          value={stats.interviews}
          icon={MessagesSquare}
          href="/career/jobs"
        />
      </div>

      <JobFilters filters={filters} onChange={updateFilters} />

      {/* Result summary (screen-reader friendly) */}
      <div
        aria-live="polite"
        className="flex items-center justify-between text-xs text-cds-helper"
      >
        <span>
          {loading
            ? "Loading jobs…"
            : `Showing ${rangeStart}–${rangeEnd} of ${data.total} job${data.total === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 border border-cds-red/40 bg-cds-red/10 px-4 py-3 text-xs text-cds-red"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <Button
            variant="ghost"
            className="!ml-auto !px-2 !py-1 !text-xs"
            onClick={() => void load(filters, page)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse border border-cds-border bg-cds-layer"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.items.length === 0 && (
        <div className="border border-cds-border bg-cds-layer">
          <EmptyState
            icon={Compass}
            title={hasFilters ? "No jobs match these filters" : "No jobs discovered yet"}
            description={
              hasFilters
                ? "Try widening the posted window, clearing the salary floor, or removing a filter."
                : "Configure a source and run an ingestion to populate the last seven days of postings: npm run jobs:sources add greenhouse <board> then npm run jobs:ingest."
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => updateFilters({ ...DEFAULT_FILTERS })}
                >
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Results */}
      {!loading && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSave={save}
              onUnsave={unsave}
              saving={savingId === job.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.total > data.pageSize && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between border-t border-cds-border pt-4"
        >
          <Button
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs tabular-nums text-cds-helper">
            Page {data.page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
