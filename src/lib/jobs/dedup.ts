/**
 * JobDeduplicationService — pure duplicate detection. The same job
 * often appears on HiringCafe, an ATS board, and the employer site;
 * we keep ONE JobPosting and attach every source to it.
 */

export type DedupCandidate = {
  normalizedCompany: string;
  normalizedTitle: string;
  city: string | null;
  workplaceType: string;
  applicationUrl: string | null;
  sourceJobId: string | null;
  description: string;
};

// ── Similarity primitives ───────────────────────

function tokenSet(text: string, limit = 400): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3)
    .slice(0, limit);
  return new Set(tokens);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

export function descriptionSimilarity(a: string, b: string): number {
  return jaccard(tokenSet(a), tokenSet(b));
}

function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Tracking params don't identify the job.
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase() || null;
  }
}

// ── Decision ────────────────────────────────────

export const DESCRIPTION_SIMILARITY_THRESHOLD = 0.85;
export const TITLE_SIMILARITY_THRESHOLD = 0.75;

/**
 * True when `a` and `b` are the same underlying vacancy.
 * Signals, in order of strength:
 *  1. identical application URL
 *  2. same employer job id at the same company
 *  3. same company + same normalized title + compatible location
 *  4. same company + similar title + very similar description
 */
export function areDuplicates(a: DedupCandidate, b: DedupCandidate): boolean {
  const urlA = normalizeUrl(a.applicationUrl);
  const urlB = normalizeUrl(b.applicationUrl);
  if (urlA && urlB && urlA === urlB) return true;

  if (a.normalizedCompany !== b.normalizedCompany) return false;

  if (a.sourceJobId && b.sourceJobId && a.sourceJobId === b.sourceJobId) {
    return true;
  }

  const sameLocation =
    (a.city ?? "").toLowerCase() === (b.city ?? "").toLowerCase() ||
    (a.workplaceType === "REMOTE" && b.workplaceType === "REMOTE");

  if (a.normalizedTitle === b.normalizedTitle && sameLocation) return true;

  const titleSim = jaccard(tokenSet(a.normalizedTitle, 30), tokenSet(b.normalizedTitle, 30));
  if (
    titleSim >= TITLE_SIMILARITY_THRESHOLD &&
    descriptionSimilarity(a.description, b.description) >=
      DESCRIPTION_SIMILARITY_THRESHOLD
  ) {
    return true;
  }

  return false;
}

/**
 * Finds the first existing posting the candidate duplicates, or null.
 * The caller pre-filters `existing` to the same normalizedCompany
 * (indexed) so this stays O(few).
 */
export function findDuplicate<T extends DedupCandidate>(
  candidate: DedupCandidate,
  existing: T[]
): T | null {
  for (const e of existing) {
    if (areDuplicates(candidate, e)) return e;
  }
  return null;
}
