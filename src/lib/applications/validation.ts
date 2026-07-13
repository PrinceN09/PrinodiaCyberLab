/**
 * Input validation for the application CRM. Hand-written to match the
 * repo's existing approach (see lib/jobs/preferences.ts) — no new
 * dependency. Every validator returns a discriminated Result so routes
 * can map failures to user-safe 400s without leaking Prisma errors.
 */
import { APPLICATION_STATUSES, type ApplicationStatus } from "./status";

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; error: string };
export type Result<T> = Ok<T> | Err;

const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
const err = (error: string): Err => ({ ok: false, error });

// ── Enum value catalogs (mirror the Prisma enums) ──

export const APPLICATION_SOURCES = ["DISCOVERY", "MANUAL"] as const;
export const WORKPLACE_TYPES = [
  "REMOTE",
  "HYBRID",
  "ON_SITE",
  "UNKNOWN",
] as const;
export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "TEMPORARY",
  "INTERNSHIP",
  "COMMISSION",
  "UNKNOWN",
] as const;
export const INTERVIEW_TYPES = [
  "RECRUITER_SCREEN",
  "HR_INTERVIEW",
  "HIRING_MANAGER",
  "TECHNICAL_INTERVIEW",
  "SOC_SCENARIO",
  "BEHAVIOURAL",
  "PANEL",
  "EXECUTIVE",
  "FINAL_INTERVIEW",
  "OTHER",
] as const;
export const INTERVIEW_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
] as const;
export const ASSESSMENT_TYPES = [
  "TECHNICAL_TEST",
  "CODING_TEST",
  "CYBERSECURITY_LAB",
  "SOC_INVESTIGATION",
  "TAKE_HOME",
  "PERSONALITY",
  "COGNITIVE",
  "BACKGROUND_CHECK",
  "OTHER",
] as const;
export const ASSESSMENT_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "PASSED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;
export const OFFER_DECISIONS = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "NEGOTIATING",
] as const;
export const NOTE_CATEGORIES = [
  "GENERAL",
  "RECRUITER",
  "INTERVIEW",
  "TECHNICAL",
  "FOLLOW_UP",
  "SALARY",
  "COMPANY_RESEARCH",
] as const;

// ── Primitive field parsers ──────────────────────

function asString(
  v: unknown,
  { max = 2000, trim = true }: { max?: number; trim?: boolean } = {}
): Result<string> {
  if (typeof v !== "string") return err("Expected a string");
  const s = trim ? v.trim() : v;
  if (s.length > max) return err(`Too long (max ${max})`);
  return ok(s);
}

function asEnum<T extends string>(
  v: unknown,
  allowed: readonly T[]
): Result<T> {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) {
    return ok(v as T);
  }
  return err(`Must be one of: ${allowed.join(", ")}`);
}

function asDate(v: unknown): Result<Date> {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return ok(v);
  if (typeof v !== "string" && typeof v !== "number") {
    return err("Expected a date");
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return err("Invalid date");
  return ok(d);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function asEmail(v: unknown): Result<string> {
  const s = asString(v, { max: 200 });
  if (!s.ok) return s;
  if (s.value === "") return ok("");
  if (!EMAIL_RE.test(s.value)) return err("Invalid email address");
  return ok(s.value);
}

function asUrl(v: unknown): Result<string> {
  const s = asString(v, { max: 2000 });
  if (!s.ok) return s;
  if (s.value === "") return ok("");
  try {
    const u = new URL(s.value);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return err("URL must be http(s)");
    }
    return ok(s.value);
  } catch {
    return err("Invalid URL");
  }
}

function asInt(
  v: unknown,
  { min = -Infinity, max = Infinity }: { min?: number; max?: number } = {}
): Result<number> {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n)) {
    return err("Expected an integer");
  }
  if (n < min || n > max) return err(`Must be between ${min} and ${max}`);
  return ok(n);
}

