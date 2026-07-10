"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  Loader2,
  FileText,
  FileArchive,
  FileImage,
  File as FileIcon,
  ExternalLink,
  Upload,
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { KnowledgePicker } from "@/components/knowledge-picker";
import { cn, formatBytes, relativeTime } from "@/lib/utils";
import { extractHeadings } from "@/lib/notes/markdown-utils";
import { MODULE_ROUTES } from "@/lib/knowledge-types";
import {
  apiFetch,
  LINK_TYPE_META,
  type AttachmentMeta,
  type NoteLink,
  type NoteLinkType,
} from "./types";

// ── Table of contents ───────────────────────────

export function TocPanel({
  content,
  onJump,
}: {
  content: string;
  onJump: (offset: number) => void;
}) {
  const headings = useMemo(() => extractHeadings(content), [content]);

  if (headings.length === 0) {
    return (
      <RailEmpty>
        Add <code className="font-mono"># headings</code> to build the outline.
      </RailEmpty>
    );
  }

  return (
    <nav aria-label="Table of contents" className="py-2">
      {headings.map((h, i) => (
        <button
          key={`${h.id}-${i}`}
          onClick={() => onJump(h.offset)}
          className={cn(
            "block w-full truncate py-1.5 pr-3 text-left text-xs text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text",
            h.depth === 1 && "pl-3 font-medium text-cds-text",
            h.depth === 2 && "pl-6",
            h.depth === 3 && "pl-9 text-cds-helper"
          )}
        >
          {h.text}
        </button>
      ))}
    </nav>
  );
}

// ── Related knowledge ───────────────────────────

