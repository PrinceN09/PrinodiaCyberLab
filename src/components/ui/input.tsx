import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full border-0 border-b border-cds-border bg-cds-field px-3 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full border border-cds-border bg-cds-field px-3 py-2.5 text-sm text-cds-text placeholder:text-cds-helper focus:border-cds-blue focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full border-0 border-b border-cds-border bg-cds-field px-3 text-sm text-cds-text focus:border-cds-blue focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-medium text-cds-text-secondary",
        className
      )}
      {...props}
    />
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
      {children}
    </div>
  );
}
