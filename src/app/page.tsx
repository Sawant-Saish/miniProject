import Link from "next/link";
import { BookMarked, Layers, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubjectMasteryChart } from "@/components/mastery-charts";
import {
  DueReminderBanner,
  RetentionHealthCard,
} from "@/components/retention-health";
import { RevisionDashboard } from "@/components/revision-dashboard";
import {
  getRetentionHealth,
  getSubjectMasterySummaries,
} from "@/lib/analytics";
import { getRevisionDashboard } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [dashboard, health, subjectSummaries] = await Promise.all([
    getRevisionDashboard(),
    getRetentionHealth(),
    getSubjectMasterySummaries(),
  ]);

  const subjectChartData = subjectSummaries.map((subject) => ({
    name:
      subject.subjectName.length > 14
        ? `${subject.subjectName.slice(0, 12)}…`
        : subject.subjectName,
    mastery: subject.averageMastery,
    topicCount: subject.topicCount,
  }));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Revision dashboard
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Exam-aware spaced repetition with adaptive mastery tracking. Revisions
          compress as exams approach and never extend past exam dates.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/subjects" className={cn(buttonVariants(), "gap-1.5")}>
            <Layers className="size-4" />
            Manage subjects
          </Link>
          <Link
            href="/topics"
            className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
          >
            <BookMarked className="size-4" />
            All topics
          </Link>
          <Link
            href="/subjects/new"
            className={cn(buttonVariants({ variant: "secondary" }), "gap-1.5")}
          >
            <Plus className="size-4" />
            New subject
          </Link>
        </div>
      </section>

      <DueReminderBanner
        dueToday={health.dueToday}
        overdueCount={health.overdueCount}
      />

      {health.activeTopics > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <RetentionHealthCard health={health} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mastery by subject</CardTitle>
              <CardDescription>
                Average retention estimate across active topics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubjectMasteryChart data={subjectChartData} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Your schedule</h2>
        <RevisionDashboard
          dueToday={dashboard.dueToday}
          dueThisWeek={dashboard.dueThisWeek}
          upcoming={dashboard.upcoming}
          counts={dashboard.counts}
        />
      </section>
    </div>
  );
}
