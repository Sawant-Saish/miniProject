import Link from "next/link";
import { Plus } from "lucide-react";
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

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    include: { _count: { select: { topics: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Create subjects and set optional exam dates for scheduling later.
          </p>
        </div>
        <Link href="/subjects/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          New subject
        </Link>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No subjects yet.{" "}
            <Link href="/subjects/new" className="underline underline-offset-2">
              Add one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="space-y-1">
                  <CardTitle>
                    <Link
                      href={`/subjects/${subject.id}`}
                      className="hover:underline"
                    >
                      {subject.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Exam: {formatDisplayDate(subject.examDate)}
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {subject._count.topics} topic
                  {subject._count.topics === 1 ? "" : "s"}
                </Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
