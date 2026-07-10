"use client";

import { useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type AutoSaveEntry = {
  status: AutoSaveStatus;
  /** Epoch ms of the last successful save (survives later dirty/error states). */
  lastSavedAt: number | null;
  /** Human-readable message for the last failure, if any. */
  error: string | null;
};

const IDLE_ENTRY: AutoSaveEntry = {
  status: "idle",
  lastSavedAt: null,
  error: null,
};

type Patch = Record<string, unknown>;

export type SaveFn<R> = (
  id: string,
  patch: Patch,
  opts: { keepalive: boolean }
) => Promise<R>;

export type AutoSave<R> = {
  /** Merge a patch for `id` and (re)start the debounce timer. */
  queue: (id: string, patch: Patch) => void;
  /** Save any pending patch for `id` immediately (e.g. when switching notes). */
  flush: (id: string) => void;
  /** Save everything pending immediately (e.g. page hide). */
  flushAll: (opts?: { keepalive?: boolean }) => void;
  /** Re-attempt a failed save right away and reset the retry budget. */
  retry: (id: string) => void;
  /** Drop pending changes for `id` (e.g. the record was deleted). */
  discard: (id: string) => void;
  /** True when anything is pending or in flight — used for unload warnings. */
  hasUnsavedWork: () => boolean;
  /** Current status entry for `id`. */
  statusFor: (id: string) => AutoSaveEntry;
};

/**
 * Debounced, per-record auto-save with optimistic-update support.
 *
 * Design notes:
 * - Callers update local state immediately (optimistic) and hand the
 *   same patch to `queue`; this hook only manages persistence.
 * - Patches are merged per record, so rapid edits collapse into one
 *   PATCH request after `delay` ms of inactivity.
 * - One save in flight per record; edits made mid-save are kept and
 *   saved right after.
 * - Failures keep the patch, surface `status: "error"`, auto-retry
 *   with exponential backoff up to `maxAutoRetries`, and can always
 *   be retried manually via `retry`.
 * - `beforeunload` warns when work is unsaved; `pagehide` /
 *   `visibilitychange: hidden` fire a best-effort keepalive save.
 */
export function useAutoSave<R>({
  delay = 2000,
  maxAutoRetries = 3,
  save,
  onSaved,
}: {
  delay?: number;
  maxAutoRetries?: number;
  save: SaveFn<R>;
  onSaved?: (id: string, result: R) => void;
}): AutoSave<R> {
  const [entries, setEntries] = useState<Record<string, AutoSaveEntry>>({});

  // Latest callbacks/config without re-creating the controller.
  const saveRef = useRef(save);
  const onSavedRef = useRef(onSaved);
  const delayRef = useRef(delay);
  const maxRetriesRef = useRef(maxAutoRetries);
  saveRef.current = save;
  onSavedRef.current = onSaved;
  delayRef.current = delay;
  maxRetriesRef.current = maxAutoRetries;

  const controllerRef = useRef<AutoSave<R> | null>(null);
  if (!controllerRef.current) {
    const pending = new Map<string, Patch>();
    const inFlight = new Set<string>();
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const attempts = new Map<string, number>();

    const setEntry = (id: string, patch: Partial<AutoSaveEntry>) => {
      setEntries((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? IDLE_ENTRY), ...patch },
      }));
    };

    const clearTimer = (id: string) => {
      const t = timers.get(id);
      if (t !== undefined) {
        clearTimeout(t);
        timers.delete(id);
      }
    };

    const schedule = (id: string, ms: number) => {
      clearTimer(id);
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          void run(id);
        }, ms)
      );
    };

    const run = async (id: string, opts?: { keepalive?: boolean }) => {
      clearTimer(id);
      if (inFlight.has(id)) return; // finished save re-schedules if needed
      const patch = pending.get(id);
      if (!patch) return;
      pending.delete(id);
      inFlight.add(id);
      setEntry(id, { status: "saving", error: null });
      try {
        const result = await saveRef.current(id, patch, {
          keepalive: opts?.keepalive ?? false,
        });
        attempts.delete(id);
        onSavedRef.current?.(id, result);
        setEntry(id, {
          // Edits may have arrived while saving.
          status: pending.has(id) ? "dirty" : "saved",
          lastSavedAt: Date.now(),
        });
      } catch (err) {
        // Keep the failed patch, but let any newer edits win field-by-field.
        pending.set(id, { ...patch, ...(pending.get(id) ?? {}) });
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setEntry(id, { status: "error", error: message });
        const attempt = (attempts.get(id) ?? 0) + 1;
        attempts.set(id, attempt);
        if (attempt <= maxRetriesRef.current) {
          // 4s, 8s, 16s… capped at 30s.
          schedule(id, Math.min(30_000, delayRef.current * 2 ** attempt));
        }
      } finally {
        inFlight.delete(id);
        // Edits queued mid-save with no timer of their own: save soon.
        if (pending.has(id) && !timers.has(id)) schedule(id, 300);
      }
    };

    controllerRef.current = {
      queue: (id, patch) => {
        pending.set(id, { ...(pending.get(id) ?? {}), ...patch });
        attempts.delete(id); // fresh edits reset the retry budget
        setEntry(id, { status: "dirty", error: null });
        schedule(id, delayRef.current);
      },
      flush: (id) => {
        if (pending.has(id)) void run(id);
      },
      flushAll: (opts) => {
        for (const id of Array.from(pending.keys())) {
          void run(id, opts);
        }
      },
      retry: (id) => {
        attempts.delete(id);
        if (pending.has(id)) void run(id);
      },
      discard: (id) => {
        clearTimer(id);
        pending.delete(id);
        attempts.delete(id);
        setEntries((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      },
      hasUnsavedWork: () => pending.size > 0 || inFlight.size > 0,
      statusFor: () => IDLE_ENTRY, // replaced below (needs `entries`)
    };
  }

  const controller = controllerRef.current;
  // `statusFor` must read the latest state, so bind it per render.
  controller.statusFor = (id: string) => entries[id] ?? IDLE_ENTRY;

  // Save before the user leaves the page, when possible.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!controller.hasUnsavedWork()) return;
      controller.flushAll({ keepalive: true });
      e.preventDefault();
      e.returnValue = "";
    };
    const flushHidden = () => {
      if (controller.hasUnsavedWork()) {
        controller.flushAll({ keepalive: true });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushHidden();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", flushHidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", flushHidden);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [controller]);

  return controller;
}
