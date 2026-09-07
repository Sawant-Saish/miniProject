"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTopic, updateTopic } from "@/lib/actions";
import { toDateInputValue } from "@/lib/dates";

type TopicFormProps = {
  mode: "create" | "edit";
  subjectId: string;
  topic?: {
    id: string;
    name: string;
    dateStudied: Date;
    examDateOverride: Date | null;
    notes: string | null;
    isActive: boolean;
  };
  redirectTo?: string;
};

export function TopicForm({
  mode,
  subjectId,
  topic,
  redirectTo,
}: TopicFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTopic(formData)
          : await updateTopic(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      const target =
        redirectTo ??
        (mode === "edit" && topic
          ? `/topics/${topic.id}`
          : `/subjects/${subjectId}`);
      router.push(target);
      router.refresh();
    });
  }

  const today = toDateInputValue(new Date());

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <input type="hidden" name="subjectId" value={subjectId} />
      {mode === "edit" && topic ? (
        <input type="hidden" name="id" value={topic.id} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="topic-name">Topic name</Label>
        <Input
          id="topic-name"
          name="name"
          required
          placeholder="e.g. Process Scheduling"
          defaultValue={topic?.name ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic-dateStudied">Date studied</Label>
        <Input
          id="topic-dateStudied"
          name="dateStudied"
          type="date"
          required
          defaultValue={toDateInputValue(topic?.dateStudied) || today}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic-examOverride">Exam date override (optional)</Label>
        <Input
          id="topic-examOverride"
          name="examDateOverride"
          type="date"
          defaultValue={toDateInputValue(topic?.examDateOverride)}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to inherit the subject exam date.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic-notes">Notes / content (optional)</Label>
        <Textarea
          id="topic-notes"
          name="notes"
          rows={5}
          placeholder="Key points, definitions, formulas… used later for AI quizzes & Feynman grading."
          defaultValue={topic?.notes ?? ""}
        />
      </div>

      {mode === "edit" && topic ? (
        <div className="flex items-center gap-2">
          <input
            id="topic-isActive"
            name="isActive"
            type="checkbox"
            value="true"
            defaultChecked={topic.isActive}
            className="size-4 rounded border border-input"
          />
          <Label htmlFor="topic-isActive">Active (include in revision plans)</Label>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Add topic"
            : "Save changes"}
      </Button>
    </form>
  );
}
