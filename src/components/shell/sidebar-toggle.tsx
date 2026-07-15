"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/components/shell/sidebar-context";

/**
 * Circular toggle that sits on the sidebar/workspace divider. It is
 * `position: fixed` so it never scrolls with <main>, and its horizontal
 * position is driven by the `data-sidebar-hidden` attribute (see globals.css):
 * centered on the 16rem divider when the sidebar is visible, pinned to the
 * far-left edge when hidden. Only shown at `md+`, where the sidebar exists.
 */
export function SidebarToggle() {
  const { hidden, toggle } = useSidebar();

  return (
    <button
      type="button"
      data-sidebar-toggle
      onClick={toggle}
      aria-label={hidden ? "Show sidebar" : "Hide sidebar"}
      aria-expanded={!hidden}
      title={hidden ? "Show sidebar" : "Hide sidebar"}
      className="fixed top-[4.25rem] z-40 hidden h-7 w-7 items-center justify-center rounded-full border border-cds-border bg-cds-bg text-cds-text-secondary shadow-sm transition-[left,background-color,color] duration-200 ease-in-out hover:bg-cds-layer hover:text-cds-text motion-reduce:transition-none md:flex"
    >
      {hidden ? (
        <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
