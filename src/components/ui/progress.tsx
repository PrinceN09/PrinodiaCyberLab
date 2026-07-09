import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  tone = "blue",
}: {
  value: number;
  className?: string;
  tone?: "blue" | "green" | "yellow";
}) {
  const color =
    tone === "green"
      ? "bg-cds-green"
      : tone === "yellow"
      ? "bg-cds-yellow"
      : "bg-cds-blue";
  return (
    <div className={cn("h-1 w-full bg-cds-layer-accent", className)}>
      <div
        className={cn("h-full transition-all", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
