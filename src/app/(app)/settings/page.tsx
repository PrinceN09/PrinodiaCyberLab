import { User, Palette, Bell, Database, Shield } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function Field({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-cds-text-secondary">
        {label}
      </label>
      <input
        defaultValue={value}
        className="h-10 w-full border-b border-cds-border bg-cds-field px-3 text-sm text-cds-text focus:border-cds-blue focus:outline-none"
      />
      {helper && <p className="mt-1 text-2xs text-cds-helper">{helper}</p>}
    </div>
  );
}

function Toggle({
  label,
  description,
  on = false,
}: {
  label: string;
  description: string;
  on?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <div className="text-sm text-cds-text">{label}</div>
        <div className="text-2xs text-cds-helper">{description}</div>
      </div>
      <div
        className={`flex h-5 w-9 shrink-0 items-center px-0.5 transition-colors ${
          on ? "justify-end bg-cds-blue" : "justify-start bg-cds-layer-accent"
        }`}
      >
        <div className="h-4 w-4 bg-white" />
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await prisma.user.findFirst();
  const counts = await prisma.$transaction([
    prisma.note.count(),
    prisma.codeSnippet.count(),
    prisma.diagram.count(),
    prisma.project.count(),
    prisma.report.count(),
  ]);
  const [notes, snippets, diagrams, projects, reports] = counts;

  return (
    <div>
      <PageHeader
        breadcrumb="Settings"
        title="Profile"
        description="Manage your profile, workspace preferences, and data."
      />

      <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4 text-cds-blue" /> Profile
                </CardTitle>
              </CardHeader>
              <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Full name" value={user?.name ?? "Prince Ntunka"} />
                <Field
                  label="Email"
                  value={user?.email ?? "princentunka09@gmail.com"}
                />
                <Field label="Role" value={user?.role ?? "SOC Analyst"} />
                <Field label="Time zone" value="UTC+02:00" />
                <div className="sm:col-span-2">
                  <Button variant="primary">Save changes</Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-cds-blue" /> Notifications
                </CardTitle>
              </CardHeader>
              <CardBody className="divide-y divide-cds-border py-0">
                <Toggle
                  label="Daily study reminder"
                  description="Nudge to log a study session each day"
                  on
                />
                <Toggle
                  label="Weekly progress digest"
                  description="Summary of your learning progress every Monday"
                  on
                />
                <Toggle
                  label="Project due-date alerts"
                  description="Alert when a project deadline is near"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-cds-blue" /> Appearance
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-medium text-cds-text-secondary">
                    Theme
                  </div>
                  <div className="flex gap-2">
                    <button className="border border-cds-blue bg-cds-blue/10 px-4 py-2 text-xs font-medium text-cds-text">
                      Carbon Dark
                    </button>
                    <button className="border border-cds-border px-4 py-2 text-xs text-cds-helper">
                      Light (soon)
                    </button>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium text-cds-text-secondary">
                    Accent
                  </div>
                  <div className="flex gap-2">
                    {["#0f62fe", "#08bdba", "#8a3ffc", "#42be65"].map((c, i) => (
                      <div
                        key={c}
                        className={`h-8 w-8 ${
                          i === 0 ? "ring-2 ring-cds-text ring-offset-2 ring-offset-cds-layer" : ""
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-cds-blue" /> Workspace Data
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {[
                  ["Notes", notes],
                  ["Code snippets", snippets],
                  ["Diagrams", diagrams],
                  ["Projects", projects],
                  ["Reports", reports],
                ].map(([label, count]) => (
                  <div
                    key={label as string}
                    className="flex items-center justify-between border-b border-cds-border pb-2.5 text-sm"
                  >
                    <span className="text-cds-text-secondary">{label}</span>
                    <span className="tabular-nums font-medium text-cds-text">
                      {count}
                    </span>
                  </div>
                ))}
                <Button variant="secondary" className="w-full">
                  Export workspace (JSON)
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cds-blue" /> Security
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cds-text-secondary">
                    Two-factor auth
                  </span>
                  <Badge tone="yellow">Not set</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cds-text-secondary">
                    Session encryption
                  </span>
                  <Badge tone="green">Enabled</Badge>
                </div>
                <Button variant="secondary" className="w-full">
                  Change password
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
