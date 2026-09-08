import type {
  GenerateQuestionsInput,
  GenerateQuestionsResult,
  GradeExplanationInput,
  GradeExplanationResult,
} from "@/lib/ai/types";

/**
 * Pluggable AI provider interface.
 * Business logic should depend on this, not a specific vendor SDK.
 */
export interface AIProvider {
  generateQuizQuestions(
    input: GenerateQuestionsInput
  ): Promise<GenerateQuestionsResult>;

  gradeExplanation(
    input: GradeExplanationInput
  ): Promise<GradeExplanationResult>;
}
