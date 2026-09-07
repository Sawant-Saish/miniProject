import Link from "next/link";
import { BookMarked, Layers, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RevisionDashboard } from "@/components/revision-dashboard";
import { getRevisionDashboard } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dashboard = await getRevisionDashboard();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Revision dashboard
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Exam-aware spaced repetition schedules your next review for each topic.
          Revisions never extend past the exam date and compress as deadlines
          approach.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/subjects" className={cn(buttonVariants())}>
            <Layers className="size-4" />
            Manage subjects
          </Link>
          <Link
            href="/topics"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <BookMarked className="size-4" />
            All topics
          </Link>
          <Link
            href="/subjects/new"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            <Plus className="size-4" />
            New subject
          </Link>
        </div>
      </section>

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
