/**
 * Dashboard analytics & retention health (Phase 7).
 */

import { prisma } from "@/lib/db";
import {
  buildMasteryTimeline,
  estimateCurrentMastery,
  initialMasteryScore,
  masteryBand,
} from "@/lib/mastery";
import { isRevisionDue, toDay } from "@/lib/scheduler";
import { syncScheduleState } from "@/lib/schedule-service";

export type AtRiskTopic = {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  mastery: number;
  isOverdue: boolean;
};

export type RetentionHealth = {
  averageMastery: number;
  activeTopics: number;
  dueToday: number;
  overdueCount: number;
  bandCounts: {
    needsWork: number;
    developing: number;
    solid: number;
    strong: number;
    mastered: number;
  };
  healthLabel: string;
  healthDescription: string;
  atRiskTopics: AtRiskTopic[];
};

export type SubjectMasterySummary = {
  subjectId: string;
  subjectName: string;
  averageMastery: number;
  topicCount: number;
};

export type MasteryChartPoint = {
  label: string;
  mastery: number;
  attemptScore?: number;
};

function bandKey(score: number): keyof RetentionHealth["bandCounts"] {
  if (score >= 90) return "mastered";
  if (score >= 75) return "strong";
  if (score >= 55) return "solid";
  if (score >= 35) return "developing";
  return "needsWork";
}

function computeHealthLabel(
  averageMastery: number,
  dueToday: number,
  overdueCount: number,
  atRiskCount: number
): { label: string; description: string } {
  if (averageMastery >= 75 && dueToday <= 2 && atRiskCount === 0) {
    return {
      label: "Excellent",
      description: "Strong retention across your active topics.",
    };
  }
  if (averageMastery >= 55 && overdueCount <= 1) {
    return {
      label: "Good",
      description: "Most topics are on track — keep up regular reviews.",
    };
  }
  if (dueToday > 3 || overdueCount > 2 || atRiskCount > 2) {
    return {
      label: "Needs attention",
      description: "Several topics need revision soon or have low mastery.",
    };
  }
  return {
    label: "Fair",
    description: "Mix of solid topics and areas that need more review.",
  };
}

/** Build chart series for a single topic's mastery over time. */
export function buildMasteryChartData(
  dateStudied: Date,
  attempts: Array<{ date: Date; score: number }>
): MasteryChartPoint[] {
  const points: MasteryChartPoint[] = [
    {
      label: dateStudied.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      mastery: initialMasteryScore(),
    },
  ];

  const timeline = buildMasteryTimeline(dateStudied, attempts);
  for (const point of timeline) {
    points.push({
      label: point.date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      mastery: point.masteryAfter,
      attemptScore: Math.round(point.score),
    });
  }

  return points;
}

/** Overall retention health across active topics. */
export async function getRetentionHealth(
  today = new Date()
): Promise<RetentionHealth> {
  await syncScheduleState(today);

  const topics = await prisma.topic.findMany({
    where: { isActive: true },
    include: {
      subject: { select: { id: true, name: true } },
      attempts: {
        orderBy: { date: "asc" },
        select: { date: true, score: true, type: true },
      },
    },
  });

  const bandCounts = {
    needsWork: 0,
    developing: 0,
    solid: 0,
    strong: 0,
    mastered: 0,
  };

  let masterySum = 0;
  let dueToday = 0;
  let overdueCount = 0;
  const atRiskTopics: AtRiskTopic[] = [];

  for (const topic of topics) {
    const mastery = estimateCurrentMastery(
      topic.dateStudied,
      topic.attempts,
      today
    );
    masterySum += mastery;
    bandCounts[bandKey(mastery)]++;

    const overdue =
      topic.nextRevisionDate !== null &&
      toDay(topic.nextRevisionDate) < toDay(today);

    if (topic.nextRevisionDate && isRevisionDue(topic.nextRevisionDate, today)) {
      dueToday++;
    }
    if (overdue) overdueCount++;

    if (mastery < 35 || overdue) {
      atRiskTopics.push({
        id: topic.id,
        name: topic.name,
        subjectId: topic.subject.id,
        subjectName: topic.subject.name,
        mastery: Math.round(mastery),
        isOverdue: Boolean(overdue),
      });
    }
  }

  const averageMastery =
    topics.length === 0 ? 0 : Math.round(masterySum / topics.length);

  const health = computeHealthLabel(
    averageMastery,
    dueToday,
    overdueCount,
    atRiskTopics.length
  );

  atRiskTopics.sort((a, b) => a.mastery - b.mastery);

  return {
    averageMastery,
    activeTopics: topics.length,
    dueToday,
    overdueCount,
    bandCounts,
    healthLabel: health.label,
    healthDescription: health.description,
    atRiskTopics: atRiskTopics.slice(0, 5),
  };
}

/** Average mastery per subject for dashboard bar chart. */
export async function getSubjectMasterySummaries(
  today = new Date()
): Promise<SubjectMasterySummary[]> {
  await syncScheduleState(today);

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      topics: {
        where: { isActive: true },
        include: {
          attempts: {
            orderBy: { date: "asc" },
            select: { date: true, score: true, type: true },
          },
        },
      },
    },
  });

  return subjects
    .filter((subject) => subject.topics.length > 0)
    .map((subject) => {
      const total = subject.topics.reduce((sum, topic) => {
        return (
          sum +
          estimateCurrentMastery(topic.dateStudied, topic.attempts, today)
        );
      }, 0);

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        averageMastery: Math.round(total / subject.topics.length),
        topicCount: subject.topics.length,
      };
    });
}

/** Per-topic mastery for a subject detail chart. */
export async function getTopicMasterySummariesForSubject(
  subjectId: string,
  today = new Date()
) {
  const topics = await prisma.topic.findMany({
    where: { subjectId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      attempts: {
        orderBy: { date: "asc" },
        select: { date: true, score: true, type: true },
      },
    },
  });

  return topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    mastery: Math.round(
      estimateCurrentMastery(topic.dateStudied, topic.attempts, today)
    ),
    band: masteryBand(
      estimateCurrentMastery(topic.dateStudied, topic.attempts, today)
    ).label,
  }));
}
