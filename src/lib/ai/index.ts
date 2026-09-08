import { createOpenAIProvider } from "@/lib/ai/openai-provider";
import type { AIProvider } from "@/lib/ai/provider";

export type {
  AIProvider,
} from "@/lib/ai/provider";

export type {
  ExplanationFeedback,
  GeneratedQuestion,
  GenerateQuestionsInput,
  GradeExplanationInput,
  QuestionDraft,
  QuestionType,
} from "@/lib/ai/types";

export {
  normalizeQuestionDraft,
  parseExplanationFeedback,
  parseGeneratedQuestions,
  validateQuestionDraft,
} from "@/lib/ai/validate";

/** Resolve the configured AI provider (default: OpenAI). */
export function getAIProvider(): AIProvider {
  const name = (process.env.AI_PROVIDER ?? "openai").toLowerCase();

  switch (name) {
    case "openai":
      return createOpenAIProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${name}". Supported values: openai.`
      );
  }
}
