/**
 * Lightweight BKT-inspired mastery model (Phase 6).
 *
 * Maintains P(know) per topic, updated after each attempt with time decay
 * between reviews. Exposed as 0–100 via currentMasteryScore on Topic.
 */

import { differenceInCalendarDays, startOfDay } from "date-fns";

function toDay(date: Date): Date {
  return startOfDay(date);
}

/** Prior P(know) for a newly studied topic. */
export const P_L0 = 0.2;

/** Probability of learning after a review session. */
export const P_LEARN = 0.18;

/** Guess rate when the student has not mastered the topic. */
export const P_GUESS = 0.25;

/** Slip rate when the student has mastered but performs poorly. */
export const P_SLIP = 0.12;

/** Daily decay rate applied to P(know) between reviews. */
export const DECAY_RATE_PER_DAY = 0.04;

/** Floor for P(know) after long gaps (forgetting curve). */
export const MASTERY_FLOOR = 0.08;

export type AttemptObservation = {
  date: Date;
  score: number;
  type?: string;
};

export type MasteryTimelinePoint = AttemptObservation & {
  masteryAfter: number;
};

/** Convert internal probability to stored/display score (0–100). */
export function masteryProbabilityToScore(probability: number): number {
  const clamped = Math.max(0, Math.min(1, probability));
  return Math.round(clamped * 100);
}

/** Convert stored score back to probability (for legacy rows). */
export function masteryScoreToProbability(score: number): number {
  return Math.max(0, Math.min(1, score / 100));
}

/** Apply forgetting-curve decay over elapsed days since last review. */
export function applyTimeDecay(
  pKnow: number,
  daysSinceReview: number
): number {
  if (daysSinceReview <= 0) return pKnow;
  const decayed = pKnow * Math.exp(-DECAY_RATE_PER_DAY * daysSinceReview);
  return Math.max(MASTERY_FLOOR, Math.min(1, decayed));
}

/** Standard BKT observation update for a binary correct/incorrect. */
export function bktObserve(
  pKnow: number,
  correct: boolean
): number {
  const p = Math.max(0.001, Math.min(0.999, pKnow));

  let posterior: number;
  if (correct) {
    const num = p * (1 - P_SLIP);
    const den = num + (1 - p) * P_GUESS;
    posterior = den === 0 ? p : num / den;
  } else {
    const num = p * P_SLIP;
    const den = num + (1 - p) * (1 - P_GUESS);
    posterior = den === 0 ? p : num / den;
  }

  return posterior + (1 - posterior) * P_LEARN;
}

/**
 * Soft BKT update from a 0–100 performance score.
 * Interpolates between correct/incorrect posteriors.
 */
export function bktUpdateFromScore(pKnow: number, score: number): number {
  const performance = Math.max(0, Math.min(1, score / 100));
  const ifCorrect = bktObserve(pKnow, true);
  const ifIncorrect = bktObserve(pKnow, false);
  return ifCorrect * performance + ifIncorrect * (1 - performance);
}

/** Replay attempt history to compute current mastery score. */
export function computeMasteryFromAttempts(
  dateStudied: Date,
  attempts: AttemptObservation[]
): number {
  let pKnow = P_L0;
  let lastDate = dateStudied;

  for (const attempt of attempts) {
    const days = differenceInCalendarDays(
      toDay(attempt.date),
      toDay(lastDate)
    );
    pKnow = applyTimeDecay(pKnow, days);
    pKnow = bktUpdateFromScore(pKnow, attempt.score);
    lastDate = attempt.date;
  }

  return masteryProbabilityToScore(pKnow);
}

/** Build running mastery after each attempt for trend display. */
export function buildMasteryTimeline(
  dateStudied: Date,
  attempts: AttemptObservation[]
): MasteryTimelinePoint[] {
  let pKnow = P_L0;
  let lastDate = dateStudied;
  const timeline: MasteryTimelinePoint[] = [];

  for (const attempt of attempts) {
    const days = differenceInCalendarDays(
      toDay(attempt.date),
      toDay(lastDate)
    );
    pKnow = applyTimeDecay(pKnow, days);
    pKnow = bktUpdateFromScore(pKnow, attempt.score);
    timeline.push({
      ...attempt,
      masteryAfter: masteryProbabilityToScore(pKnow),
    });
    lastDate = attempt.date;
  }

  return timeline;
}

/** Human-readable mastery band for UI. */
export function masteryBand(score: number): {
  label: string;
  description: string;
} {
  if (score >= 90) {
    return { label: "Mastered", description: "Strong retention — longer intervals" };
  }
  if (score >= 75) {
    return { label: "Strong", description: "Good grasp with room to consolidate" };
  }
  if (score >= 55) {
    return { label: "Solid", description: "On track — keep reviewing" };
  }
  if (score >= 35) {
    return { label: "Developing", description: "Partial knowledge — review soon" };
  }
  return { label: "Needs work", description: "Low retention — frequent revision" };
}

/** Initial mastery score for topics with no attempts yet. */
export function initialMasteryScore(): number {
  return masteryProbabilityToScore(P_L0);
}

/** Apply decay from last known review to today (for display between sessions). */
export function estimateCurrentMastery(
  dateStudied: Date,
  attempts: AttemptObservation[],
  today: Date = new Date()
): number {
  if (attempts.length === 0) {
    const days = differenceInCalendarDays(toDay(today), toDay(dateStudied));
    const decayed = applyTimeDecay(P_L0, days);
    return masteryProbabilityToScore(decayed);
  }

  const score = computeMasteryFromAttempts(dateStudied, attempts);
  const lastAttempt = attempts[attempts.length - 1];
  const daysSince = differenceInCalendarDays(
    toDay(today),
    toDay(lastAttempt.date)
  );
  const pKnow = applyTimeDecay(masteryScoreToProbability(score), daysSince);
  return masteryProbabilityToScore(pKnow);
}
