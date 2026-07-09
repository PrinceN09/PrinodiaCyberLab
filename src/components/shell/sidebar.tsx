"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  NotebookText,
  Code2,
  Workflow,
  FolderKanban,
  FileWarning,
  GraduationCap,
  Library,
  Settings,
  ShieldHalf,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { section: "Workspace", items: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/notes", label: "Notes / Wiki", icon: NotebookText },
    { href: "/code", label: "Code Workspace", icon: Code2 },
    { href: "/diagrams", label: "Diagrams", icon: Workflow },
  ]},
  { section: "Operations", items: [
    { href: "/projects", label: "Cyber Projects", icon: FolderKanban },
    { href: "/reports", label: "Reports", icon: FileWarning },
  ]},
  { section: "Growth", items: [
    { href: "/progress", label: "Learning Progress", icon: GraduationCap },
    { href: "/resources", label: "Resources", icon: Library },
    { href: "/settings", label: "Settings", icon: Settings },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-cds-border bg-cds-bg md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-cds-border px-5">
        <div className="flex h-7 w-7 items-center justify-center bg-cds-blue">
          <ShieldHalf className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-cds-text">
            Prinodia<span className="text-cds-blue"> CyberLab</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {nav.map((group) => (
          <div key={group.section} className="mb-5">
            <div className="px-5 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
              {group.section}
            </div>
            <ul>
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-3 px-5 py-2 text-sm transition-colors",
                        active
                          ? "bg-cds-layer-accent text-cds-text"
                          : "text-cds-text-secondary hover:bg-cds-layer hover:text-cds-text"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-0 h-full w-0.5 bg-cds-blue" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-cds-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-cds-layer-accent text-xs font-semibold text-cds-text-secondary">
            PN
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-medium text-cds-text">
              Prince Ntunka
            </div>
            <div className="truncate text-2xs text-cds-helper">
              SOC Analyst (in training)
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
