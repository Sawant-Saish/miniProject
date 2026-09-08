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

// ---------------------------------------------------------------------------
// Questions (Phase 3)
// ---------------------------------------------------------------------------

function parseMcqOptions(formData: FormData): string[] {
  const options = [
    String(formData.get("optionA") ?? "").trim(),
    String(formData.get("optionB") ?? "").trim(),
    String(formData.get("optionC") ?? "").trim(),
    String(formData.get("optionD") ?? "").trim(),
  ].filter(Boolean);

  return options;
}

export async function createQuestion(formData: FormData) {
  const topicId = String(formData.get("topicId") ?? "");
  const type = String(formData.get("type") ?? "mcq");
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (!topicId || !prompt) {
    return { ok: false as const, error: "Topic and question prompt are required." };
  }

  if (type !== "mcq" && type !== "short") {
    return { ok: false as const, error: "Question type must be mcq or short." };
  }

  try {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return { ok: false as const, error: "Topic not found." };
    }

    let options: string | null = null;
    let correctAnswer = "";

    if (type === "mcq") {
      const mcqOptions = parseMcqOptions(formData);
      const correctIndex = Number(formData.get("correctOption") ?? -1);

      if (mcqOptions.length < 2) {
        return {
          ok: false as const,
          error: "MCQ questions need at least two options.",
        };
      }
      if (correctIndex < 0 || correctIndex >= mcqOptions.length) {
        return {
          ok: false as const,
          error: "Select which option is correct.",
        };
      }

      options = JSON.stringify(mcqOptions);
      correctAnswer = mcqOptions[correctIndex];
    } else {
      correctAnswer = String(formData.get("correctAnswer") ?? "").trim();
      if (!correctAnswer) {
        return {
          ok: false as const,
          error: "Short-answer questions need a correct answer.",
        };
      }
    }

    const count = await prisma.question.count({ where: { topicId } });

    await prisma.question.create({
      data: {
        topicId,
        type,
        prompt,
        options,
        correctAnswer,
        sortOrder: count,
      },
    });

    revalidatePath(`/topics/${topicId}`);
    revalidatePath(`/topics/${topicId}/quiz`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

export async function deleteQuestion(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const topicId = String(formData.get("topicId") ?? "");

  if (!id || !topicId) {
    return { ok: false as const, error: "Question id and topic id are required." };
  }

  try {
    await prisma.question.delete({ where: { id } });
    revalidatePath(`/topics/${topicId}`);
    revalidatePath(`/topics/${topicId}/quiz`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

export async function submitQuiz(
  topicId: string,
  answers: Record<string, string>
) {
  if (!topicId) {
    return { ok: false as const, error: "Topic id is required." };
  }

  try {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        subject: { select: { examDate: true } },
      },
    });

    if (!topic) {
      return { ok: false as const, error: "Topic not found." };
    }
    if (!topic.isActive) {
      return { ok: false as const, error: "This topic is inactive." };
    }
    if (topic.questions.length === 0) {
      return {
        ok: false as const,
        error: "Add at least one question before taking a quiz.",
      };
    }

    const { scoreQuiz } = await import("@/lib/quiz-scoring");
    const { applyAttemptSchedule } = await import("@/lib/schedule-service");

    const result = scoreQuiz(topic.questions, answers);
    const reviewDate = new Date();

    await prisma.revisionAttempt.create({
      data: {
        topicId,
        type: "quiz",
        score: result.score,
        date: reviewDate,
        feedback: JSON.stringify({
          correctCount: result.correctCount,
          totalCount: result.totalCount,
          results: result.results,
        }),
      },
    });

    await applyAttemptSchedule(topicId, result.score, reviewDate);

    revalidatePath("/");
    revalidatePath("/topics");
    revalidatePath(`/topics/${topicId}`);
    revalidatePath(`/topics/${topicId}/quiz`);

    return {
      ok: true as const,
      score: result.score,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      results: result.results,
    };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

// ---------------------------------------------------------------------------
// AI question generation (Phase 4)
// ---------------------------------------------------------------------------

export async function generateQuestionsWithAI(topicId: string) {
  if (!topicId) {
    return { ok: false as const, error: "Topic id is required." };
  }

  try {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return { ok: false as const, error: "Topic not found." };
    }

    const notes = topic.notes?.trim();
    if (!notes) {
      return {
        ok: false as const,
        error: "Add notes or content to this topic before generating questions.",
      };
    }

    const { getAIProvider } = await import("@/lib/ai");
    const provider = getAIProvider();
    const result = await provider.generateQuizQuestions({
      topicName: topic.name,
      notes,
    });

    return { ok: true as const, questions: result.questions };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

export async function saveGeneratedQuestions(
  topicId: string,
  drafts: Array<{
    type: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
  }>
) {
  if (!topicId) {
    return { ok: false as const, error: "Topic id is required." };
  }

  if (!Array.isArray(drafts) || drafts.length === 0) {
    return { ok: false as const, error: "No questions to save." };
  }

  try {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return { ok: false as const, error: "Topic not found." };
    }

    const { normalizeQuestionDraft, validateQuestionDraft } = await import(
      "@/lib/ai"
    );

    const normalized = [];
    for (let i = 0; i < drafts.length; i++) {
      const draft = {
        type: drafts[i].type as "mcq" | "short",
        prompt: String(drafts[i].prompt ?? ""),
        options: Array.isArray(drafts[i].options)
          ? drafts[i].options.map(String)
          : [],
        correctAnswer: String(drafts[i].correctAnswer ?? ""),
      };

      const validationError = validateQuestionDraft(draft, i);
      if (validationError) {
        return { ok: false as const, error: validationError };
      }

      normalized.push(normalizeQuestionDraft(draft));
    }

    const existingCount = await prisma.question.count({ where: { topicId } });

    await prisma.$transaction(
      normalized.map((question, index) =>
        prisma.question.create({
          data: {
            topicId,
            type: question.type,
            prompt: question.prompt,
            options: question.options,
            correctAnswer: question.correctAnswer,
            sortOrder: existingCount + index,
          },
        })
      )
    );

    revalidatePath(`/topics/${topicId}`);
    revalidatePath(`/topics/${topicId}/quiz`);

    return { ok: true as const, savedCount: normalized.length };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}

// ---------------------------------------------------------------------------
// Feynman / explain-it-back (Phase 5)
// ---------------------------------------------------------------------------

const MIN_EXPLANATION_LENGTH = 40;

export async function submitExplanation(topicId: string, explanation: string) {
  if (!topicId) {
    return { ok: false as const, error: "Topic id is required." };
  }

  const trimmed = explanation.trim();
  if (trimmed.length < MIN_EXPLANATION_LENGTH) {
    return {
      ok: false as const,
      error: `Write at least ${MIN_EXPLANATION_LENGTH} characters explaining the topic in your own words.`,
    };
  }

  try {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { subject: { select: { examDate: true } } },
    });

    if (!topic) {
      return { ok: false as const, error: "Topic not found." };
    }
    if (!topic.isActive) {
      return { ok: false as const, error: "This topic is inactive." };
    }

    const notes = topic.notes?.trim();
    if (!notes) {
      return {
        ok: false as const,
        error: "This topic needs reference notes before explain-it-back grading.",
      };
    }

    const { getAIProvider } = await import("@/lib/ai");
    const { applyAttemptSchedule } = await import("@/lib/schedule-service");

    const provider = getAIProvider();
    const { feedback } = await provider.gradeExplanation({
      topicName: topic.name,
      notes,
      explanation: trimmed,
    });

    const reviewDate = new Date();

    await prisma.revisionAttempt.create({
      data: {
        topicId,
        type: "explanation",
        score: feedback.score,
        date: reviewDate,
        feedback: JSON.stringify({
          comment: feedback.comment,
          gaps: feedback.gaps,
          explanation: trimmed,
        }),
      },
    });

    await applyAttemptSchedule(topicId, feedback.score, reviewDate);

    revalidatePath("/");
    revalidatePath("/topics");
    revalidatePath(`/topics/${topicId}`);
    revalidatePath(`/topics/${topicId}/explain`);

    return {
      ok: true as const,
      score: feedback.score,
      comment: feedback.comment,
      gaps: feedback.gaps,
    };
  } catch (error) {
    return { ok: false as const, error: formatError(error) };
  }
}
