"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { jobStatusMeta } from "@/lib/career";
import { apiFetch } from "@/lib/knowledge-types";

export function SaveButton({
  postingId,
  application,
}: {
  postingId: string;
  application: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(application !== null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progressed = application !== null && application.status !== "SAVED";
  if (progressed) {
    const meta = jobStatusMeta(application.status);
    return (
      <div className="flex items-center gap-2 text-xs text-cds-helper">
        Tracked in Job Tracker: <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
    );
  }

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (saved) {
        await apiFetch(`/api/job-postings/${postingId}/save`, {
          method: "DELETE",
        });
        setSaved(false);
      } else {
        await apiFetch(`/api/job-postings/${postingId}/save`, {
          method: "POST",
        });
        setSaved(true);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        variant={saved ? "secondary" : "primary"}
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        className="w-full"
      >
        {saved ? (
          <>
            <BookmarkCheck className="h-4 w-4 text-cds-blue" /> Saved — unsave
          </>
        ) : (
          <>
            <Bookmark className="h-4 w-4" /> Save job
          </>
        )}
      </Button>
      {error && (
        <p role="alert" className="text-2xs text-cds-red">
          {error}
        </p>
      )}
    </div>
  );
}