function asNumber(
  v: unknown,
  { min = -Infinity, max = Infinity }: { min?: number; max?: number } = {}
): Result<number> {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return err("Expected a number");
  }
  if (n < min || n > max) return err(`Must be between ${min} and ${max}`);
  return ok(n);
}

function asStringArray(v: unknown, maxItems = 30): Result<string[]> {
  if (!Array.isArray(v)) return err("Expected an array");
  if (v.length > maxItems) return err(`Too many items (max ${maxItems})`);
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string" || item.length > 200) {
      return err("Array items must be short strings");
    }
    const t = item.trim();
    if (t) out.push(t);
  }
  return ok(out);
}

/** True when a body key is present and not null (i.e. an update to apply). */
function has(b: Record<string, unknown>, k: string): boolean {
  return k in b && b[k] !== undefined;
}

function obj(body: unknown): Result<Record<string, unknown>> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return err("Expected a JSON object");
  }
  return ok(body as Record<string, unknown>);
}

/** Accepts a date, an ISO string, or null/"" → null; else an error. */
function asNullableDate(v: unknown): Result<Date | null> {
  if (v === null || v === "") return ok(null);
  return asDate(v);
}

// ── Applications ─────────────────────────────────

export type ManualApplicationInput = {
  company: string;
  jobTitle: string;
  location: string | null;
  url: string | null;
  applicationUrl: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  salary: string | null;
  notes: string | null;
};

export function validateManualApplication(
  body: unknown
): Result<ManualApplicationInput> {
  const o = obj(body);
  if (!o.ok) return o;
  const b = o.value;

  const company = asString(b.company, { max: 200 });
  if (!company.ok) return err(`company: ${company.error}`);
  if (company.value === "") return err("company is required");
  const jobTitle = asString(b.jobTitle, { max: 200 });
  if (!jobTitle.ok) return err(`jobTitle: ${jobTitle.error}`);
  if (jobTitle.value === "") return err("jobTitle is required");

  const out: ManualApplicationInput = {
    company: company.value,
    jobTitle: jobTitle.value,
    location: null,
    url: null,
    applicationUrl: null,
    workplaceType: null,
    employmentType: null,
    salary: null,
    notes: null,
  };

  if (has(b, "location")) {
    const r = asString(b.location, { max: 200 });
    if (!r.ok) return err(`location: ${r.error}`);
    out.location = r.value || null;
  }
  for (const key of ["url", "applicationUrl"] as const) {
    if (has(b, key)) {
      const r = asUrl(b[key]);
      if (!r.ok) return err(`${key}: ${r.error}`);
      out[key] = r.value || null;
    }
  }
  if (has(b, "workplaceType")) {
    const r = asEnum(b.workplaceType, WORKPLACE_TYPES);
    if (!r.ok) return err(`workplaceType: ${r.error}`);
    out.workplaceType = r.value;
  }
  if (has(b, "employmentType")) {
    const r = asEnum(b.employmentType, EMPLOYMENT_TYPES);
    if (!r.ok) return err(`employmentType: ${r.error}`);
    out.employmentType = r.value;
  }
  if (has(b, "salary")) {
    const r = asString(b.salary, { max: 120 });
    if (!r.ok) return err(`salary: ${r.error}`);
    out.salary = r.value || null;
  }
  if (has(b, "notes")) {
    const r = asString(b.notes, { max: 10_000 });
    if (!r.ok) return err(`notes: ${r.error}`);
    out.notes = r.value || null;
  }
  return ok(out);
}

