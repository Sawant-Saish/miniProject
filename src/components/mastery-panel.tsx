import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MasteryTrendChart } from "@/components/mastery-charts";
import { buildMasteryChartData } from "@/lib/analytics";
import {
  buildMasteryTimeline,
  estimateCurrentMastery,
  masteryBand,
} from "@/lib/mastery";
import { formatDisplayDate } from "@/lib/dates";

type MasteryPanelProps = {
  dateStudied: Date;
  attempts: Array<{
    date: Date;
    score: number;
    type: string;
  }>;
};

export function MasteryPanel({ dateStudied, attempts }: MasteryPanelProps) {
  const estimated = estimateCurrentMastery(dateStudied, attempts);
  const band = masteryBand(estimated);
  const timeline = buildMasteryTimeline(dateStudied, attempts);
  const chartData = buildMasteryChartData(
    dateStudied,
    attempts.map((a) => ({ date: a.date, score: a.score }))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mastery estimate</CardTitle>
        <CardDescription>
          BKT-inspired probability of retention, with time decay between reviews.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums">{estimated}%</p>
            <p className="text-sm text-muted-foreground">Current estimate</p>
          </div>
          <Badge variant="secondary">{band.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{band.description}</p>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Mastery trend</h3>
          <MasteryTrendChart data={chartData} />
        </div>

        {timeline.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Attempt history</h3>
            <ul className="space-y-2">
              {timeline.map((point, index) => (
                <li
                  key={`${point.date.toISOString()}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">
                      {formatDisplayDate(point.date)}
                    </span>
                    <Badge variant="outline">
                      {point.type === "quiz" ? "Quiz" : "Explanation"}
                    </Badge>
                    <span className="text-muted-foreground">
                      Attempt {Math.round(point.score)}%
                    </span>
                  </div>
                  <span className="font-medium tabular-nums">
                    → {point.masteryAfter}% mastery
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No revision attempts yet. Mastery starts at ~20% for a newly studied
            topic and updates after each quiz or explanation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
