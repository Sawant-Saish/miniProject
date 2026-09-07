"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  buildInitialTopicSchedule,
  resolveTopicScheduleState,
} from "@/lib/schedule-service";
import { scheduleInitialRevision } from "@/lib/scheduler";

/** Parse an HTML date input (YYYY-MM-DD) into a Date at local noon to avoid TZ edge cases. */
function parseDateInput(value: string | null | undefined): Date | null {
  if (!value || value.trim() === "") return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function createSubject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const examDate = parseDateInput(String(formData.get("examDate") ?? ""));

  if (!name) {
    return { ok: false as const, error: "Subject name is required." };
  }

  try {
    await prisma.subject.create({
      data: {
        name,
        examDate: examDate ?? undefined,
      },
    });
    revalidatePath("/");
    revalidatePath("/subjects");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

export async function updateSubject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const examDate = parseDateInput(String(formData.get("examDate") ?? ""));

  if (!id || !name) {
    return { ok: false as const, error: "Subject id and name are required." };
  }

  try {
    await prisma.subject.update({
      where: { id },
      data: {
        name,
        examDate, // null clears the exam date
      },
    });
    revalidatePath("/");
    revalidatePath("/subjects");
    revalidatePath(`/subjects/${id}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

export async function deleteSubject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { ok: false as const, error: "Subject id is required." };
  }

  try {
    // Topics cascade-delete via Prisma schema relation
    await prisma.subject.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/subjects");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export async function createTopic(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dateStudied = parseDateInput(String(formData.get("dateStudied") ?? ""));
  const examDateOverride = parseDateInput(
    String(formData.get("examDateOverride") ?? "")
  );
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!subjectId || !name) {
    return { ok: false as const, error: "Subject and topic name are required." };
  }
  if (!dateStudied) {
    return { ok: false as const, error: "Date studied is required." };
  }

  try {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return { ok: false as const, error: "Subject not found." };
    }

    const schedule = buildInitialTopicSchedule(
      dateStudied,
      examDateOverride,
      subject.examDate
    );

    await prisma.topic.create({
      data: {
        name,
        subjectId,
        dateStudied,
        examDateOverride,
        notes,
        currentMasteryScore: 0,
        nextRevisionDate: schedule.nextRevisionDate,
        isActive: schedule.isActive,
      },
    });

    revalidatePath("/");
    revalidatePath("/subjects");
    revalidatePath(`/subjects/${subjectId}`);
    revalidatePath("/topics");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

export async function updateTopic(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dateStudied = parseDateInput(String(formData.get("dateStudied") ?? ""));
  const examDateOverride = parseDateInput(
    String(formData.get("examDateOverride") ?? "")
  );
  const notes = String(formData.get("notes") ?? "").trim() || null;
  // Checkbox: present => true; absent on edit form => false
  const isActiveRaw = formData.get("isActive");
  const isActive =
    isActiveRaw === "on" || isActiveRaw === "true" || isActiveRaw === "1";

  if (!id || !name) {
    return { ok: false as const, error: "Topic id and name are required." };
  }
  if (!dateStudied) {
    return { ok: false as const, error: "Date studied is required." };
  }

  try {
    const existing = await prisma.topic.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false as const, error: "Topic not found." };
    }

    const subject = await prisma.subject.findUnique({
      where: { id: existing.subjectId },
    });

    const { examDate, expired } = resolveTopicScheduleState({
      ...existing,
      dateStudied,
      examDateOverride,
      subject: { examDate: subject?.examDate ?? null },
    });

    let nextRevisionDate = existing.nextRevisionDate;
    let nextIsActive = isActive;

    if (expired) {
      nextIsActive = false;
      nextRevisionDate = null;
    } else if (isActive) {
      const datesChanged =
        dateStudied.getTime() !== existing.dateStudied.getTime() ||
        (examDateOverride?.getTime() ?? null) !==
          (existing.examDateOverride?.getTime() ?? null);

      if (!existing.nextRevisionDate || datesChanged) {
        const schedule = scheduleInitialRevision(dateStudied, examDate);
        nextRevisionDate = schedule.nextRevisionDate;
        nextIsActive = schedule.isActive;
      }
    }

    await prisma.topic.update({
      where: { id },
      data: {
        name,
        dateStudied,
        examDateOverride,
        notes,
        isActive: nextIsActive,
        nextRevisionDate,
      },
    });

    revalidatePath("/");
    revalidatePath("/subjects");
    revalidatePath(`/subjects/${existing.subjectId}`);
    revalidatePath(`/topics/${id}`);
    revalidatePath("/topics");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

export async function deleteTopic(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { ok: false as const, error: "Topic id is required." };
  }

  try {
    const existing = await prisma.topic.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false as const, error: "Topic not found." };
    }

    await prisma.topic.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/subjects");
    revalidatePath(`/subjects/${existing.subjectId}`);
    revalidatePath("/topics");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}
