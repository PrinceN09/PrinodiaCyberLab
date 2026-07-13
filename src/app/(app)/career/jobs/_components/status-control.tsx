"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  allowedTransitions,
  reopenTargets,
} from "@/lib/applications/transitions";
import { isTerminal, statusMeta } from "@/lib/applications/status";

/**
 * Explicit, keyboard-accessible stage change via a native <select>.
 * This is always available (drag-and-drop, where present, is an
 * additive convenience — never the only way to change status).
 */
export function StatusControl({
  applicationId,
  status,
  onChanged,
  compact = false,
}: {
  applicationId: string;
  status: string;
  onChanged: (result: { status: string }) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const terminal = isTerminal(status);
  const options = terminal ? reopenTargets() : allowedTransitions(status);

  async function change(to: string) {
    if (!to) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/applications/${applicationId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to, reopen: terminal }),
    });
    setBusy(false);
    if (res.ok) {
      onChanged({ status: to });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not change status");
    }
  }

  return (
    <div className={compact ? "" : "space-y-1"}>
      <label className="sr-only" htmlFor={`status-${applicationId}`}>
        Change status for this application
      </label>
      <div className="flex items-center gap-1.5">
        <select
          id={`status-${applicationId}`}
          className="h-8 max-w-[11rem] border border-cds-border bg-cds-field px-2 text-2xs text-cds-text focus:border-cds-blue focus:outline-none"
          value=""
          disabled={busy || options.length === 0}
          onChange={(e) => change(e.target.value)}
        >
          <option value="" disabled>
            {busy ? "Saving…" : terminal ? "Reopen to…" : "Move to…"}
          </option>
          {options.map((s) => (
            <option key={s} value={s}>
              {terminal ? "Reopen → " : ""}
              {statusMeta(s).label}
            </option>
          ))}
        </select>
        {busy && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cds-helper" aria-hidden="true" />
        )}
      </div>
      {error && (
        <p role="alert" className="text-2xs text-cds-red">
          {error}
        </p>
      )}
    </div>
  );
}
