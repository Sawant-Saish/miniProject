/**
 * Server-side helpers that apply the scheduler to the database.
 */

import { prisma } from "@/lib/db";
import { getEffectiveExamDate } from "@/lib/dates";
import {
  isExamExpired,
  scheduleInitialRevision,
  scheduleAfterAttempt,
} from "@/lib/scheduler";

type TopicWithSubject = {
  id: string;
  dateStudied: Date;
  examDateOverride: Date | null;
  nextRevisionDate: Date | null;
  isActive: boolean;
  subject: { examDate: Date | null };
};

/** Resolve exam ceiling and whether the topic should be archived. */
export function resolveTopicScheduleState(
  topic: TopicWithSubject,
  today = new Date()
) {
  const examDate = getEffectiveExamDate(
    topic.examDateOverride,
    topic.subject.examDate
  );
  const expired = isExamExpired(
    topic.examDateOverride,
    topic.subject.examDate,
    today
  );

  return { examDate, expired };
}

/** Archive topics whose exam date has passed. */
export async function archiveExpiredTopics(today = new Date()) {
  const activeTopics = await prisma.topic.findMany({
    where: { isActive: true },
    include: { subject: { select: { examDate: true } } },
  });

  const expiredIds = activeTopics
    .filter((topic) =>
      isExamExpired(topic.examDateOverride, topic.subject.examDate, today)
    )
    .map((topic) => topic.id);

  if (expiredIds.length === 0) return 0;

  await prisma.topic.updateMany({
    where: { id: { in: expiredIds } },
    data: { isActive: false, nextRevisionDate: null },
  });

  return expiredIds.length;
}

/** Backfill nextRevisionDate for topics created before Phase 2. */
export async function backfillMissingSchedules(today = new Date()) {
  const topics = await prisma.topic.findMany({
    where: {
      isActive: true,
      nextRevisionDate: null,
    },
    include: { subject: { select: { examDate: true } } },
  });

  for (const topic of topics) {
    const { examDate, expired } = resolveTopicScheduleState(topic, today);

    if (expired) {
      await prisma.topic.update({
        where: { id: topic.id },
        data: { isActive: false, nextRevisionDate: null },
      });
      continue;
    }

    const schedule = scheduleInitialRevision(topic.dateStudied, examDate, today);
    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        nextRevisionDate: schedule.nextRevisionDate,
        isActive: schedule.isActive,
      },
    });
  }

  return topics.length;
}

/** Run archive + backfill before dashboard reads. */
export async function syncScheduleState(today = new Date()) {
  const archived = await archiveExpiredTopics(today);
  const backfilled = await backfillMissingSchedules(today);
  return { archived, backfilled };
}

/** Compute schedule fields when creating a topic. */
export function buildInitialTopicSchedule(
  dateStudied: Date,
  examDateOverride: Date | null,
  subjectExamDate: Date | null,
  today = new Date()
) {
  const examDate = getEffectiveExamDate(examDateOverride, subjectExamDate);

  if (isExamExpired(examDateOverride, subjectExamDate, today)) {
    return { nextRevisionDate: null, isActive: false };
  }

  const schedule = scheduleInitialRevision(dateStudied, examDate, today);
  return {
    nextRevisionDate: schedule.nextRevisionDate,
    isActive: schedule.isActive,
  };
}

/**
 * Recompute next revision after performance data (used from Phase 3 onward).
 * Exported here so quiz actions have a single entry point.
 */
export async function applyAttemptSchedule(
  topicId: string,
  score: number,
  reviewDate: Date = new Date()
) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      subject: { select: { examDate: true } },
      attempts: { select: { id: true } },
    },
  });

  if (!topic) return null;

  const examDate = getEffectiveExamDate(
    topic.examDateOverride,
    topic.subject.examDate
  );

  if (isExamExpired(topic.examDateOverride, topic.subject.examDate, reviewDate)) {
    await prisma.topic.update({
      where: { id: topicId },
      data: { isActive: false, nextRevisionDate: null },
    });
    return null;
  }

  const schedule = scheduleAfterAttempt(
    reviewDate,
    topic.attempts.length,
    score,
    examDate,
    reviewDate
  );

  await prisma.topic.update({
    where: { id: topicId },
    data: {
      nextRevisionDate: schedule.nextRevisionDate,
      isActive: schedule.isActive,
    },
  });

  return schedule;
}
