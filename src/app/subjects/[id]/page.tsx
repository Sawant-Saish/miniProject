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
import { Separator } from "@/components/ui/separator";
import { DeleteButton } from "@/components/delete-button";
import { SubjectForm } from "@/components/subject-form";
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

export default async function SubjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      topics: { orderBy: { dateStudied: "desc" } },
    },
  });

  if (!subject) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/subjects" className="hover:underline">
              ← Subjects
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {subject.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Exam: {formatDisplayDate(subject.examDate)}
          </p>
        </div>
        <DeleteButton id={subject.id} entity="subject" name={subject.name} />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Edit subject</CardTitle>
            <CardDescription>Update name or exam date.</CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectForm
              mode="edit"
              subject={{
                id: subject.id,
                name: subject.name,
                examDate: subject.examDate,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add topic</CardTitle>
            <CardDescription>
              Topics you have studied under this subject.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopicForm mode="create" subjectId={subject.id} />
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">
          Topics ({subject.topics.length})
        </h2>

        {subject.topics.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No topics yet. Use the form above to add your first topic.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {subject.topics.map((topic) => {
              const exam = getEffectiveExamDate(
                topic.examDateOverride,
                subject.examDate
              );
              return (
                <Card key={topic.id}>
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div className="space-y-1">
                      <CardTitle>
                        <Link
                          href={`/topics/${topic.id}`}
                          className="hover:underline"
                        >
                          {topic.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>
                        Studied {formatDisplayDate(topic.dateStudied)} · Next
                        revision {formatDisplayDate(topic.nextRevisionDate)} ·
                        Exam {formatDisplayDate(exam)}
                        {topic.examDateOverride ? " (override)" : ""}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={topic.isActive ? "secondary" : "outline"}>
                        {topic.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">
                        Mastery {Math.round(topic.currentMasteryScore)}%
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
