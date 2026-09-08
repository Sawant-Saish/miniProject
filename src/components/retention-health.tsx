import Link from "next/link";
import { AlertTriangle, HeartPulse } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RetentionHealth } from "@/lib/analytics";

type RetentionHealthCardProps = {
  health: RetentionHealth;
};

export function RetentionHealthCard({ health }: RetentionHealthCardProps) {
  const bands = [
    { key: "mastered", label: "Mastered", count: health.bandCounts.mastered },
    { key: "strong", label: "Strong", count: health.bandCounts.strong },
    { key: "solid", label: "Solid", count: health.bandCounts.solid },
    {
      key: "developing",
      label: "Developing",
      count: health.bandCounts.developing,
    },
    {
      key: "needsWork",
      label: "Needs work",
      count: health.bandCounts.needsWork,
    },
  ].filter((band) => band.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="size-4 text-primary" />
          Retention health
        </CardTitle>
        <CardDescription>
          Overall mastery across {health.activeTopics} active topic
          {health.activeTopics === 1 ? "" : "s"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums">
              {health.averageMastery}%
            </p>
            <p className="text-sm text-muted-foreground">Average mastery</p>
          </div>
          <Badge
            variant={
              health.healthLabel === "Needs attention"
                ? "destructive"
                : "secondary"
            }
          >
            {health.healthLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {health.healthDescription}
        </p>

        {bands.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {bands.map((band) => (
              <Badge key={band.key} variant="outline">
                {band.label}: {band.count}
              </Badge>
            ))}
          </div>
        ) : null}

        {health.atRiskTopics.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Topics needing attention</p>
            <ul className="space-y-2">
              {health.atRiskTopics.map((topic) => (
                <li
                  key={topic.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <Link
                      href={`/topics/${topic.id}`}
                      className="font-medium hover:underline"
                    >
                      {topic.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {topic.subjectName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {topic.isOverdue ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : null}
                    <span className="tabular-nums text-muted-foreground">
                      {topic.mastery}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type DueReminderBannerProps = {
  dueToday: number;
  overdueCount: number;
};

export function DueReminderBanner({
  dueToday,
  overdueCount,
}: DueReminderBannerProps) {
  if (dueToday === 0) return null;

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <AlertTriangle className="text-primary" />
      <AlertTitle>Revisions due</AlertTitle>
      <AlertDescription>
        You have{" "}
        <strong>
          {dueToday} topic{dueToday === 1 ? "" : "s"}
        </strong>{" "}
        due for revision today
        {overdueCount > 0 ? (
          <>
            {" "}
            ({overdueCount} overdue — prioritize these first)
          </>
        ) : (
          "."
        )}{" "}
        Scroll down to start a quiz or explain-it-back session.
      </AlertDescription>
    </Alert>
  );
}
