import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuizSession } from "@/components/quiz-session";
import { prisma } from "@/lib/db";
import { formatDisplayDate } from "@/lib/dates";
import { isRevisionDue } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TopicQuizPage({ params }: PageProps) {
  const { id } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      subject: true,
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!topic) notFound();

  if (!topic.isActive) {
    redirect(`/topics/${id}`);
  }

  if (topic.questions.length === 0) {
    redirect(`/topics/${id}`);
  }

  const due = isRevisionDue(topic.nextRevisionDate);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/topics/${id}`} className="hover:underline">
            ← {topic.name}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Revision quiz
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {topic.subject.name} · {topic.questions.length} question
          {topic.questions.length === 1 ? "" : "s"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {due ? (
            <Badge variant="default">Due for revision</Badge>
          ) : (
            <Badge variant="outline">
              Next revision {formatDisplayDate(topic.nextRevisionDate)}
            </Badge>
          )}
        </div>
      </div>

      <QuizSession
        topicId={topic.id}
        topicName={topic.name}
        questions={topic.questions}
      />
    </div>
  );
}
