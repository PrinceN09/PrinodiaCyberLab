/**
 * Shared HTTP client for job-source providers.
 *
 * - Timeout per attempt
 * - Retries with exponential backoff + jitter on 429/5xx/network errors
 * - Immediate failure on other 4xx (no point retrying)
 * - Polite per-host rate limiting (serialized, minimum spacing)
 * - Identifying User-Agent
 *
 * Server-side only. Never expose tokens to the frontend; providers
 * read any credentials from process.env themselves.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message?: string
  ) {
    super(message ?? `HTTP ${status} for ${url}`);
    this.name = "HttpError";
  }
}

const USER_AGENT =
  "PrinodiaCyberLab-JobDiscovery/0.4 (personal job dashboard)";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 3;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const MIN_HOST_SPACING_MS = 500;

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** attempt → delay with full jitter, capped. */
export function backoffDelay(
  attempt: number,
  baseMs: number = BASE_BACKOFF_MS,
  maxMs: number = MAX_BACKOFF_MS
): number {
  const cap = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * cap);
}

// Serialize requests per host with minimum spacing so we never
// hammer a source, regardless of how many configs point at it.
const hostQueues = new Map<string, Promise<void>>();

async function politePause(url: string): Promise<void> {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    host = "unknown";
  }
  const previous = hostQueues.get(host) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((r) => (release = r));
  hostQueues.set(
    host,
    previous.then(() => current)
  );
  await previous;
  // Space out consecutive requests to the same host.
  setTimeout(release, MIN_HOST_SPACING_MS);
}

export type FetchJsonOptions = {
  retries?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export async function fetchJson<T>(
  url: string,
  {
    retries = DEFAULT_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers = {},
    signal,
  }: FetchJsonOptions = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw lastError ?? new Error("Aborted");
    if (attempt > 0) await sleep(backoffDelay(attempt));
    await politePause(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...headers,
        },
        signal: controller.signal,
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      // Retry on rate limiting and server errors; fail fast otherwise.
      if (res.status === 429 || res.status >= 500) {
        lastError = new HttpError(res.status, url);
        const retryAfter = Number(res.headers.get("retry-after"));
        if (!Number.isNaN(retryAfter) && retryAfter > 0) {
          await sleep(Math.min(retryAfter * 1000, MAX_BACKOFF_MS));
        }
        continue;
      }
      throw new HttpError(res.status, url);
    } catch (err) {
      if (err instanceof HttpError && err.status < 500 && err.status !== 429) {
        throw err; // non-retryable
      }
      lastError = err; // network error / timeout / 5xx → retry
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${url}`);
}

/** Decodes HTML entities (Greenhouse escapes its `content` field). */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&"); // last, so &amp;lt; decodes correctly
}
