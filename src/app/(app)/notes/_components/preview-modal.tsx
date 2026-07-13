"use client";

import { useEffect, useRef, useState } from "react";
import {
  Eye,
  X,
  Maximize2,
  Minimize2,
  Download,
  ChevronDown,
  Clock,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { readingTimeMinutes, wordCount } from "@/lib/notes/markdown-utils";
import { exportMarkdown, exportPdf, exportWord } from "./export-note";
import { DIFFICULTY_META, STATUS_META, type Note } from "./types";

export function PreviewModal({
  open,
  note,
  onClose,
}: {
  open: boolean;
  note: Note | null;
  onClose: () => void;
}) {
  const [full, setFull] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setFull(false);
      setExportOpen(false);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Close the export menu on outside click.
  useEffect(() => {
    if (!exportOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [exportOpen]);

  if (!open || !note) return null;

  const exportActions = [
    { label: "Markdown (.md)", run: () => exportMarkdown(note) },
    {
      label: "Word (.doc)",
      run: () => exportWord(note, bodyRef.current?.innerHTML ?? ""),
    },
    { label: "PDF (print)", run: () => exportPdf() },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8 print:static print:block print:bg-transparent print:p-0">
      <div
        className="absolute inset-0 print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Note preview"
        className={cn(
          "relative z-10 flex animate-fade-in flex-col border border-cds-border bg-cds-layer shadow-2xl print:h-auto print:w-full print:border-0 print:shadow-none",
          full
            ? "h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)]"
            : "h-[85dvh] w-full max-w-4xl"
        )}
      >
        <div className="flex items-center justify-between border-b border-cds-border px-6 py-3 print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Eye className="h-4 w-4 shrink-0 text-cds-blue" />
            <span className="truncate text-sm font-semibold text-cds-text">
              {note.title || "Untitled"}
            </span>
            <span className="hidden text-2xs text-cds-helper sm:inline">
              · Preview
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((o) => !o)}
                aria-expanded={exportOpen}
                className="flex h-8 items-center gap-1.5 px-2.5 text-xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
              >
                <Download className="h-3.5 w-3.5" /> Export
                <ChevronDown className="h-3 w-3" />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-20 min-w-44 border border-cds-border bg-cds-layer shadow-lg">
                  {exportActions.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => {
                        setExportOpen(false);
                        a.run();
                      }}
                      className="block w-full px-3 py-2 text-left text-xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setFull((f) => !f)}
              aria-label={full ? "Exit full screen" : "Full screen"}
              title={full ? "Exit full screen" : "Full screen"}
              className="flex h-8 w-8 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
            >
              {full ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onClose}
              aria-label="Close preview"
              title="Close"
              className="flex h-8 w-8 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="print-area min-h-0 flex-1 overflow-y-auto print:overflow-visible">
          <div ref={bodyRef} className="mx-auto max-w-3xl px-8 py-8">
            <h1 className="mb-1 text-3xl font-semibold tracking-tight text-cds-text">
              {note.title || "Untitled"}
            </h1>
            {note.summary && (
              <p className="mb-2 text-sm italic text-cds-text-secondary">
                {note.summary}
              </p>
            )}
            <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-cds-border pb-4 text-2xs text-cds-helper">
              <Badge tone={STATUS_META[note.status].tone}>
                {STATUS_META[note.status].label}
              </Badge>
              {note.difficulty && (
                <Badge tone={DIFFICULTY_META[note.difficulty].tone}>
                  {DIFFICULTY_META[note.difficulty].label}
                </Badge>
              )}
              {note.category && (
                <span className="text-cds-link">{note.category.name}</span>
              )}
              {note.folder && <span>{note.folder.name}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {readingTimeMinutes(note.content)} min read ·{" "}
                {wordCount(note.content)} words
              </span>
              <span>Updated {formatDate(note.updatedAt)}</span>
            </div>
            <Markdown>{note.content}</Markdown>
          </div>
        </div>
      </div>
    </div>
  );
}
