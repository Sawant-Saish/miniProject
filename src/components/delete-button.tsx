"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSubject, deleteTopic } from "@/lib/actions";

type DeleteButtonProps = {
  id: string;
  entity: "subject" | "topic";
  label?: string;
  name?: string;
  /** After deleting a topic, return to this subject page */
  subjectId?: string;
};

export function DeleteButton({
  id,
  entity,
  label = "Delete",
  name,
  subjectId,
}: DeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const detail = name ? ` "${name}"` : "";
    const warning =
      entity === "subject"
        ? `Delete subject${detail}? All of its topics will also be deleted.`
        : `Delete topic${detail}? This cannot be undone.`;

    if (!window.confirm(warning)) return;

    const formData = new FormData();
    formData.set("id", id);

    startTransition(async () => {
      const result =
        entity === "subject"
          ? await deleteSubject(formData)
          : await deleteTopic(formData);

      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      if (entity === "subject") {
        router.push("/subjects");
      } else if (subjectId) {
        router.push(`/subjects/${subjectId}`);
      } else {
        router.push("/topics");
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? "Deleting…" : label}
    </Button>
  );
}
