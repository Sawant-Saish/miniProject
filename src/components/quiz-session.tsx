"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitQuiz } from "@/lib/actions";
import { cn } from "@/lib/utils";

export type QuizQuestion = {
  id: string;
  type: string;
  prompt: string;
  options: string | null;
};

type QuizSessionProps = {
  topicId: string;
  topicName: string;
  questions: QuizQuestion[];
};

type SubmitResult = {
  score: number;
  correctCount: number;
  totalCount: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    given: string;
    expected: string;
  }>;
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

export function QuizSession({
  topicId,
  topicName,
  questions,
}: QuizSessionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const answers: Record<string, string> = {};

    for (const question of questions) {
      const value = String(formData.get(`answer-${question.id}`) ?? "").trim();
      if (!value) {
        setError("Please answer every question before submitting.");
        return;
      }
      answers[question.id] = value;
    }

    startTransition(async () => {
      const response = await submitQuiz(topicId, answers);
      if (!response.ok) {
        setError(response.error);
        return;
      }

      setResult({
        score: response.score,
        correctCount: response.correctCount,
        totalCount: response.totalCount,
        results: response.results,
      });
      router.refresh();
    });
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz complete</CardTitle>
          <CardDescription>
            {topicName} — {result.correctCount} of {result.totalCount} correct
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-semibold tabular-nums">
              {result.score}%
            </span>
            <Badge variant={result.score >= 60 ? "secondary" : "destructive"}>
              {result.score >= 60 ? "Schedule extended" : "Review sooner"}
            </Badge>
          </div>

          <ul className="space-y-3">
            {questions.map((question, index) => {
              const item = result.results.find(
                (entry) => entry.questionId === question.id
              );
              const correct = item?.correct ?? false;

              return (
                <li
                  key={question.id}
                  className={cn(
                    "rounded-md border px-4 py-3",
                    correct ? "border-border" : "border-destructive/40"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Q{index + 1}
                    </span>
                    <Badge variant={correct ? "secondary" : "destructive"}>
                      {correct ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{question.prompt}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your answer: {item?.given || "—"}
                  </p>
                  {!correct ? (
                    <p className="text-sm text-muted-foreground">
                      Expected: {item?.expected}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/topics/${topicId}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Back to topic
            </Link>
            <Link href="/" className={buttonVariants()}>
              View dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {questions.map((question, index) => {
        const options = parseOptions(question.options);

        return (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Question {index + 1}
                </span>
                <Badge variant="outline">
                  {question.type === "mcq" ? "MCQ" : "Short answer"}
                </Badge>
              </div>
              <CardTitle className="text-base">{question.prompt}</CardTitle>
            </CardHeader>
            <CardContent>
              {question.type === "mcq" ? (
                <div className="space-y-2">
                  {options.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-muted/50"
                    >
                      <input
                        type="radio"
                        name={`answer-${question.id}`}
                        value={option}
                        required
                        className="size-4"
                      />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor={`answer-${question.id}`}>Your answer</Label>
                  <Input
                    id={`answer-${question.id}`}
                    name={`answer-${question.id}`}
                    required
                    placeholder="Type your answer"
                    autoComplete="off"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Submitting…" : "Submit quiz"}
      </Button>
    </form>
  );
}
