"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  apiFetch,
  LINK_TYPE_META,
  type KnowledgeHit,
  type NoteLinkType,
} from "@/lib/knowledge-types";

/**
 * Cross-module entity picker backed by /api/knowledge/search.
 * Used by the Notes rail and the Code workspace to create
 * knowledge-graph links.
 */
export function KnowledgePicker({
  open,
  onClose,
  onPick,
  allowedTypes,
  excludeNoteId,
  title = "Link knowledge",
}: {
  open: boolean;
  onClose: () => void;
  /** Called once per picked item; throw to mark the pick as failed. */
  onPick: (hit: KnowledgeHit) => Promise<void> | void;
  /** Restrict the type dropdown (defaults to every linkable type). */
  allowedTypes?: NoteLinkType[];
  /** Exclude a note id from NOTE results (avoid self-links). */
  excludeNoteId?: string;
  title?: string;
}) {
  const types = allowedTypes ?? (Object.keys(LINK_TYPE_META) as NoteLinkType[]);
  const [type, setType] = useState<NoteLinkType | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits(null);
      setType("ALL");
      setPickedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (excludeNoteId) params.set("exclude", excludeNoteId);
        params.set("types", type === "ALL" ? types.join(",") : type);
        setHits(
          await apiFetch<KnowledgeHit[]>(
            `/api/knowledge/search?${params.toString()}`
          )
        );
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, open, excludeNoteId]);

  async function pick(hit: KnowledgeHit) {
    const key = `${hit.type}:${hit.id}`;
    setPickedIds((prev) => new Set(prev).add(key));
    try {
      await onPick(hit);
    } catch {
      setPickedIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-[10rem_1fr] gap-3">
          <div>
            <Label htmlFor="kp-type">Type</Label>
            <Select
              id="kp-type"
              value={type}
              onChange={(e) => setType(e.target.value as NoteLinkType | "ALL")}
            >
              <option value="ALL">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {LINK_TYPE_META[t].plural}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="kp-search">Search</Label>
            <Input
              id="kp-search"
              value={q}
              autoFocus
              placeholder="Search across your workspace…"
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto border border-cds-border">
          {searching && (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-cds-helper">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          )}
          {!searching && hits?.length === 0 && (
            <div className="px-4 py-6 text-center text-2xs text-cds-helper">
              No matches. Try a different search or type.
            </div>
          )}
          {!searching &&
            hits?.map((hit) => {
              const key = `${hit.type}:${hit.id}`;
              const picked = pickedIds.has(key);
              return (
                <button
                  key={key}
                  onClick={() => !picked && pick(hit)}
                  disabled={picked}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-cds-border px-3 py-2 text-left text-sm transition-colors last:border-b-0",
                    picked
                      ? "cursor-default opacity-50"
                      : "hover:bg-cds-layer-accent"
                  )}
                >
                  <span className="w-32 shrink-0 text-2xs uppercase tracking-wider text-cds-helper">
                    {LINK_TYPE_META[hit.type].label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-cds-text">
                    {hit.label}
                  </span>
                  {hit.meta && (
                    <span className="shrink-0 text-2xs text-cds-helper">
                      {hit.meta}
                    </span>
                  )}
                  <span className="shrink-0 text-2xs text-cds-link">
                    {picked ? "Linked" : "+ Link"}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </Modal>
  );
}
