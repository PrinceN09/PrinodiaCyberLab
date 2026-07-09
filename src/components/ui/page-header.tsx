export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-cds-border bg-cds-bg px-6 py-6 lg:px-8">
      <div className="mx-auto flex max-w-8xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {breadcrumb && (
            <div className="mb-2 text-2xs font-medium uppercase tracking-wider text-cds-helper">
              {breadcrumb}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-cds-text">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm text-cds-text-secondary">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
