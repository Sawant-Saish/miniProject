"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedQuestion, QuestionDraft } from "@/lib/ai/types";
import {
  generateQuestionsWithAI,
  saveGeneratedQuestions,
} from "@/lib/actions";

type EditableDraft = QuestionDraft & { key: string };

type AiQuestionGeneratorProps = {
  topicId: string;
  hasNotes: boolean;
};

function toEditableDraft(question: GeneratedQuestion, index: number): EditableDraft {
  return {
    key: `draft-${index}-${question.prompt.slice(0, 12)}`,
    type: question.type,
    prompt: question.prompt,
    options: question.options ?? ["", "", "", ""],
    correctAnswer: question.correctAnswer,
  };
}

export function AiQuestionGenerator({
  topicId,
  hasNotes,
}: AiQuestionGeneratorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<EditableDraft[] | null>(null);

  function handleGenerate() {
    setError(null);

    startTransition(async () => {
      const result = await generateQuestionsWithAI(topicId);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setDrafts(
        result.questions.map((question, index) =>
          toEditableDraft(question, index)
        )
      );
    });
  }

  function updateDraft(key: string, patch: Partial<EditableDraft>) {
    setDrafts((current) =>
      current?.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft
      ) ?? null
    );
  }

  function removeDraft(key: string) {
    setDrafts((current) => current?.filter((draft) => draft.key !== key) ?? null);
  }

  function handleSave() {
    if (!drafts || drafts.length === 0) {
      setError("No questions to save.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveGeneratedQuestions(
        topicId,
        drafts.map(({ type, prompt, options, correctAnswer }) => ({
          type,
          prompt,
          options,
          correctAnswer,
        }))
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setDrafts(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Generate with AI</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Uses your topic notes to draft MCQ and short-answer questions. Review
            and edit before saving to the bank.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!hasNotes || pending}
          onClick={handleGenerate}
          className="gap-1.5"
        >
          <Sparkles className="size-4" />
          {pending && !drafts ? "Generating…" : "Generate questions with AI"}
        </Button>
      </div>

      {!hasNotes ? (
        <Alert>
          <AlertTitle>Notes required</AlertTitle>
          <AlertDescription>
            Add study notes to this topic (in Edit topic below) before using AI
            generation.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not complete request</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {drafts && drafts.length > 0 ? (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              Review generated questions ({drafts.length})
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setDrafts(null)}
              >
                Discard
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={handleSave}
              >
                {pending ? "Saving…" : "Save to question bank"}
              </Button>
            </div>
          </div>

          <ul className="space-y-4">
            {drafts.map((draft, index) => (
              <li
                key={draft.key}
                className="space-y-3 rounded-md border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Draft {index + 1}
                    </span>
                    <Badge variant="outline">
                      {draft.type === "mcq" ? "MCQ" : "Short answer"}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeDraft(draft.key)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Type</Label>
                    <Select
                      value={draft.type}
                      onValueChange={(value) =>
                        updateDraft(draft.key, {
                          type: value as "mcq" | "short",
                          options:
                            value === "mcq"
                              ? draft.options.length >= 2
                                ? draft.options
                                : ["", "", "", ""]
                              : [],
                        })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple choice</SelectItem>
                        <SelectItem value="short">Short answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Question</Label>
                    <Textarea
                      rows={2}
                      value={draft.prompt}
                      onChange={(event) =>
                        updateDraft(draft.key, { prompt: event.target.value })
                      }
                    />
                  </div>

                  {draft.type === "mcq" ? (
                    <>
                      {(["A", "B", "C", "D"] as const).map((letter, optionIndex) => (
                        <div key={letter} className="space-y-2">
                          <Label>Option {letter}</Label>
                          <Input
                            value={draft.options[optionIndex] ?? ""}
                            onChange={(event) => {
                              const next = [...draft.options];
                              next[optionIndex] = event.target.value;
                              updateDraft(draft.key, { options: next });
                            }}
                          />
                        </div>
                      ))}
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Correct option</Label>
                        <Select
                          value={draft.correctAnswer}
                          onValueChange={(value) =>
                            updateDraft(draft.key, {
                              correctAnswer: value ?? "",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select correct option" />
                          </SelectTrigger>
                          <SelectContent>
                            {draft.options
                              .map((option) => option.trim())
                              .filter(Boolean)
                              .map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Correct answer</Label>
                      <Input
                        value={draft.correctAnswer}
                        onChange={(event) =>
                          updateDraft(draft.key, {
                            correctAnswer: event.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
