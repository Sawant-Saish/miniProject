import type {
  GenerateQuestionsInput,
  GenerateQuestionsResult,
} from "@/lib/ai/types";

/**
 * Pluggable AI provider interface.
 * Business logic should depend on this, not a specific vendor SDK.
 */
export interface AIProvider {
  generateQuizQuestions(
    input: GenerateQuestionsInput
  ): Promise<GenerateQuestionsResult>;
}
