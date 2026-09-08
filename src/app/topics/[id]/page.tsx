import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardCheck, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiQuestionGenerator } from "@/components/ai-question-generator";
import { DeleteButton } from "@/components/delete-button";
import { QuestionForm } from "@/components/question-form";
import { QuestionList } from "@/components/question-list";
import { TopicForm } from "@/components/topic-form";
import { prisma } from "@/lib/db";
import {
  formatDisplayDate,
  getEffectiveExamDate,
} from "@/lib/dates";
import { isRevisionDue } from "@/lib/scheduler";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TopicDetailPage({ params }: PageProps) {
  const { id } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      subject: true,
      questions: { orderBy: { sortOrder: "asc" } },
      attempts: { orderBy: { date: "desc" }, take: 5 },
    },
  });

  if (!topic) notFound();

  const exam = getEffectiveExamDate(
    topic.examDateOverride,
    topic.subject.examDate
  );
  const due = topic.isActive && isRevisionDue(topic.nextRevisionDate);
  const canQuiz = topic.isActive && topic.questions.length > 0;
  const canExplain = topic.isActive && Boolean(topic.notes?.trim());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/subjects/${topic.subjectId}`}
              className="hover:underline"
            >
              ← {topic.subject.name}
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {topic.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={topic.isActive ? "secondary" : "outline"}>
              {topic.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">
              Mastery {Math.round(topic.currentMasteryScore)}%
            </Badge>
            <Badge variant="outline">
              Next revision: {formatDisplayDate(topic.nextRevisionDate)}
            </Badge>
            {due ? <Badge variant="default">Due today</Badge> : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Studied {formatDisplayDate(topic.dateStudied)} · Effective exam{" "}
            {formatDisplayDate(exam)}
            {topic.examDateOverride ? " (topic override)" : " (from subject)"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExplain ? (
            <Link
              href={`/topics/${topic.id}/explain`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}
            >
              <MessageSquareText className="size-4" />
              {due ? "Explain it back" : "Practice explanation"}
            </Link>
          ) : null}
          {canQuiz ? (
            <Link
              href={`/topics/${topic.id}/quiz`}
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <ClipboardCheck className="size-4" />
              {due ? "Start revision quiz" : "Practice quiz"}
            </Link>
          ) : null}
          <DeleteButton
            id={topic.id}
            entity="topic"
            name={topic.name}
            subjectId={topic.subjectId}
          />
        </div>
      </div>

      {topic.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes / content</CardTitle>
            <CardDescription>
              Reference material for AI question generation and Feynman grading.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
              {topic.notes}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Question bank</CardTitle>
          <CardDescription>
            Add questions manually or generate drafts from your topic notes with AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AiQuestionGenerator
            topicId={topic.id}
            hasNotes={Boolean(topic.notes?.trim())}
          />
          <QuestionList topicId={topic.id} questions={topic.questions} />
          <div className="border-t border-border pt-6">
            <h3 className="mb-4 text-sm font-medium">Add a question</h3>
            <QuestionForm topicId={topic.id} />
          </div>
        </CardContent>
      </Card>

      {topic.attempts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent attempts</CardTitle>
            <CardDescription>
              Quiz scores feed into the spaced-repetition schedule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topic.attempts.map((attempt) => {
                let feedbackPreview: string | null = null;
                if (attempt.type === "explanation" && attempt.feedback) {
                  try {
                    const parsed = JSON.parse(attempt.feedback) as {
                      comment?: string;
                    };
                    feedbackPreview = parsed.comment ?? null;
                  } catch {
                    feedbackPreview = null;
                  }
                }

                return (
                  <li
                    key={attempt.id}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {attempt.type === "quiz" ? "Quiz" : "Explanation"}
                        </Badge>
                        <span>{formatDisplayDate(attempt.date)}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {Math.round(attempt.score)}%
                      </span>
                    </div>
                    {feedbackPreview ? (
                      <p className="mt-2 text-muted-foreground">
                        {feedbackPreview}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Edit topic</CardTitle>
          <CardDescription>
            Update study date, notes, exam override, or active status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TopicForm
            mode="edit"
            subjectId={topic.subjectId}
            topic={{
              id: topic.id,
              name: topic.name,
              dateStudied: topic.dateStudied,
              examDateOverride: topic.examDateOverride,
              notes: topic.notes,
              isActive: topic.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
