/**
 * Manual quiz scoring (Phase 3).
 * MCQ: exact match on the selected option text.
 * Short answer: normalized exact match or close string similarity.
 */

export type QuestionForScoring = {
  id: string;
  type: string;
  correctAnswer: string;
  options: string | null;
};

export type QuestionResult = {
  questionId: string;
  correct: boolean;
  given: string;
  expected: string;
};

export type QuizScoreResult = {
  score: number;
  correctCount: number;
  totalCount: number;
  results: QuestionResult[];
};

/** Collapse whitespace and lowercase for comparison. */
export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Simple Levenshtein ratio (0–1) for short-answer leniency. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[a.length][b.length];
  return 1 - distance / Math.max(a.length, b.length);
}

/** Accept pipe-separated alternate correct answers. */
function expectedAnswers(correctAnswer: string): string[] {
  return correctAnswer
    .split("|")
    .map((part) => normalizeAnswer(part))
    .filter(Boolean);
}

/** Score one short-answer response (exact or close match). */
export function scoreShortAnswer(given: string, correctAnswer: string): boolean {
  const normalizedGiven = normalizeAnswer(given);
  if (!normalizedGiven) return false;

  const expected = expectedAnswers(correctAnswer);
  for (const answer of expected) {
    if (normalizedGiven === answer) return true;
    if (normalizedGiven.includes(answer) || answer.includes(normalizedGiven)) {
      return true;
    }
    if (similarity(normalizedGiven, answer) >= 0.85) return true;
  }

  return false;
}

/** Score one MCQ response against the stored correct option text. */
export function scoreMcqAnswer(given: string, correctAnswer: string): boolean {
  return normalizeAnswer(given) === normalizeAnswer(correctAnswer);
}

/** Score a full quiz from question metadata and user answers. */
export function scoreQuiz(
  questions: QuestionForScoring[],
  answers: Record<string, string>
): QuizScoreResult {
  const results: QuestionResult[] = questions.map((question) => {
    const given = answers[question.id]?.trim() ?? "";
    const expected = question.correctAnswer;
    const correct =
      question.type === "mcq"
        ? scoreMcqAnswer(given, expected)
        : scoreShortAnswer(given, expected);

    return {
      questionId: question.id,
      correct,
      given,
      expected,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const totalCount = results.length;
  const score =
    totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);

  return { score, correctCount, totalCount, results };
}