/** Partial application update (materials, contacts, follow-up, notes). */
export function validateApplicationUpdate(
  body: unknown
): Result<Record<string, unknown>> {
  const o = obj(body);
  if (!o.ok) return o;
  const b = o.value;
  const patch: Record<string, unknown> = {};

  const stringFields: [string, number][] = [
    ["company", 200],
    ["jobTitle", 200],
    ["location", 200],
    ["salary", 120],
    ["notes", 10_000],
    ["resumeVersion", 120],
    ["coverLetterVersion", 120],
    ["recruiterName", 200],
    ["recruiterTitle", 200],
    ["recruiterCompany", 200],
    ["recruiterPhone", 60],
    ["hiringManagerName", 200],
    ["contactNotes", 5_000],
    ["followUpReason", 500],
    ["followUpNotes", 5_000],
  ];
  for (const [key, max] of stringFields) {
    if (has(b, key)) {
      const r = asString(b[key], { max });
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value || null;
    }
  }
  for (const key of ["url", "applicationUrl"]) {
    if (has(b, key)) {
      const r = asUrl(b[key]);
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value || null;
    }
  }
  for (const key of ["recruiterEmail", "hiringManagerEmail"]) {
    if (has(b, key)) {
      const r = asEmail(b[key]);
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value || null;
    }
  }
  if (has(b, "workplaceType")) {
    const r = asEnum(b.workplaceType, WORKPLACE_TYPES);
    if (!r.ok) return err(`workplaceType: ${r.error}`);
    patch.workplaceType = r.value;
  }
  if (has(b, "employmentType")) {
    const r = asEnum(b.employmentType, EMPLOYMENT_TYPES);
    if (!r.ok) return err(`employmentType: ${r.error}`);
    patch.employmentType = r.value;
  }
  if (has(b, "followUpDate")) {
    const r = asNullableDate(b.followUpDate);
    if (!r.ok) return err(`followUpDate: ${r.error}`);
    patch.followUpDate = r.value;
  }
  if (has(b, "followUpCompleted")) {
    if (typeof b.followUpCompleted !== "boolean") {
      return err("followUpCompleted must be a boolean");
    }
    patch.followUpCompleted = b.followUpCompleted;
  }
  if (has(b, "appliedDate")) {
    const r = asNullableDate(b.appliedDate);
    if (!r.ok) return err(`appliedDate: ${r.error}`);
    patch.appliedDate = r.value;
  }
  return ok(patch);
}

// ── Interviews ───────────────────────────────────

export function validateInterviewInput(
  body: unknown,
  { partial = false }: { partial?: boolean } = {}
): Result<Record<string, unknown>> {
  const o = obj(body);
  if (!o.ok) return o;
  const b = o.value;
  const patch: Record<string, unknown> = {};

  if (has(b, "type")) {
    const r = asEnum(b.type, INTERVIEW_TYPES);
    if (!r.ok) return err(`type: ${r.error}`);
    patch.type = r.value;
  } else if (!partial) {
    patch.type = "OTHER";
  }
  if (has(b, "status")) {
    const r = asEnum(b.status, INTERVIEW_STATUSES);
    if (!r.ok) return err(`status: ${r.error}`);
    patch.status = r.value;
  }
  for (const [key, max] of [
    ["stage", 120],
    ["timezone", 60],
    ["locationOrLink", 1000],
    ["prepNotes", 10_000],
    ["questionsAsked", 10_000],
    ["reflections", 10_000],
    ["outcome", 2_000],
  ] as const) {
    if (has(b, key)) {
      const r = asString(b[key], { max });
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value || null;
    }
  }
  for (const key of ["interviewers", "technicalTopics"] as const) {
    if (has(b, key)) {
      const r = asStringArray(b[key]);
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value;
    }
  }
  for (const key of ["scheduledAt", "startTime", "endTime"] as const) {
    if (has(b, key)) {
      const r = asNullableDate(b[key]);
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value;
    }
  }
  if (has(b, "followUpRequired")) {
    if (typeof b.followUpRequired !== "boolean") {
      return err("followUpRequired must be a boolean");
    }
    patch.followUpRequired = b.followUpRequired;
  }

  // Cross-field: interview end must not precede start.
  const start = patch.startTime as Date | null | undefined;
  const end = patch.endTime as Date | null | undefined;
  if (start && end && end.getTime() < start.getTime()) {
    return err("Interview end time cannot be before the start time");
  }
  return ok(patch);
}

// ── Assessments ──────────────────────────────────

