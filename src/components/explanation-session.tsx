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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitExplanation } from "@/lib/actions";

type ExplanationSessionProps = {
  topicId: string;
  topicName: string;
};

type ExplanationResult = {
  score: number;
  comment: string;
  gaps: string[];
};

export function ExplanationSession({
  topicId,
  topicName,
}: ExplanationSessionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState("");
  const [result, setResult] = useState<ExplanationResult | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await submitExplanation(topicId, explanation);
      if (!response.ok) {
        setError(response.error);
        return;
      }

      setResult({
        score: response.score,
        comment: response.comment,
        gaps: response.gaps,
      });
      router.refresh();
    });
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Explanation graded</CardTitle>
          <CardDescription>
            {topicName} — Feynman-style comprehension feedback
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

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Overall comment</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {result.comment}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Gaps & misconceptions</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {result.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Explain it in your own words</CardTitle>
          <CardDescription>
            Pretend you are teaching {topicName} to someone who has never heard
            of it. Cover the key ideas, definitions, and how they connect — without
            copying notes verbatim.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="explanation">Your explanation</Label>
            <Textarea
              id="explanation"
              name="explanation"
              rows={10}
              required
              minLength={40}
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              placeholder="Start from the basics and build up to the important details…"
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              {explanation.trim().length} characters (minimum 40)
            </p>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Grading with AI…" : "Submit for grading"}
      </Button>
    </form>
  );
}
