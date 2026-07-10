"use client";

import { Check, CircleDot, Loader2, AlertTriangle } from "lucide-react";
import type { AutoSaveEntry } from "@/hooks/use-autosave";
import { formatTime } from "@/lib/utils";

export function SaveStatus({
  entry,
  onRetry,
}: {
  entry: AutoSaveEntry;
  onRetry: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5" aria-live="polite">
      {entry.status === "dirty" && (
        <>
          <CircleDot className="h-3 w-3 text-cds-helper" /> Unsaved
        </>
      )}
      {entry.status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </>
      )}
      {entry.status === "saved" && entry.lastSavedAt && (
        <>
          <Check className="h-3 w-3 text-cds-green" /> Saved at{" "}
          {formatTime(entry.lastSavedAt)}
        </>
      )}
      {entry.status === "error" && (
        <>
          <AlertTriangle className="h-3 w-3 text-cds-red" />
          <span title={entry.error ?? undefined}>Save failed</span>
          <button
            onClick={onRetry}
            className="font-semibold text-cds-link underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </>
      )}
    </span>
  );
}
