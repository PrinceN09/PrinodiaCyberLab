import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  hint?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-cds-helper" strokeWidth={1.75} />
        {href && (
          <ArrowUpRight className="h-3.5 w-3.5 text-cds-helper opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <div className="mt-6">
        <div className="text-2xl font-semibold tracking-tight text-cds-text">
          {value}
        </div>
        <div className="mt-0.5 text-xs text-cds-text-secondary">{label}</div>
        {hint && <div className="mt-0.5 text-2xs text-cds-helper">{hint}</div>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group flex flex-col justify-between bg-cds-layer p-5 transition-colors hover:bg-cds-layer-accent"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="flex flex-col justify-between bg-cds-layer p-5">{inner}</div>
  );
}
