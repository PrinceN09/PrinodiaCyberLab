import { Clock, Timer, Flame, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Study Hours" };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// My schedule: Mon–Fri 2.5h, Sat–Sun 4h
const SCHEDULE = [4, 2.5, 2.5, 2.5, 2.5, 2.5, 4]; // index = getDay()

export default async function StudyHoursPage() {
  const sessions = await prisma.studySession.findMany({
    orderBy: { date: "asc" },
  });

  // Aggregate minutes per day for the last 14 days.
  const now = new Date();
  const days: { date: Date; minutes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const minutes = sessions
      .filter((s) => {
        const sd = new Date(s.date);
        return (
          sd.getFullYear() === d.getFullYear() &&
          sd.getMonth() === d.getMonth() &&
          sd.getDate() === d.getDate()
        );
      })
      .reduce((sum, s) => sum + s.minutes, 0);
    days.push({ date: d, minutes });
  }

  const totalMin = sessions.reduce((s, x) => s + x.minutes, 0);
  const last7 = days.slice(-7).reduce((s, d) => s + d.minutes, 0);
  const weeklyTarget = SCHEDULE.reduce((a, b) => a + b, 0); // 21.5h
  const remaining = Math.max(0, weeklyTarget - last7 / 60);

  // Streak: consecutive days (ending today) with any study time.
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].minutes > 0) streak++;
    else break;
  }

  const maxMin = Math.max(...days.map((d) => d.minutes), 1);

  return (
    <div>
      <PageHeader
        breadcrumb="Progress"
        title="Study Hours"
        description="How your logged study time compares to your weekly schedule."
      />

      <div className="mx-auto max-w-8xl px-6 py-6 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden border border-cds-border bg-cds-border lg:grid-cols-4">
          <StatCard label="Total logged" value={`${(totalMin / 60).toFixed(1)}h`} icon={Clock} />
          <StatCard label="This week" value={`${(last7 / 60).toFixed(1)}h`} icon={Timer} hint={`Target ${weeklyTarget}h`} />
          <StatCard label="Remaining this week" value={`${remaining.toFixed(1)}h`} icon={CalendarDays} />
          <StatCard label="Current streak" value={`${streak}d`} icon={Flame} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Last 14 days</CardTitle>
              <span className="text-2xs text-cds-helper">hours per day</span>
            </CardHeader>
            <CardBody>
              <div className="flex h-48 items-end justify-between gap-1.5">
                {days.map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full bg-cds-blue/80 transition-all hover:bg-cds-blue"
                      style={{
                        height: `${Math.max(3, (d.minutes / maxMin) * 100)}%`,
                      }}
                      title={`${(d.minutes / 60).toFixed(1)}h`}
                    />
                    <span className="text-2xs text-cds-helper">
                      {DAY_LABELS[d.date.getDay()][0]}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Schedule</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5">
              <p className="text-xs text-cds-text-secondary">
                Weekday target 2.5h · Weekend target 4h ·{" "}
                <span className="text-cds-text">{weeklyTarget}h / week</span>
              </p>
              <div className="divide-y divide-cds-border border-t border-cds-border">
                {DAY_LABELS.map((label, day) => {
                  const todayMin = days
                    .filter((d) => d.date.getDay() === day)
                    .slice(-1)[0]?.minutes;
                  const target = SCHEDULE[day];
                  return (
                    <div
                      key={label}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="text-cds-text-secondary">{label}</span>
                      <span className="text-2xs text-cds-helper">
                        target {target}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
