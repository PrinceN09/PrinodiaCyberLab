"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ShieldHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, isActive, sectionForPath } from "@/lib/nav";
import { SignOutButton } from "@/components/shell/sign-out-button";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar({
  user,
}: {
  user?: { name: string; role: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const displayName = user?.name ?? "Prince Ntunka";
  const displayRole = user?.role ?? "SOC Analyst (in training)";

  // Keep the active section expanded across navigation without
  // collapsing sections the user opened manually.
  useEffect(() => {
    const active = sectionForPath(pathname);
    if (active) setOpen((prev) => ({ ...prev, [active]: true }));
  }, [pathname]);

  function toggle(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside
      data-sidebar
      className="relative z-30 hidden h-full w-64 shrink-0 flex-col border-r border-cds-border bg-cds-bg transition-[margin-left] duration-200 ease-in-out motion-reduce:transition-none md:flex"
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-cds-border px-5">
        <div className="flex h-7 w-7 items-center justify-center bg-cds-blue">
          <ShieldHalf className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="text-sm font-semibold tracking-tight text-cds-text">
          Prinodia<span className="text-cds-blue"> CyberLab</span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto py-3">
        {NAV.map((section) => {
          const Icon = section.icon;

          // Top-level single link (Dashboard)
          if (section.href && !section.children) {
            const active = isActive(pathname, section.href);
            return (
              <Link
                key={section.id}
                href={section.href}
                className={cn(
                  "relative mx-2 flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-cds-layer-accent text-cds-text"
                    : "text-cds-text-secondary hover:bg-cds-layer hover:text-cds-text"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-0 h-full w-0.5 bg-cds-blue" />
                )}
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {section.label}
              </Link>
            );
          }

          const expanded =
            open[section.id] ?? sectionForPath(pathname) === section.id;
          const sectionHasActive = section.children?.some((c) =>
            isActive(pathname, c.href)
          );

          return (
            <div key={section.id} className="mb-0.5">
              <button
                onClick={() => toggle(section.id)}
                aria-expanded={expanded}
                className={cn(
                  "mx-2 flex w-[calc(100%-1rem)] items-center gap-3 px-3 py-2 text-sm transition-colors",
                  sectionHasActive
                    ? "text-cds-text"
                    : "text-cds-text-secondary hover:bg-cds-layer hover:text-cds-text"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1 text-left font-medium">
                  {section.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-cds-helper transition-transform duration-200",
                    expanded ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>

              {expanded && (
                <ul className="mb-1 mt-0.5 animate-fade-in">
                  {section.children!.map((leaf) => {
                    const active = isActive(pathname, leaf.href);
                    const LeafIcon = leaf.icon;
                    return (
                      <li key={leaf.href}>
                        <Link
                          href={leaf.href}
                          className={cn(
                            "relative mx-2 flex items-center gap-2.5 py-1.5 pl-9 pr-3 text-[0.8125rem] transition-colors",
                            active
                              ? "bg-cds-layer-accent text-cds-text"
                              : "text-cds-text-secondary hover:bg-cds-layer hover:text-cds-text"
                          )}
                        >
                          {active && (
                            <span className="absolute left-0 top-0 h-full w-0.5 bg-cds-blue" />
                          )}
                          <LeafIcon
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={1.75}
                          />
                          <span className="truncate">{leaf.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-cds-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-cds-layer-accent text-xs font-semibold text-cds-text-secondary">
            {initials(displayName)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-medium text-cds-text">
              {displayName}
            </div>
            <div className="truncate text-2xs text-cds-helper">
              {displayRole}
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
