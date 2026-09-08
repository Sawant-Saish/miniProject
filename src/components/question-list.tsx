"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteQuestion } from "@/lib/actions";

export type QuestionListItem = {
  id: string;
  type: string;
  prompt: string;
  options: string | null;
  correctAnswer: string;
};

type QuestionListProps = {
  topicId: string;
  questions: QuestionListItem[];
};

function parseOptions(options: string | null): string[] {
  if (!options) return [];
  try {
    const parsed = JSON.parse(options) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function QuestionList({ topicId, questions }: QuestionListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(questionId: string) {
    if (!window.confirm("Delete this question?")) return;

    const formData = new FormData();
    formData.set("id", questionId);
    formData.set("topicId", topicId);

    setDeletingId(questionId);
    startTransition(async () => {
      const result = await deleteQuestion(formData);
      setDeletingId(null);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No questions yet. Add MCQ or short-answer items below.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {questions.map((question, index) => {
        const options = parseOptions(question.options);

        return (
          <li
            key={question.id}
            className="rounded-md border border-border px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Q{index + 1}
                  </span>
                  <Badge variant="outline">
                    {question.type === "mcq" ? "MCQ" : "Short answer"}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{question.prompt}</p>
                {question.type === "mcq" ? (
                  <ul className="list-inside list-disc text-sm text-muted-foreground">
                    {options.map((option) => (
                      <li
                        key={option}
                        className={
                          option === question.correctAnswer
                            ? "font-medium text-foreground"
                            : undefined
                        }
                      >
                        {option}
                        {option === question.correctAnswer ? " ✓" : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Answer: {question.correctAnswer}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending && deletingId === question.id}
                onClick={() => handleDelete(question.id)}
              >
                {pending && deletingId === question.id ? "Removing…" : "Remove"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
