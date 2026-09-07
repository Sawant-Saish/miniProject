"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSubject, updateSubject } from "@/lib/actions";
import { toDateInputValue } from "@/lib/dates";

type SubjectFormProps = {
  mode: "create" | "edit";
  subject?: {
    id: string;
    name: string;
    examDate: Date | null;
  };
  /** Where to go after a successful save (defaults: /subjects or current subject). */
  redirectTo?: string;
};

export function SubjectForm({ mode, subject, redirectTo }: SubjectFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSubject(formData)
          : await updateSubject(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      const target =
        redirectTo ??
        (mode === "edit" && subject ? `/subjects/${subject.id}` : "/subjects");
      router.push(target);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {mode === "edit" && subject ? (
        <input type="hidden" name="id" value={subject.id} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="subject-name">Subject name</Label>
        <Input
          id="subject-name"
          name="name"
          required
          placeholder="e.g. Operating Systems"
          defaultValue={subject?.name ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject-examDate">Exam date (optional)</Label>
        <Input
          id="subject-examDate"
          name="examDate"
          type="date"
          defaultValue={toDateInputValue(subject?.examDate)}
        />
        <p className="text-xs text-muted-foreground">
          Topics inherit this date unless they set their own override. Used for
          schedule compression from Phase 2.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Add subject"
            : "Save changes"}
      </Button>
    </form>
  );
}
