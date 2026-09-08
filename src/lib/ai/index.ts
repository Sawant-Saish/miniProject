import { createOpenAIProvider } from "@/lib/ai/openai-provider";
import type { AIProvider } from "@/lib/ai/provider";

export type {
  AIProvider,
} from "@/lib/ai/provider";

export type {
  GeneratedQuestion,
  GenerateQuestionsInput,
  QuestionDraft,
  QuestionType,
} from "@/lib/ai/types";

export {
  normalizeQuestionDraft,
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