export function validateAssessmentInput(
  body: unknown,
  { partial = false }: { partial?: boolean } = {}
): Result<Record<string, unknown>> {
  const o = obj(body);
  if (!o.ok) return o;
  const b = o.value;
  const patch: Record<string, unknown> = {};

  if (has(b, "name")) {
    const r = asString(b.name, { max: 200 });
    if (!r.ok) return err(`name: ${r.error}`);
    if (r.value === "") return err("name is required");
    patch.name = r.value;
  } else if (!partial) {
    return err("name is required");
  }
  if (has(b, "type")) {
    const r = asEnum(b.type, ASSESSMENT_TYPES);
    if (!r.ok) return err(`type: ${r.error}`);
    patch.type = r.value;
  } else if (!partial) {
    patch.type = "OTHER";
  }
  if (has(b, "status")) {
    const r = asEnum(b.status, ASSESSMENT_STATUSES);
    if (!r.ok) return err(`status: ${r.error}`);
    patch.status = r.value;
  }
  for (const [key, max] of [
    ["provider", 200],
    ["score", 120],
    ["result", 500],
    ["notes", 10_000],
  ] as const) {
    if (has(b, key)) {
      const r = asString(b[key], { max });
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value || null;
    }
  }
  if (has(b, "link")) {
    const r = asUrl(b.link);
    if (!r.ok) return err(`link: ${r.error}`);
    patch.link = r.value || null;
  }
  for (const key of ["receivedAt", "dueDate", "completedAt"] as const) {
    if (has(b, key)) {
      const r = asNullableDate(b[key]);
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value;
    }
  }
  // Cross-field: due date should not precede receipt.
  const received = patch.receivedAt as Date | null | undefined;
  const due = patch.dueDate as Date | null | undefined;
  if (received && due && due.getTime() < received.getTime()) {
    return err("Assessment due date cannot be before the date received");
  }
  return ok(patch);
}

// ── Offers ───────────────────────────────────────

export function validateOfferInput(
  body: unknown
): Result<Record<string, unknown>> {
  const o = obj(body);
  if (!o.ok) return o;
  const b = o.value;
  const patch: Record<string, unknown> = {};

  for (const [key, max] of [
    ["positionTitle", 200],
    ["salaryCurrency", 8],
    ["salaryPeriod", 12],
    ["bonus", 200],
    ["equity", 200],
    ["benefitsNotes", 5_000],
    ["remotePolicy", 500],
    ["officeLocation", 200],
    ["negotiationNotes", 10_000],
  ] as const) {
    if (has(b, key)) {
      const r = asString(b[key], { max });
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value || null;
    }
  }
  if (has(b, "baseSalary")) {
    if (b.baseSalary === null || b.baseSalary === "") patch.baseSalary = null;
    else {
      const r = asNumber(b.baseSalary, { min: 0, max: 100_000_000 });
      if (!r.ok) return err(`baseSalary: ${r.error}`);
      patch.baseSalary = r.value;
    }
  }
  if (has(b, "vacationDays")) {
    if (b.vacationDays === null || b.vacationDays === "") patch.vacationDays = null;
    else {
      const r = asInt(b.vacationDays, { min: 0, max: 365 });
      if (!r.ok) return err(`vacationDays: ${r.error}`);
      patch.vacationDays = r.value;
    }
  }
  if (has(b, "decision")) {
    const r = asEnum(b.decision, OFFER_DECISIONS);
    if (!r.ok) return err(`decision: ${r.error}`);
    patch.decision = r.value;
  }
  for (const key of ["receivedDate", "startDate", "expiryDate"] as const) {
    if (has(b, key)) {
      const r = asNullableDate(b[key]);
      if (!r.ok) return err(`${key}: ${r.error}`);
      patch[key] = r.value;
    }
  }
  // Cross-field: an offer cannot expire before it was received.
  const received = patch.receivedDate as Date | null | undefined;
  const expiry = patch.expiryDate as Date | null | undefined;
  if (received && expiry && expiry.getTime() < received.getTime()) {
    return err("Offer expiry date cannot be before the date received");
  }
  return ok(patch);
}

// ── Notes ────────────────────────────────────────

