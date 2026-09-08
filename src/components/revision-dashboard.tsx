import Link from "next/link";
import { AlertCircle, Calendar, CalendarClock, CalendarDays, ClipboardCheck, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardGroup } from "@/lib/dashboard";
import { formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type RevisionDashboardProps = {
  dueToday: DashboardGroup[];
  dueThisWeek: DashboardGroup[];
  upcoming: DashboardGroup[];
  counts: {
    dueToday: number;
    dueThisWeek: number;
    upcoming: number;
    active: number;
  };
};

function TopicBucketList({ groups }: { groups: DashboardGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing scheduled here.</p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.subjectId} className="space-y-2">
          <Link
            href={`/subjects/${group.subjectId}`}
            className="text-sm font-medium hover:underline"
          >
            {group.subjectName}
          </Link>
          <ul className="space-y-2">
            {group.topics.map((topic) => (
              <li
                key={topic.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/topics/${topic.id}/quiz`}
                    className="text-sm font-medium hover:underline"
                  >
                    {topic.name}
                  </Link>
                  {topic.isOverdue ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="size-3" />
                      Overdue
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDisplayDate(topic.nextRevisionDate)}
                    <span className="mx-1">·</span>
                    Mastery {Math.round(topic.mastery)}%
                  </span>
                  <Link
                    href={`/topics/${topic.id}/quiz`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "h-7 gap-1 px-2 text-xs"
                    )}
                  >
                    <ClipboardCheck className="size-3" />
                    Quiz
                  </Link>
                  {topic.hasNotes ? (
                    <Link
                      href={`/topics/${topic.id}/explain`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "h-7 gap-1 px-2 text-xs"
                      )}
                    >
                      <MessageSquareText className="size-3" />
                      Explain
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BucketCard({
  title,
  description,
  icon: Icon,
  count,
  groups,
  highlight,
}: {
  title: string;
  description: string;
  icon: typeof Calendar;
  count: number;
  groups: DashboardGroup[];
  highlight?: boolean;
}) {
  return (
    <Card className={highlight && count > 0 ? "border-primary/40" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="size-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <Badge variant={highlight && count > 0 ? "default" : "secondary"}>
            {count}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <TopicBucketList groups={groups} />
      </CardContent>
    </Card>
  );
}

export function RevisionDashboard({
  dueToday,
  dueThisWeek,
  upcoming,
  counts,
}: RevisionDashboardProps) {
  if (counts.active === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No active revisions scheduled.{" "}
          <Link href="/subjects" className="underline underline-offset-2">
            Add subjects and topics
          </Link>{" "}
          to build your revision plan.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Due today</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {counts.dueToday}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This week</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {counts.dueThisWeek}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {counts.upcoming}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BucketCard
          title="Due today"
          description="Revisions due today or overdue."
          icon={Calendar}
          count={counts.dueToday}
          groups={dueToday}
          highlight
        />
        <BucketCard
          title="Due this week"
          description="Scheduled in the next 7 days (after today)."
          icon={CalendarDays}
          count={counts.dueThisWeek}
          groups={dueThisWeek}
        />
        <BucketCard
          title="Upcoming"
          description="Later revisions on your spaced-repetition plan."
          icon={CalendarClock}
          count={counts.upcoming}
          groups={upcoming}
        />
      </div>
    </div>
  );
}
