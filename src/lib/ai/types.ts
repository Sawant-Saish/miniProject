/** Shared AI types for quiz generation (Phase 4+). */

export type QuestionType = "mcq" | "short";

export type GeneratedQuestion = {
  type: QuestionType;
  prompt: string;
  /** MCQ choices; omitted or empty for short-answer. */
  options?: string[];
  /** For MCQ: exact text of the correct option. For short: expected answer. */
  correctAnswer: string;
  difficulty?: "easy" | "medium" | "hard";
};

export type GenerateQuestionsInput = {
  topicName: string;
  notes: string;
  /** Target number of questions (default 5). */
  count?: number;
};

export type GenerateQuestionsResult = {
  questions: GeneratedQuestion[];
};

/** Draft passed from client review UI back to the server for saving. */
export type QuestionDraft = {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
};

/** Input for Feynman / explain-it-back grading (Phase 5+). */
export type GradeExplanationInput = {
  topicName: string;
  notes: string;
  explanation: string;
};

/** Structured feedback from AI explanation grading. */
export type ExplanationFeedback = {
  score: number;
  comment: string;
  gaps: string[];
};

export type GradeExplanationResult = {
  feedback: ExplanationFeedback;
};
