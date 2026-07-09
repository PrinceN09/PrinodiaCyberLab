import { cn } from "@/lib/utils";

type Tone =
  | "blue"
  | "gray"
  | "green"
  | "yellow"
  | "red"
  | "orange"
  | "purple"
  | "cyan"
  | "teal"
  | "magenta";

const tones: Record<Tone, string> = {
  blue: "border-cds-blue/40 bg-cds-blue/10 text-cds-link",
  gray: "border-cds-border-strong/50 bg-cds-layer-accent text-cds-text-secondary",
  green: "border-cds-green/40 bg-cds-green/10 text-cds-green",
  yellow: "border-cds-yellow/40 bg-cds-yellow/10 text-cds-yellow",
  red: "border-cds-red/40 bg-cds-red/10 text-cds-red",
  orange: "border-cds-orange/40 bg-cds-orange/10 text-cds-orange",
  purple: "border-cds-purple/40 bg-cds-purple/10 text-cds-purple",
  cyan: "border-cds-cyan/40 bg-cds-cyan/10 text-cds-cyan",
  teal: "border-cds-teal/40 bg-cds-teal/10 text-cds-teal",
  magenta: "border-cds-magenta/40 bg-cds-magenta/10 text-cds-magenta",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-0.5 text-2xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export type { Tone };
