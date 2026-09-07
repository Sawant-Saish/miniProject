/**
 * Date helpers for display and form defaults.
 * Kept pure/simple for Phase 1 (no scheduling logic yet).
 */

/** Format a Date for <input type="date" /> (YYYY-MM-DD in local time). */
export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Human-readable short date, e.g. "7 Sep 2026". */
export function formatDisplayDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Effective exam date: topic override if set, else subject exam date. */
export function getEffectiveExamDate(
  topicExamOverride: Date | null | undefined,
  subjectExamDate: Date | null | undefined
): Date | null {
  return topicExamOverride ?? subjectExamDate ?? null;
}
