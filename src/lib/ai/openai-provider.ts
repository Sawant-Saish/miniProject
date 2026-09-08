import OpenAI from "openai";
import type { AIProvider } from "@/lib/ai/provider";
import type { GenerateQuestionsInput, GradeExplanationInput } from "@/lib/ai/types";
import {
  parseExplanationFeedback,
  parseGeneratedQuestions,
} from "@/lib/ai/validate";

const SYSTEM_PROMPT = `You generate revision quiz questions for students.
Return ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "type": "mcq" | "short",
      "prompt": "string",
      "options": ["string", ...],  // required for mcq (exactly 4 options)
      "correctAnswer": "string",   // for mcq: must exactly match one option text
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}
Rules:
- Base questions strictly on the provided topic notes.
- Mix MCQ and short-answer with varied difficulty.
- MCQ distractors must be plausible but clearly wrong to someone who studied the notes.
- Short-answer correctAnswer should be concise (a phrase or short sentence).
- Do not include markdown or explanation fields.`;

function buildUserPrompt(input: GenerateQuestionsInput): string {
  const count = input.count ?? 5;

  return `Topic: ${input.topicName}

Study notes:
"""
${input.notes}
"""

Generate ${count} quiz questions (mix of mcq and short, mixed difficulty).`;
}

const EXPLANATION_SYSTEM_PROMPT = `You grade a student's free-form explanation of a study topic (Feynman technique).
Compare their explanation to the reference notes. Return ONLY valid JSON:
{
  "score": number,        // 0-100 comprehension score
  "comment": "string",    // 1-2 sentence overall assessment
  "gaps": ["string", ...] // 2-3 specific gaps, misconceptions, or missing points
}
Rules:
- Score generously for correct ideas even if wording differs.
- Penalize factual errors, missing core concepts, and vague hand-waving.
- Each gap must be specific and actionable (not generic praise).
- Provide exactly 2 or 3 gap items unless the explanation is near-perfect (then 1-2 minor gaps).`;

function buildExplanationPrompt(input: GradeExplanationInput): string {
  return `Topic: ${input.topicName}

Reference notes (ground truth — student did NOT see these):
"""
${input.notes}
"""

Student's explanation (in their own words):
"""
${input.explanation}
"""

Grade how well the student explained the topic.`;
}

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your .env file to use AI features."
    );
  }

  return {
    client: new OpenAI({ apiKey }),
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };
}

async function requestJson(
  client: OpenAI,
  model: string,
  system: string,
  user: string
): Promise<unknown> {
  const response = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned invalid JSON.");
  }
}

export function createOpenAIProvider(): AIProvider {
  const { client, model } = createOpenAIClient();

  return {
    async generateQuizQuestions(input) {
      const parsed = await requestJson(
        client,
        model,
        SYSTEM_PROMPT,
        buildUserPrompt(input)
      );

      return { questions: parseGeneratedQuestions(parsed) };
    },

    async gradeExplanation(input) {
      const parsed = await requestJson(
        client,
        model,
        EXPLANATION_SYSTEM_PROMPT,
        buildExplanationPrompt(input)
      );

      return { feedback: parseExplanationFeedback(parsed) };
    },
  };
}