function useNoteResource<T>(noteId: string, path: string) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setItems(await apiFetch<T[]>(`/api/notes/${noteId}/${path}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [noteId, path]);

  useEffect(() => {
    setItems(null);
    void reload();
  }, [reload]);

  return { items, error, reload, setItems };
}

export function RelatedPanel({
  noteId,
  onOpenNote,
}: {
  noteId: string;
  onOpenNote: (id: string) => void;
}) {
  const { items: links, error, reload, setItems } = useNoteResource<NoteLink>(
    noteId,
    "links"
  );
  const [addOpen, setAddOpen] = useState(false);

  const grouped = useMemo(() => {
    const g = new Map<NoteLinkType, NoteLink[]>();
    for (const l of links ?? []) {
      g.set(l.targetType, [...(g.get(l.targetType) ?? []), l]);
    }
    return g;
  }, [links]);

  async function removeLink(link: NoteLink) {
    setItems((prev) => (prev ?? []).filter((l) => l.id !== link.id));
    try {
      await apiFetch(`/api/notes/${noteId}/links/${link.id}`, {
        method: "DELETE",
      });
    } catch {
      void reload(); // roll back by refetching
    }
  }

  return (
    <div className="flex flex-col py-2">
      <div className="flex items-center justify-between px-3 pb-2">
        <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          Related knowledge
        </span>
        <button
          onClick={() => setAddOpen(true)}
          aria-label="Link knowledge"
          title="Link knowledge"
          className="flex h-6 w-6 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {links === null && !error && <RailLoading />}
      {error && <RailError message={error} onRetry={reload} />}
      {links?.length === 0 && (
        <RailEmpty>
          Connect this note to courses, lessons, snippets, and more.
        </RailEmpty>
      )}

      {[...grouped.entries()].map(([type, typeLinks]) => (
        <div key={type} className="mb-2">
          <div className="px-3 py-1 text-2xs text-cds-helper">
            {LINK_TYPE_META[type].plural}
          </div>
          {typeLinks.map((l) => (
            <div
              key={l.id}
              className="group flex items-center gap-1.5 px-3 py-1 text-xs text-cds-text-secondary hover:bg-cds-layer-accent"
            >
              {l.targetType === "NOTE" ? (
                <button
                  onClick={() => onOpenNote(l.targetId)}
                  className="min-w-0 flex-1 truncate text-left text-cds-link hover:underline"
                  title={l.label}
                >
                  {l.label}
                </button>
              ) : (
                <a
                  href={MODULE_ROUTES[l.targetType]}
                  className="flex min-w-0 flex-1 items-center gap-1 truncate hover:text-cds-text"
                  title={`${l.label} — open ${LINK_TYPE_META[l.targetType].label.toLowerCase()} module`}
                >
                  <span className="truncate">{l.label}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              )}
              <button
                onClick={() => removeLink(l)}
                aria-label={`Remove link to ${l.label}`}
                className="opacity-0 transition-opacity hover:text-cds-red group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ))}

      <KnowledgePicker
        open={addOpen}
        excludeNoteId={noteId}
        onClose={() => setAddOpen(false)}
        onPick={async (hit) => {
          await apiFetch(`/api/notes/${noteId}/links`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetType: hit.type,
              targetId: hit.id,
              label: hit.label,
            }),
          });
          void reload();
        }}
      />
    </div>
  );
}

// ── Attachments ─────────────────────────────────

function attachmentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("zip")) return FileArchive;
  if (mimeType === "application/pdf" || mimeType.includes("word"))
    return FileText;
  return FileIcon;
}

export function AttachmentsPanel({ noteId }: { noteId: string }) {
  const {
    items: attachments,
    error,
    reload,
    setItems,
  } = useNoteResource<AttachmentMeta>(noteId, "attachments");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const created = await apiFetch<AttachmentMeta>(
        `/api/notes/${noteId}/attachments`,
        { method: "POST", body: form }
      );
      setItems((prev) => [created, ...(prev ?? [])]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(att: AttachmentMeta) {
    setItems((prev) => (prev ?? []).filter((a) => a.id !== att.id));
    try {
      await apiFetch(`/api/attachments/${att.id}`, { method: "DELETE" });
    } catch {
      void reload();
    }
  }

  return (
    <div className="flex flex-col py-2">
      <div className="flex items-center justify-between px-3 pb-2">
        <span className="text-2xs font-semibold uppercase tracking-wider text-cds-helper">
          Attachments
        </span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Upload attachment"
          title="Upload (PDF, Word, images, ZIP, Markdown — max 25 MB)"
          className="flex h-6 w-6 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer-accent hover:text-cds-text disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.md,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>

      {uploadError && (
        <div className="mx-3 mb-2 border border-cds-red/40 bg-cds-red/10 px-2 py-1.5 text-2xs text-cds-red">
          {uploadError}
        </div>
      )}

      {attachments === null && !error && <RailLoading />}
      {error && <RailError message={error} onRetry={reload} />}
      {attachments?.length === 0 && (
        <RailEmpty>
          Attach PDFs, Word docs, screenshots, ZIPs, or Markdown files.
        </RailEmpty>
      )}

      {attachments?.map((att) => {
        const Icon = attachmentIcon(att.mimeType);
        return (
          <div
            key={att.id}
            className="group flex items-center gap-2 px-3 py-1.5 text-xs text-cds-text-secondary hover:bg-cds-layer-accent"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-cds-helper" />
            <a
              href={`/api/attachments/${att.id}`}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 flex-1 truncate hover:text-cds-link"
              title={`${att.fileName} · ${formatBytes(att.size)}`}
            >
              {att.fileName}
            </a>
            <span className="shrink-0 text-2xs text-cds-helper">
              {formatBytes(att.size)}
            </span>
            <button
              onClick={() => remove(att)}
              aria-label={`Delete ${att.fileName}`}
              className="opacity-0 transition-opacity hover:text-cds-red group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {attachments && attachments.length > 0 && (
        <div className="px-3 pt-2 text-2xs text-cds-helper">
          {attachments.length} file{attachments.length === 1 ? "" : "s"} · added{" "}
          {relativeTime(attachments[0].createdAt)}
        </div>
      )}
    </div>
  );
}

// ── Rail shell + shared bits ────────────────────

function RailLoading() {
  return (
    <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-cds-helper">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
    </div>
  );
}

function RailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-3 py-4 text-center text-xs text-cds-helper">
      {message}{" "}
      <Button variant="ghost" className="!px-2 !py-1 !text-xs" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function RailEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-6 text-center text-2xs leading-relaxed text-cds-helper">
      {children}
    </div>
  );
}

export function NoteRail({
  noteId,
  content,
  onJump,
  onOpenNote,
}: {
  noteId: string;
  content: string;
  onJump: (offset: number) => void;
  onOpenNote: (id: string) => void;
}) {
  const [tab, setTab] = useState("toc");

  return (
    <aside
      aria-label="Note panels"
      className="hidden w-72 shrink-0 flex-col border-l border-cds-border bg-cds-bg xl:flex"
    >
      <Tabs
        tabs={[
          { value: "toc", label: "Outline" },
          { value: "related", label: "Related" },
          { value: "files", label: "Files" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "toc" && <TocPanel content={content} onJump={onJump} />}
        {tab === "related" && (
          <RelatedPanel noteId={noteId} onOpenNote={onOpenNote} />
        )}
        {tab === "files" && <AttachmentsPanel noteId={noteId} />}
      </div>
    </aside>
  );
}
