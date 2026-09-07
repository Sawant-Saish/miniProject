import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubjectForm } from "@/components/subject-form";

export default function NewSubjectPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/subjects" className="hover:underline">
            ← Subjects
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New subject
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject details</CardTitle>
          <CardDescription>
            Name the subject and optionally set an exam date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
