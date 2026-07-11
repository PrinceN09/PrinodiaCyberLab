"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Select } from "@/components/ui/input";
import { JOB_MAX_AGE_DAYS } from "@/lib/jobs/eligibility";
import {
  EMPLOYMENT_META,
  SENIORITY_LABELS,
  SOURCE_LABELS,
  WORKPLACE_META,
} from "./types";

export type FilterState = {
  q: string;
  workplace: string;
  employment: string;
  seniority: string;
  province: string;
  source: string;
  salaryMin: string;
  days: string;
  sort: string;
};

export const DEFAULT_FILTERS: FilterState = {
  q: "",
  workplace: "",
  employment: "",
  seniority: "",
  province: "",
  source: "",
  salaryMin: "",
  days: String(JOB_MAX_AGE_DAYS),
  sort: "priority",
};

const PROVINCES = ["BC", "AB", "SK", "MB", "ON", "QC", "NS", "NB", "PE", "NL"];

export function filtersToParams(f: FilterState, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.workplace) params.set("workplace", f.workplace);
  if (f.employment) params.set("employment", f.employment);
  if (f.seniority) params.set("seniority", f.seniority);
  if (f.province) params.set("province", f.province);
  if (f.source) params.set("source", f.source);
  if (f.salaryMin) params.set("salaryMin", f.salaryMin);
  params.set("days", f.days);
  params.set("sort", f.sort);
  params.set("page", String(page));
  return params;
}

export function JobFilters({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const set = (key: keyof FilterState, value: string) =>
    onChange({ ...filters, [key]: value });
  const isDefault =
    JSON.stringify({ ...filters, sort: "x", days: "x" }) ===
    JSON.stringify({ ...DEFAULT_FILTERS, sort: "x", days: "x" });

  const selects = (
    <>
      <Select
        aria-label="Workplace type"
        value={filters.workplace}
        onChange={(e) => set("workplace", e.target.value)}
        className="!h-9 !text-xs"
      >
        <option value="">Workplace: all</option>
        {Object.entries(WORKPLACE_META)
          .filter(([v]) => v !== "UNKNOWN")
          .map(([v, m]) => (
            <option key={v} value={v}>
              {m.label}
            </option>
          ))}
      </Select>
      <Select
        aria-label="Employment type"
        value={filters.employment}
        onChange={(e) => set("employment", e.target.value)}
        className="!h-9 !text-xs"
      >
        <option value="">Type: all</option>
        <option value="FULL_TIME">Full-time</option>
        <option value="CONTRACT">Contract</option>
        <option value="PART_TIME">Part-time</option>
      </Select>
      <Select
        aria-label="Seniority"
        value={filters.seniority}
        onChange={(e) => set("seniority", e.target.value)}
        className="!h-9 !text-xs"
      >
        <option value="">Seniority: all</option>
        {Object.entries(SENIORITY_LABELS)
          .filter(([v]) => v !== "UNKNOWN")
          .map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
      </Select>
      <Select
        aria-label="Province"
        value={filters.province}
        onChange={(e) => set("province", e.target.value)}
        className="!h-9 !text-xs"
      >
        <option value="">Province: all</option>
        {PROVINCES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Source"
        value={filters.source}
        onChange={(e) => set("source", e.target.value)}
        className="!h-9 !text-xs"
      >
        <option value="">Source: all</option>
        {Object.entries(SOURCE_LABELS).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Posted within"
        value={filters.days}
        onChange={(e) => set("days", e.target.value)}
        className="!h-9 !text-xs"
      >
        <option value="1">Posted: today</option>
        <option value="3">Posted: 3 days</option>
        <option value="7">Posted: 7 days</option>
      </Select>
      <div>
        <label htmlFor="jobs-salary-min" className="sr-only">
          Minimum salary
        </label>
        <input
          id="jobs-salary-min"
          type="number"
          min={0}
          step={5000}
          value={filters.salaryMin}
          onChange={(e) => set("salaryMin", e.target.value)}
          placeholder="Min salary"
          className="h-9 w-full border-0 border-b border-cds-border bg-cds-field px-3 text-xs text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
        />
      </div>
      <Select
        aria-label="Sort by"
        value={filters.sort}
        onChange={(e) => set("sort", e.target.value)}
        className="!h-9 !text-xs"
      >
        <option value="priority">Sort: location priority</option>
        <option value="recent">Sort: most recent</option>
        <option value="salary">Sort: salary</option>
      </Select>
    </>
  );

  return (
    <div className="border border-cds-border bg-cds-layer p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper"
            aria-hidden="true"
          />
          <input
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search title, company, description…"
            aria-label="Search jobs"
            className="h-9 w-full border-b border-cds-border bg-cds-field pl-9 pr-3 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
          />
        </div>
        {!isDefault && (
          <button
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      {/* Wide screens: inline grid. Small screens: disclosure. */}
      <div className="mt-3 hidden grid-cols-2 gap-2 md:grid lg:grid-cols-4 xl:grid-cols-8">
        {selects}
      </div>
      <details className="mt-3 md:hidden">
        <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-cds-text-secondary">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Filters &amp; sorting
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{selects}</div>
      </details>
    </div>
  );
}
