import Link from "next/link";
import { BookMarked, Layers, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [subjectCount, topicCount, subjects] = await Promise.all([
    prisma.subject.count(),
    prisma.topic.count(),
    prisma.subject.findMany({
      include: {
        topics: {
          orderBy: { dateStudied: "desc" },
          take: 3,
        },
        _count: { select: { topics: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Adaptive Revision Planner
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Track subjects and topics you have studied. Later phases add exam-aware
          spaced repetition, quizzes, and AI-powered explain-it-back grading.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/subjects" className={cn(buttonVariants())}>
            <Layers className="size-4" />
            Manage subjects
          </Link>
          <Link
            href="/topics"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <BookMarked className="size-4" />
            All topics
          </Link>
          <Link
            href="/subjects/new"
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            <Plus className="size-4" />
            New subject
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Subjects</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{subjectCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Topics</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{topicCount}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Recent subjects</h2>
          <Link
            href="/subjects"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>

        {subjects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No subjects yet.{" "}
              <Link href="/subjects/new" className="underline underline-offset-2">
                Create your first subject
              </Link>{" "}
              to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {subjects.map((subject) => (
              <Card key={subject.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle>
                      <Link
                        href={`/subjects/${subject.id}`}
                        className="hover:underline"
                      >
                        {subject.name}
                      </Link>
                    </CardTitle>
                    <Badge variant="secondary">
                      {subject._count.topics} topic
                      {subject._count.topics === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Exam: {formatDisplayDate(subject.examDate)}
                  </CardDescription>
                </CardHeader>
                {subject.topics.length > 0 ? (
                  <CardContent>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {subject.topics.map((topic) => (
                        <li key={topic.id}>
                          <Link
                            href={`/topics/${topic.id}`}
                            className="hover:text-foreground hover:underline"
                          >
                            {topic.name}
                          </Link>
                          <span className="text-xs">
                            {" "}
                            · studied {formatDisplayDate(topic.dateStudied)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
