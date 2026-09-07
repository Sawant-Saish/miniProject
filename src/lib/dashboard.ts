/**
 * Dashboard queries: group active topics by revision urgency.
 */

import { prisma } from "@/lib/db";
import { getEffectiveExamDate } from "@/lib/dates";
import {
  classifyRevisionBucket,
  type RevisionBucket,
} from "@/lib/scheduler";
import { syncScheduleState } from "@/lib/schedule-service";

export type DashboardTopic = {
  id: string;
  name: string;
  nextRevisionDate: Date;
  mastery: number;
  subjectId: string;
  subjectName: string;
  isOverdue: boolean;
};

export type DashboardGroup = {
  subjectId: string;
  subjectName: string;
  topics: DashboardTopic[];
};

export type RevisionDashboard = {
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

function groupBySubject(
  topics: DashboardTopic[]
): DashboardGroup[] {
  const map = new Map<string, DashboardGroup>();

  for (const topic of topics) {
    const existing = map.get(topic.subjectId);
    if (existing) {
      existing.topics.push(topic);
    } else {
      map.set(topic.subjectId, {
        subjectId: topic.subjectId,
        subjectName: topic.subjectName,
        topics: [topic],
      });
    }
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      topics: group.topics.sort(
        (a, b) => a.nextRevisionDate.getTime() - b.nextRevisionDate.getTime()
      ),
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

export async function getRevisionDashboard(
  today = new Date()
): Promise<RevisionDashboard> {
  await syncScheduleState(today);

  const topics = await prisma.topic.findMany({
    where: {
      isActive: true,
      nextRevisionDate: { not: null },
    },
    include: {
      subject: { select: { id: true, name: true, examDate: true } },
    },
    orderBy: { nextRevisionDate: "asc" },
  });

  const buckets: Record<RevisionBucket, DashboardTopic[]> = {
    dueToday: [],
    dueThisWeek: [],
    upcoming: [],
  };

  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  for (const topic of topics) {
    if (!topic.nextRevisionDate) continue;

    const exam = getEffectiveExamDate(
      topic.examDateOverride,
      topic.subject.examDate
    );
    if (exam && topic.nextRevisionDate > exam) continue;

    const bucket = classifyRevisionBucket(topic.nextRevisionDate, today);
    const revisionDay = new Date(topic.nextRevisionDate);
    revisionDay.setHours(0, 0, 0, 0);

    buckets[bucket].push({
      id: topic.id,
      name: topic.name,
      nextRevisionDate: topic.nextRevisionDate,
      mastery: topic.currentMasteryScore,
      subjectId: topic.subject.id,
      subjectName: topic.subject.name,
      isOverdue: revisionDay < todayStart,
    });
  }

  return {
    dueToday: groupBySubject(buckets.dueToday),
    dueThisWeek: groupBySubject(buckets.dueThisWeek),
    upcoming: groupBySubject(buckets.upcoming),
    counts: {
      dueToday: buckets.dueToday.length,
      dueThisWeek: buckets.dueThisWeek.length,
      upcoming: buckets.upcoming.length,
      active: topics.length,
    },
  };
}
