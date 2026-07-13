"use client";

import { Search, Bell, Command, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Topbar() {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-cds-border bg-cds-bg px-5">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cds-helper" />
        <input
          type="text"
          placeholder="Search notes, snippets, reports…"
          className="h-9 w-full border-b border-cds-border bg-cds-layer pl-9 pr-16 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-2xs text-cds-helper">
          <Command className="h-3 w-3" /> K
        </span>
      </div>

      <div className="flex items-center gap-1">
        <div className="mr-3 hidden items-center gap-1.5 border border-cds-border px-2.5 py-1 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-cds-green" />
          <span className="text-2xs font-medium text-cds-text-secondary">
            Lab environment · secure
          </span>
        </div>
        <ThemeToggle />
        <button
          className="flex h-9 w-9 items-center justify-center text-cds-text-secondary transition-colors hover:bg-cds-layer hover:text-cds-text"
          aria-label="Notifications"
        >
          <span className="relative">
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 bg-cds-blue" />
          </span>
        </button>
      </div>
    </header>
  );
}
