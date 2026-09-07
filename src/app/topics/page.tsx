import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import {
  formatDisplayDate,
  getEffectiveExamDate,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const topics = await prisma.topic.findMany({
    include: { subject: true },
    orderBy: [{ subject: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">All topics</h1>
        <p className="text-sm text-muted-foreground">
          Flat list of every topic across subjects. Add topics from a subject
          page.
        </p>
      </div>

      {topics.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No topics yet.{" "}
            <Link href="/subjects" className="underline underline-offset-2">
              Open a subject
            </Link>{" "}
            and add one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {topics.map((topic) => {
            const exam = getEffectiveExamDate(
              topic.examDateOverride,
              topic.subject.examDate
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
                      <Link
                        href={`/subjects/${topic.subjectId}`}
                        className="hover:underline"
                      >
                        {topic.subject.name}
                      </Link>
                      {" · "}
                      Studied {formatDisplayDate(topic.dateStudied)} · Next
                      revision {formatDisplayDate(topic.nextRevisionDate)} · Exam{" "}
                      {formatDisplayDate(exam)}
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
    </div>
  );
}
