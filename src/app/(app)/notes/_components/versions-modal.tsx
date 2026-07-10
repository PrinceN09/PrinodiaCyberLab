"use client";

import { useEffect, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { apiFetch, type Note, type NoteVersionMeta } from "./types";

const CAUSE_LABELS: Record<string, string> = {
  autosave: "Auto-save",
  manual: "Manual save",
  restore: "Restore",
  "restore-backup": "Backup before restore",
};

type FullVersion = NoteVersionMeta & { content: string };

export function VersionsModal({
  open,
  noteId,
  onClose,
  onRestored,
}: {
  open: boolean;
  noteId: string | null;
  onClose: () => void;
  onRestored: (note: Note) => void;
}) {
  const [versions, setVersions] = useState<NoteVersionMeta[] | null>(null);
  const [selected, setSelected] = useState<FullVersion | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !noteId) return;
    setVersions(null);
    setSelected(null);
    setError(null);
    apiFetch<NoteVersionMeta[]>(`/api/notes/${noteId}/versions`)
      .then(setVersions)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load versions")
      );
  }, [open, noteId]);

  async function select(version: NoteVersionMeta) {
    if (!noteId) return;
    setLoadingId(version.id);
    setError(null);
    try {
      setSelected(
        await apiFetch<FullVersion>(
          `/api/notes/${noteId}/versions/${version.id}`
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load version");
    } finally {
      setLoadingId(null);
    }
  }

  async function restore() {
    if (!noteId || !selected) return;
    setRestoring(true);
    setError(null);
    try {
      const note = await apiFetch<Note>(
        `/api/notes/${noteId}/versions/${selected.id}/restore`,
        { method: "POST" }
      );
      onRestored(note);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Version history"
      wide
      footer={
        <>
          {error && (
            <span className="mr-auto text-xs text-cds-red">{error}</span>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={restore}
            disabled={!selected || restoring}
          >
            <RotateCcw className="h-4 w-4" />
            {restoring ? "Restoring…" : "Restore this version"}
          </Button>
        </>
      }
    >
      <div className="grid h-[50vh] grid-cols-[16rem_1fr] gap-0 border border-cds-border">
        <div className="overflow-y-auto border-r border-cds-border">
          {versions === null && !error && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-cds-helper">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          )}
          {versions?.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-cds-helper">
              No versions yet. A version is captured on every content change.
            </div>
          )}
          {versions?.map((v) => (
            <button
              key={v.id}
              onClick={() => select(v)}
              className={cn(
                "flex w-full flex-col gap-0.5 border-b border-cds-border px-3 py-2.5 text-left transition-colors",
                selected?.id === v.id
                  ? "bg-cds-layer-accent"
                  : "hover:bg-cds-layer"
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-cds-text">
                <History className="h-3 w-3 text-cds-helper" />
                {formatDate(v.createdAt)} · {formatTime(v.createdAt)}
                {loadingId === v.id && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </span>
              <span className="truncate text-2xs text-cds-helper">
                {CAUSE_LABELS[v.cause] ?? v.cause} · {v.title || "Untitled"}
              </span>
            </button>
          ))}
        </div>
        <div className="overflow-y-auto p-5">
          {selected ? (
            <Markdown>{selected.content}</Markdown>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-cds-helper">
              Select a version to preview it.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