export function validateNoteInput(
  body: unknown,
  { partial = false }: { partial?: boolean } = {}
): Result<{ body?: string; category?: string }> {
  const o = obj(body);
  if (!o.ok) return o;
  const b = o.value;
  const patch: { body?: string; category?: string } = {};
  if (has(b, "body")) {
    const r = asString(b.body, { max: 20_000 });
    if (!r.ok) return err(`body: ${r.error}`);
    if (r.value === "") return err("Note body cannot be empty");
    patch.body = r.value;
  } else if (!partial) {
    return err("Note body is required");
  }
  if (has(b, "category")) {
    const r = asEnum(b.category, NOTE_CATEGORIES);
    if (!r.ok) return err(`category: ${r.error}`);
    patch.category = r.value;
  }
  return ok(patch);
}

// ── Transition / reopen bodies ───────────────────

export function validateTransition(
  body: unknown
): Result<{ to: ApplicationStatus; reopen: boolean; note: string | null }> {
  const o = obj(body);
  if (!o.ok) return o;
  const b = o.value;
  const to = asEnum(b.status ?? b.to, APPLICATION_STATUSES);
  if (!to.ok) return err(`status: ${to.error}`);
  const reopen = b.reopen === true;
  let note: string | null = null;
  if (has(b, "note")) {
    const r = asString(b.note, { max: 2_000 });
    if (!r.ok) return err(`note: ${r.error}`);
    note = r.value || null;
  }
  return ok({ to: to.value, reopen, note });
}

// ── List query (pagination / filters / sort) ─────

export const APPLICATION_SORTS = [
  "updated",
  "applied",
  "followUp",
  "match",
  "company",
  "status",
  "interview",
] as const;
export type ApplicationSort = (typeof APPLICATION_SORTS)[number];

export type ApplicationListQuery = {
  status: ApplicationStatus | null;
  lifecycle: "active" | "closed" | "all";
  company: string | null;
  location: string | null;
  workplaceType: string | null;
  matchMin: number | null;
  hasCoverLetter: boolean | null;
  hasRecruiter: boolean | null;
  followUp: "overdue" | "today" | "upcoming" | "none" | null;
  q: string;
  sort: ApplicationSort;
  page: number;
  pageSize: number;
};

type ParamsLike = { get(name: string): string | null };

function clampInt(
  value: string | null,
  { min, max, fallback }: { min: number; max: number; fallback: number }
): number {
  if (value === null || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function pick<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | null {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export const APPLICATION_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function parseApplicationListQuery(
  params: ParamsLike
): ApplicationListQuery {
  const boolParam = (name: string): boolean | null => {
    const v = params.get(name);
    if (v === "true") return true;
    if (v === "false") return false;
    return null;
  };
  return {
    status: pick(params.get("status"), APPLICATION_STATUSES),
    lifecycle:
      pick(params.get("lifecycle"), ["active", "closed", "all"] as const) ??
      "active",
    company: (params.get("company") ?? "").trim().slice(0, 200) || null,
    location: (params.get("location") ?? "").trim().slice(0, 200) || null,
    workplaceType: pick(params.get("workplace"), WORKPLACE_TYPES),
    matchMin: params.get("matchMin")
      ? clampInt(params.get("matchMin"), { min: 0, max: 100, fallback: 0 }) ||
        null
      : null,
    hasCoverLetter: boolParam("hasCoverLetter"),
    hasRecruiter: boolParam("hasRecruiter"),
    followUp: pick(params.get("followUp"), [
      "overdue",
      "today",
      "upcoming",
      "none",
    ] as const),
    q: (params.get("q") ?? "").trim().slice(0, 120),
    sort: pick(params.get("sort"), APPLICATION_SORTS) ?? "updated",
    page: clampInt(params.get("page"), { min: 1, max: 100_000, fallback: 1 }),
    pageSize: clampInt(params.get("pageSize"), {
      min: 1,
      max: MAX_PAGE_SIZE,
      fallback: APPLICATION_PAGE_SIZE,
    }),
  };
}
