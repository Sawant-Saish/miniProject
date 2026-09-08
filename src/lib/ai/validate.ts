import type {
  ExplanationFeedback,
  GeneratedQuestion,
  QuestionDraft,
} from "@/lib/ai/types";

function isQuestionType(value: unknown): value is "mcq" | "short" {
  return value === "mcq" || value === "short";
}

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).map((s) => s.trim()).filter(Boolean);
}

/** Parse and validate raw JSON from an AI model into question drafts. */
export function parseGeneratedQuestions(raw: unknown): GeneratedQuestion[] {
  const root = raw as { questions?: unknown };
  if (!root || !Array.isArray(root.questions)) {
    throw new Error("AI response missing a questions array.");
  }

  const parsed: GeneratedQuestion[] = [];

  for (const item of root.questions) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const type = record.type;
    const prompt = String(record.prompt ?? "").trim();
    const correctAnswer = String(record.correctAnswer ?? "").trim();

    if (!isQuestionType(type) || !prompt || !correctAnswer) continue;

    if (type === "mcq") {
      const options = normalizeOptions(record.options);
      if (options.length < 2) continue;

      const match = options.find(
        (option) => option.toLowerCase() === correctAnswer.toLowerCase()
      );
      parsed.push({
        type,
        prompt,
        options,
        correctAnswer: match ?? correctAnswer,
        difficulty: parseDifficulty(record.difficulty),
      });
    } else {
      parsed.push({
        type,
        prompt,
        correctAnswer,
        difficulty: parseDifficulty(record.difficulty),
      });
    }
  }

  if (parsed.length === 0) {
    throw new Error("AI returned no usable questions.");
  }

  return parsed;
}

function parseDifficulty(
  value: unknown
): "easy" | "medium" | "hard" | undefined {
  if (value === "easy" || value === "medium" || value === "hard") return value;
  return undefined;
}

/** Validate a user-edited draft before persisting to the question bank. */
export function validateQuestionDraft(
  draft: QuestionDraft,
  index: number
): string | null {
  const label = `Question ${index + 1}`;
  const prompt = draft.prompt.trim();
  const correctAnswer = draft.correctAnswer.trim();

  if (!prompt) return `${label}: prompt is required.`;
  if (!isQuestionType(draft.type)) return `${label}: invalid type.`;

  if (draft.type === "mcq") {
    const options = draft.options.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) {
      return `${label}: MCQ needs at least two options.`;
    }
    if (!correctAnswer) return `${label}: select the correct option.`;
    const match = options.some(
      (option) => option.toLowerCase() === correctAnswer.toLowerCase()
    );
    if (!match) {
      return `${label}: correct answer must match one of the options.`;
    }
  } else if (!correctAnswer) {
    return `${label}: correct answer is required.`;
  }

  return null;
}

/** Normalize a draft for database insert. */
export function normalizeQuestionDraft(draft: QuestionDraft): {
  type: "mcq" | "short";
  prompt: string;
  options: string | null;
  correctAnswer: string;
} {
  if (draft.type === "mcq") {
    const options = draft.options.map((o) => o.trim()).filter(Boolean);
    const match =
      options.find(
        (option) =>
          option.toLowerCase() === draft.correctAnswer.trim().toLowerCase()
      ) ?? draft.correctAnswer.trim();

    return {
      type: "mcq",
      prompt: draft.prompt.trim(),
      options: JSON.stringify(options),
      correctAnswer: match,
    };
  }

  return {
    type: "short",
    prompt: draft.prompt.trim(),
    options: null,
    correctAnswer: draft.correctAnswer.trim(),
  };
}

/** Parse and validate AI explanation grading JSON (Phase 5). */
export function parseExplanationFeedback(raw: unknown): ExplanationFeedback {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI response is not a JSON object.");
  }

  const record = raw as Record<string, unknown>;
  const scoreRaw = Number(record.score);
  const comment = String(record.comment ?? "").trim();
  const gapsRaw = record.gaps;

  if (Number.isNaN(scoreRaw) || scoreRaw < 0 || scoreRaw > 100) {
    throw new Error("AI returned an invalid comprehension score.");
  }

  if (!comment) {
    throw new Error("AI response missing an overall comment.");
  }

  const gaps = Array.isArray(gapsRaw)
    ? gapsRaw.map(String).map((g) => g.trim()).filter(Boolean)
    : [];

  if (gaps.length === 0) {
    throw new Error("AI response missing specific gaps or misconceptions.");
  }

  return {
    score: Math.round(scoreRaw),
    comment,
    gaps: gaps.slice(0, 5),
  };
}
