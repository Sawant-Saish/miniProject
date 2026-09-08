"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { createQuestion } from "@/lib/actions";

type QuestionFormProps = {
  topicId: string;
};

export function QuestionForm({ topicId }: QuestionFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"mcq" | "short">("mcq");

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("type", type);

    startTransition(async () => {
      const result = await createQuestion(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      setType("mcq");
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <input type="hidden" name="topicId" value={topicId} />

      <div className="space-y-2">
        <Label htmlFor="question-type">Question type</Label>
        <Select
          value={type}
          onValueChange={(value) => setType(value as "mcq" | "short")}
        >
          <SelectTrigger id="question-type" className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mcq">Multiple choice</SelectItem>
            <SelectItem value="short">Short answer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="question-prompt">Question</Label>
        <Textarea
          id="question-prompt"
          name="prompt"
          rows={3}
          required
          placeholder="What is the time complexity of binary search?"
        />
      </div>

      {type === "mcq" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add 2–4 options and mark the correct one.
          </p>
          {(["A", "B", "C", "D"] as const).map((letter, index) => (
            <div key={letter} className="flex items-center gap-3">
              <input
                type="radio"
                id={`correct-${letter}`}
                name="correctOption"
                value={String(index)}
                required={index < 2}
                className="size-4 shrink-0"
              />
              <Label htmlFor={`correct-${letter}`} className="sr-only">
                Correct option {letter}
              </Label>
              <Input
                name={`option${letter}`}
                placeholder={`Option ${letter}${index < 2 ? " (required)" : ""}`}
                required={index < 2}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="question-answer">Correct answer</Label>
          <Input
            id="question-answer"
            name="correctAnswer"
            required
            placeholder="O(log n) — use | to allow alternates: O(log n)|log n"
          />
          <p className="text-xs text-muted-foreground">
            Answers are compared case-insensitively; close spelling matches count
            as correct.
          </p>
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add question"}
      </Button>
    </form>
  );
}
