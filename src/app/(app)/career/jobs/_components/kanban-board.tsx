"use client";

import { useState } from "react";
import { ApplicationCard } from "./application-card";
import { BOARD_COLUMNS, boardColumnFor, statusMeta } from "@/lib/applications/status";
import { canTransition } from "@/lib/applications/transitions";
import type { AppDTO } from "./types";

/**
 * Recruitment pipeline board. Each column is a stage. Status changes
 * work via the accessible per-card control (keyboard-friendly); drag
 * and drop is an optional convenience layered on top, never required.
 */
export function KanbanBoard({
  apps,
  onStatusChange,
}: {
  apps: AppDTO[];
  onStatusChange: (id: string, status: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const byColumn = new Map<string, AppDTO[]>();
  for (const col of BOARD_COLUMNS) byColumn.set(col, []);
  for (const app of apps) {
    const col = boardColumnFor(app.status);
    if (col) byColumn.get(col)!.push(app);
  }

  function onDrop(col: string) {
    const id = dragId;
    setOverCol(null);
    setDragId(null);
    if (!id) return;
    const app = apps.find((a) => a.id === id);
    if (!app || app.status === col) return;
    if (!canTransition(app.status, col)) return; // board only does normal moves
    onStatusChange(id, col);
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-3">
        {BOARD_COLUMNS.map((col) => {
          const items = byColumn.get(col) ?? [];
          const meta = statusMeta(col);
          const isOver = overCol === col;
          return (
            <section
              key={col}
              aria-label={`${meta.label} column`}
              className={`flex w-72 shrink-0 flex-col border ${
                isOver ? "border-cds-blue bg-cds-blue/5" : "border-cds-border bg-cds-bg"
              }`}
              onDragOver={(e) => {
                if (dragId) {
                  e.preventDefault();
                  setOverCol(col);
                }
              }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={() => onDrop(col)}
            >
              <header className="flex items-center justify-between border-b border-cds-border px-3 py-2.5">
                <span className="text-xs font-semibold text-cds-text">
                  {meta.label}
                </span>
                <span className="min-w-[1.25rem] bg-cds-layer-accent px-1.5 py-0.5 text-center text-2xs tabular-nums text-cds-helper">
                  {items.length}
                </span>
              </header>
              <div className="flex min-h-[6rem] flex-1 flex-col gap-2 p-2">
                {items.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    draggable
                    onDragStart={() => setDragId(app.id)}
                    onChanged={({ status }) => onStatusChange(app.id, status)}
                  />
                ))}
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-2xs text-cds-helper">
                    Nothing here yet
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
