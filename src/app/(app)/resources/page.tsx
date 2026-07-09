import {
  BookOpen,
  Award,
  Video,
  FlaskConical,
  Wrench,
  FileText,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const typeMeta: Record<string, { icon: any; label: string }> = {
  COURSE: { icon: GraduationCap, label: "Course" },
  CERTIFICATION: { icon: Award, label: "Certification" },
  BOOK: { icon: BookOpen, label: "Book" },
  VIDEO: { icon: Video, label: "Video" },
  LAB: { icon: FlaskConical, label: "Lab" },
  TOOL: { icon: Wrench, label: "Tool" },
  ARTICLE: { icon: FileText, label: "Article" },
};

const statusTone: Record<string, { tone: Tone; label: string }> = {
  TO_START: { tone: "gray", label: "To start" },
  IN_PROGRESS: { tone: "blue", label: "In progress" },
  COMPLETED: { tone: "green", label: "Completed" },
};

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Growth"
        title="Resources"
        description="Courses, certifications, labs, and tools tracked across your learning journey."
      />

      <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Learning Library</CardTitle>
            <span className="text-2xs text-cds-helper">
              {resources.length} resources
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cds-border text-left text-2xs uppercase tracking-wider text-cds-helper">
                  <th className="px-5 py-3 font-semibold">Resource</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Provider</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cds-border">
                {resources.map((r) => {
                  const meta = typeMeta[r.type];
                  const Icon = meta.icon;
                  const status = statusTone[r.status];
                  return (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-cds-layer-accent"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center border border-cds-border bg-cds-bg">
                            <Icon
                              className="h-4 w-4 text-cds-text-secondary"
                              strokeWidth={1.75}
                            />
                          </div>
                          <div>
                            <div className="font-medium text-cds-text">
                              {r.title}
                            </div>
                            {r.notes && (
                              <div className="text-2xs text-cds-helper">
                                {r.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-cds-text-secondary">
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-cds-text-secondary">
                        {r.provider ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cds-link hover:underline"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
