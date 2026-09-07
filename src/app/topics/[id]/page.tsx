import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import { TopicForm } from "@/components/topic-form";
import { prisma } from "@/lib/db";
import {
  formatDisplayDate,
  getEffectiveExamDate,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TopicDetailPage({ params }: PageProps) {
  const { id } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { subject: true },
  });

  if (!topic) notFound();

  const exam = getEffectiveExamDate(
    topic.examDateOverride,
    topic.subject.examDate
  );

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
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Studied {formatDisplayDate(topic.dateStudied)} · Effective exam{" "}
            {formatDisplayDate(exam)}
            {topic.examDateOverride ? " (topic override)" : " (from subject)"}
          </p>
        </div>
        <DeleteButton
          id={topic.id}
          entity="topic"
          name={topic.name}
          subjectId={topic.subjectId}
        />
      </div>

      {topic.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes / content</CardTitle>
            <CardDescription>
              Reference material for quizzes and Feynman grading (later phases).
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
