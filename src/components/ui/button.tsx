import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-cds-blue text-white hover:bg-cds-blue-hover",
  secondary:
    "border border-cds-border-strong text-cds-text hover:bg-cds-layer-accent",
  ghost: "text-cds-text-secondary hover:bg-cds-layer-accent hover:text-cds-text",
  danger: "bg-cds-red text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
