import {
  ShieldAlert,
  Radar,
  Bug,
  Siren,
  ScrollText,
  Terminal,
  Cloud,
  Network,
  Activity,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { PROJECT_CATEGORIES, PROJECT_STATUS, labelFor } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const categoryMeta: Record<
  string,
  { icon: any; tone: Tone }
> = {
  SOC_ANALYST: { icon: ShieldAlert, tone: "blue" },
  SIEM: { icon: Activity, tone: "cyan" },
  THREAT_DETECTION: { icon: Radar, tone: "teal" },
  INCIDENT_RESPONSE: { icon: Siren, tone: "red" },
  VULNERABILITY_MANAGEMENT: { icon: Bug, tone: "orange" },
  GRC: { icon: ScrollText, tone: "magenta" },
  PENETRATION_TESTING: { icon: Terminal, tone: "purple" },
  LINUX_NETWORKING: { icon: Network, tone: "yellow" },
  CLOUD_SECURITY: { icon: Cloud, tone: "cyan" },
};

const statusTone: Record<string, Tone> = {
  PLANNED: "gray",
  ACTIVE: "blue",
  ON_HOLD: "yellow",
  COMPLETED: "green",
};

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { tags: true },
  });

  const byCategory = PROJECT_CATEGORIES.map((c) => ({
    ...c,
    count: projects.filter((p) => p.category === c.value).length,
  }));

  return (
    <div>
      <PageHeader
        breadcrumb="Operations"
        title="Cyber Projects"
        description="Hands-on labs and projects organized across the security discipline."
        actions={<Button variant="primary">New project</Button>}
      />

      <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
        {/* Category strip */}
        <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden border border-cds-border bg-cds-border md:grid-cols-5 lg:grid-cols-9">
          {byCategory.map((c) => {
            const Icon = categoryMeta[c.value].icon;
            return (
              <div
                key={c.value}
                className="flex flex-col items-center gap-2 bg-cds-layer px-3 py-4 text-center"
              >
                <Icon className="h-4 w-4 text-cds-helper" strokeWidth={1.75} />
                <div className="text-lg font-semibold text-cds-text">
                  {c.count}
                </div>
                <div className="text-2xs leading-tight text-cds-helper">
                  {c.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Project cards */}
        <div className="grid grid-cols-1 gap-px overflow-hidden border border-cds-border bg-cds-border md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const meta = categoryMeta[p.category];
            const Icon = meta.icon;
            return (
              <div
                key={p.id}
                className="flex flex-col bg-cds-layer p-5 transition-colors hover:bg-cds-layer-accent"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center border border-cds-border bg-cds-bg">
                    <Icon className="h-4 w-4 text-cds-text-secondary" strokeWidth={1.75} />
                  </div>
                  <Badge tone={statusTone[p.status]}>
                    {labelFor(PROJECT_STATUS, p.status)}
                  </Badge>
                </div>
                <div className="mt-4 flex-1">
                  <div className="text-2xs font-medium uppercase tracking-wider text-cds-helper">
                    {labelFor(PROJECT_CATEGORIES, p.category)}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-cds-text">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-cds-text-secondary">
                      {p.description}
                    </p>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-2xs text-cds-helper">
                    <span>Progress</span>
                    <span className="tabular-nums text-cds-text-secondary">
                      {p.progress}%
                    </span>
                  </div>
                  <ProgressBar
                    value={p.progress}
                    tone={p.progress === 100 ? "green" : "blue"}
                  />
                  {p.dueDate && (
                    <div className="pt-1 text-2xs text-cds-helper">
                      Due {formatDate(p.dueDate)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
