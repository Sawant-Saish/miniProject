import OpenAI from "openai";
import type { AIProvider } from "@/lib/ai/provider";
import type { GenerateQuestionsInput } from "@/lib/ai/types";
import { parseGeneratedQuestions } from "@/lib/ai/validate";

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

export function createOpenAIProvider(): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your .env file to use AI features."
    );
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  return {
    async generateQuizQuestions(input) {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned an empty response.");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error("OpenAI returned invalid JSON.");
      }

      return { questions: parseGeneratedQuestions(parsed) };
    },
  };
}
