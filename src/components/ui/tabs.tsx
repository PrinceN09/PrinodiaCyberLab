"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { value: string; label: string; count?: number }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-0 border-b border-cds-border">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 text-sm transition-colors",
            active === t.value
              ? "text-cds-text"
              : "text-cds-text-secondary hover:text-cds-text"
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cn(
                "min-w-[1.25rem] px-1 py-0.5 text-2xs tabular-nums",
                active === t.value
                  ? "bg-cds-blue/15 text-cds-link"
                  : "bg-cds-layer-accent text-cds-helper"
              )}
            >
              {t.count}
            </span>
          )}
          {active === t.value && (
            <span className="absolute bottom-0 left-0 h-0.5 w-full bg-cds-blue" />
          )}
        </button>
      ))}
    </div>
  );
}
