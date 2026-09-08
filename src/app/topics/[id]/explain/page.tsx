import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ExplanationSession } from "@/components/explanation-session";
import { prisma } from "@/lib/db";
import { formatDisplayDate } from "@/lib/dates";
import { isRevisionDue } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TopicExplainPage({ params }: PageProps) {
  const { id } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { subject: true },
  });

  if (!topic) notFound();

  if (!topic.isActive) {
    redirect(`/topics/${id}`);
  }

  if (!topic.notes?.trim()) {
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
          Explain it back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {topic.subject.name} · Feynman revision mode
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">AI-graded</Badge>
          {due ? (
            <Badge variant="default">Due for revision</Badge>
          ) : (
            <Badge variant="outline">
              Next revision {formatDisplayDate(topic.nextRevisionDate)}
            </Badge>
          )}
        </div>
      </div>

      <ExplanationSession topicId={topic.id} topicName={topic.name} />
    </div>
  );
}
