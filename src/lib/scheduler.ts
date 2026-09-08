/**
 * Baseline spaced-repetition scheduler (Phase 2).
 *
 * Simplified SM-2-style intervals with exam-date ceiling and compression.
 * Pure functions — easy to unit test and explain in a viva.
 */

import {
  addDays,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";
import { getEffectiveExamDate } from "@/lib/dates";

/** Default score when no quiz/explanation attempt exists yet. */
export const BASELINE_SCORE = 70;

/**
 * SM-2-inspired interval ladder (days) for successful reviews.
 * A poor score (< 60) resets to the first step (1 day).
 */
export const INTERVAL_LADDER_DAYS = [1, 3, 7, 14, 30, 60] as const;

export type ScheduleInput = {
  /** Date the topic was studied or last reviewed. */
  anchorDate: Date;
  /** Number of successful spaced-repetition cycles so far (0 = first review). */
  repetitionNumber: number;
  /** Performance score 0–100 (quiz or explanation). Defaults to baseline. */
  score?: number;
  /** Hard ceiling — no revision scheduled after this date. */
  examDate: Date | null;
  /** Reference "today" for compression math (defaults to now). */
  fromDate?: Date;
};

export type ScheduleResult = {
  /** Next revision date, or null when no further reviews should be scheduled. */
  nextRevisionDate: Date | null;
  intervalDays: number;
  /** False when the exam date has passed. */
  isActive: boolean;
};

/** Normalize to local midnight for consistent day comparisons. */
export function toDay(date: Date): Date {
  return startOfDay(date);
}

/** Map a 0–100 score to SM-2 quality (0–5). */
export function scoreToQuality(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return Math.round(clamped / 20);
}

/**
 * Base interval in days before exam compression.
 * Poor recall (quality < 3) resets to a 1-day interval.
 */
export function getBaseIntervalDays(
  repetitionNumber: number,
  score: number
): number {
  const quality = scoreToQuality(score);
  if (quality < 3) {
    return INTERVAL_LADDER_DAYS[0];
  }

  const index = Math.min(repetitionNumber, INTERVAL_LADDER_DAYS.length - 1);
  return INTERVAL_LADDER_DAYS[index];
}

/**
 * Shrink intervals as the exam approaches so revisions fit before the deadline.
 * Also caps the interval so it never extends past the exam date.
 */
export function applyExamCompression(
  intervalDays: number,
  examDate: Date | null,
  fromDate: Date
): number {
  if (!examDate) return intervalDays;

  const today = toDay(fromDate);
  const exam = toDay(examDate);
  const daysUntilExam = differenceInCalendarDays(exam, today);

  if (daysUntilExam < 0) return 0;
  if (daysUntilExam === 0) return 0;

  let compressed = Math.min(intervalDays, daysUntilExam);

  // Within two weeks of the exam, pull intervals closer (min 1 day).
  if (daysUntilExam <= 14) {
    const factor = Math.max(daysUntilExam / 14, 0.25);
    compressed = Math.max(1, Math.floor(compressed * factor));
  }

  return Math.max(1, compressed);
}

/**
 * Compute the next revision date from study/review performance.
 * Never schedules past the exam date; returns inactive when exam has passed.
 */
export function calculateNextRevision(input: ScheduleInput): ScheduleResult {
  const today = toDay(input.fromDate ?? new Date());
  const exam = input.examDate ? toDay(input.examDate) : null;
  const anchor = toDay(input.anchorDate);
  const score = input.score ?? BASELINE_SCORE;

  if (exam && today > exam) {
    return { nextRevisionDate: null, intervalDays: 0, isActive: false };
  }

  let intervalDays = getBaseIntervalDays(input.repetitionNumber, score);
  intervalDays = applyExamCompression(intervalDays, exam, today);

  if (intervalDays <= 0) {
    return { nextRevisionDate: null, intervalDays: 0, isActive: false };
  }

  let nextDate = addDays(anchor, intervalDays);

  if (exam && nextDate > exam) {
    nextDate = exam;
  }

  if (exam && nextDate > exam) {
    return { nextRevisionDate: null, intervalDays: 0, isActive: false };
  }

  return {
    nextRevisionDate: nextDate,
    intervalDays,
    isActive: true,
  };
}

/** Schedule the first revision for a newly created topic. */
export function scheduleInitialRevision(
  dateStudied: Date,
  examDate: Date | null,
  fromDate: Date = new Date()
): ScheduleResult {
  return calculateNextRevision({
    anchorDate: dateStudied,
    repetitionNumber: 0,
    score: BASELINE_SCORE,
    examDate,
    fromDate,
  });
}

/**
 * Schedule the next revision after a quiz/explanation attempt (Phase 3+).
 * `attemptCount` is the total number of attempts including the one just completed.
 */
export function scheduleAfterAttempt(
  lastReviewDate: Date,
  attemptCount: number,
  score: number,
  examDate: Date | null,
  fromDate: Date = new Date()
): ScheduleResult {
  const quality = scoreToQuality(score);
  const repetitionNumber =
    quality < 3 ? 0 : Math.max(0, attemptCount - 1);

  return calculateNextRevision({
    anchorDate: lastReviewDate,
    repetitionNumber,
    score,
    examDate,
    fromDate,
  });
}

/** True when the effective exam date is strictly before today. */
export function isExamExpired(
  topicExamOverride: Date | null | undefined,
  subjectExamDate: Date | null | undefined,
  today: Date = new Date()
): boolean {
  const exam = getEffectiveExamDate(topicExamOverride, subjectExamDate);
  if (!exam) return false;
  return toDay(today) > toDay(exam);
}

export type RevisionBucket = "dueToday" | "dueThisWeek" | "upcoming";

/** Classify a next revision date into dashboard buckets. */
export function classifyRevisionBucket(
  nextRevisionDate: Date,
  today: Date = new Date()
): RevisionBucket {
  const day = toDay(nextRevisionDate);
  const now = toDay(today);
  const daysAhead = differenceInCalendarDays(day, now);

  if (daysAhead <= 0) return "dueToday";
  if (daysAhead <= 7) return "dueThisWeek";
  return "upcoming";
}

/** True when a topic's next revision date is today or overdue. */
export function isRevisionDue(
  nextRevisionDate: Date | null | undefined,
  today: Date = new Date()
): boolean {
  if (!nextRevisionDate) return false;
  return differenceInCalendarDays(toDay(nextRevisionDate), toDay(today)) <= 0;
}
