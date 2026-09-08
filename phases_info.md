# Adaptive Revision Planner — Phase Implementation Log

Living document of what was built in each phase. Updated after every phase completes.

---

## Phase 1 — Project scaffolding & data model

**Status:** Complete  
**Date:** 2026-09-07

### Goals

- Scaffold Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + SQLite
- Define data models for Subject, Topic, and RevisionAttempt
- Basic CRUD UI for Subjects and Topics (no AI, no scheduling yet)

### What was built

#### Stack & tooling

| Piece | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript | `src/` directory |
| Styling | Tailwind CSS v4 + shadcn/ui (base-nova) | Components under `src/components/ui/` |
| Database | SQLite via Prisma 6 | `DATABASE_URL=file:./dev.db` in `.env` |
| Auth | Single-user (no login) | As specified for the mini project |
| AI | Not yet | Starts in Phase 4 |

Prisma was pinned to **v6** (not v7) so SQLite works with the classic client — no driver adapters required. Easy to explain in a viva and easy to swap to Postgres later by changing the Prisma `provider`.

#### Data model (`prisma/schema.prisma`)

- **Subject** — `name`, optional `examDate`, timestamps; has many Topics
- **Topic** — `name`, `subjectId`, `dateStudied`, optional `examDateOverride`, `notes`, `currentMasteryScore` (default 0), `nextRevisionDate` (null in Phase 1), `isActive` (default true)
- **RevisionAttempt** — `topicId`, `date`, `type` (`quiz` \| `explanation`), `score`, optional `feedback` JSON string — schema ready for Phase 3+; no UI yet

Cascade deletes: deleting a Subject removes its Topics; deleting a Topic removes its Attempts.

#### Application structure

```
src/
  app/
    page.tsx                 # Home overview (counts + recent subjects)
    subjects/
      page.tsx               # Subject list
      new/page.tsx           # Create subject
      [id]/page.tsx         # Subject detail: edit, add topics, topic list
    topics/
      page.tsx               # Flat topic list
      [id]/page.tsx         # Topic detail + edit
  components/
    app-header.tsx
    subject-form.tsx
    topic-form.tsx
    delete-button.tsx
    ui/                      # shadcn primitives
  lib/
    db.ts                    # Prisma singleton
    actions.ts               # Server actions (CRUD)
    dates.ts                 # Date display / form helpers
    utils.ts                 # cn() helper
```

#### CRUD behaviour

- Create / edit / delete Subjects (exam date optional)
- Create / edit / delete Topics under a subject
- Topics can override the subject exam date
- Notes field stored for later AI quiz generation & Feynman grading
- Mastery score and next revision date are displayed but not computed yet

### How to run / test Phase 1

```bash
# Install (first time)
npm install

# Ensure DB is migrated (already applied if you cloned after Phase 1)
npx prisma migrate dev

# Start the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Manual test checklist**

1. Create a subject with an exam date  
2. Open the subject and add 2 topics (one with notes, one with exam override)  
3. Edit subject name / exam date and confirm list updates  
4. Edit a topic and toggle Active off  
5. Delete a topic, then delete a subject (confirm cascade)  
6. Check `/topics` lists everything across subjects  

Optional: `npx prisma studio` to inspect SQLite rows.

### Explicitly NOT in Phase 1

- Spaced-repetition / SM-2 scheduling  
- Exam-date compression / auto-archive  
- Quizzes, AI question generation, Feynman mode  
- Dashboard “due today” groupings  
- OpenAI / any AI provider  

### Environment

- `.env` — `DATABASE_URL` for SQLite  
- `.env.example` — documents `DATABASE_URL` and future `OPENAI_API_KEY`  
- Never commit real API keys  

---

## Phase 2 — Baseline spaced-repetition scheduler (exam-date aware)

**Status:** Complete  
**Date:** 2026-09-07

### Goals

- Implement a simplified SM-2-style interval calculator as pure, testable functions
- Add exam-date ceiling: intervals compress as the exam nears; no revision past exam date
- Auto-archive topics once their effective exam date has passed
- On topic create, auto-generate the first `nextRevisionDate`
- Dashboard: "Due today," "Due this week," "Upcoming," grouped by subject

### What was built

#### Scheduler (`src/lib/scheduler.ts`)

Pure functions with no database dependency:

| Function | Purpose |
| --- | --- | --- |
| `getBaseIntervalDays` | SM-2-inspired ladder: 1 → 3 → 7 → 14 → 30 → 60 days; poor scores reset to 1 day |
| `applyExamCompression` | Shrinks intervals within 14 days of exam; caps at days remaining |
| `calculateNextRevision` | Combines interval + exam ceiling; returns `null` when exam passed |
| `scheduleInitialRevision` | First review for a newly studied topic |
| `scheduleAfterAttempt` | Ready for Phase 3 — recalculates after quiz/explanation score |
| `classifyRevisionBucket` | Buckets a date into due-today / this-week / upcoming |

#### Schedule service (`src/lib/schedule-service.ts`)

- `buildInitialTopicSchedule` — used when creating topics
- `archiveExpiredTopics` — sets `isActive: false` when exam date has passed
- `backfillMissingSchedules` — assigns dates to Phase 1 topics that had `null`
- `syncScheduleState` — runs archive + backfill before dashboard reads
- `applyAttemptSchedule` — entry point for Phase 3 quiz scoring

#### Dashboard (`src/lib/dashboard.ts` + `src/components/revision-dashboard.tsx`)

Home page (`/`) now shows:

- Summary counts for due today / this week / upcoming
- Three columns grouped by **subject**, with overdue badge on late items
- Empty state when no active scheduled topics

#### Integration

- `createTopic` sets `nextRevisionDate` and `isActive` via scheduler
- `updateTopic` reschedules when study/exam dates change; archives if exam expired
- Subject detail, topics list, and topic detail show next revision date

### How to run / test Phase 2

```bash
npm install
npx prisma migrate dev   # no new migration — schema unchanged
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Manual test checklist**

1. Create a subject with an exam date ~2 weeks away  
2. Add a topic studied today — confirm **next revision** is ~1 day out on subject page  
3. Add a topic studied 5 days ago — confirm it appears under **Due today** (overdue) on home  
4. Add a topic with exam override in the past — confirm it becomes **Inactive** after save/dashboard load  
5. Edit a subject exam date to tomorrow — confirm intervals compress on affected topics  
6. Check dashboard groups topics under the correct subject headings  

**Scheduler sanity check (Node REPL / tsx)**

```bash
npx tsx -e "
import { scheduleInitialRevision, applyExamCompression } from './src/lib/scheduler.ts';
const exam = new Date('2026-09-20T12:00:00');
const studied = new Date('2026-09-07T12:00:00');
console.log(scheduleInitialRevision(studied, exam));
console.log('compressed 30d @ 5 days out:', applyExamCompression(30, exam, new Date('2026-09-15T12:00:00')));
"
```

### Explicitly NOT in Phase 2

- Quiz taking or scoring  
- AI question generation / Feynman mode  
- Bayesian mastery model (Phase 6)  
- Mastery trend charts (Phase 7)  

---

## Phase 3 — Manual quiz engine

**Status:** Complete  
**Date:** 2026-09-08

### Goals

- Let the user manually add questions (MCQ + short answer) per topic
- Build a quiz-taking flow for due topics
- Score the quiz and store as a `RevisionAttempt`
- Feed the score into the Phase 2 scheduler to recalculate the next revision date

### What was built

#### Data model

- **Question** — `topicId`, `type` (`mcq` \| `short`), `prompt`, optional `options` JSON, `correctAnswer`, `sortOrder`
- Cascade delete with Topic

#### Quiz scoring (`src/lib/quiz-scoring.ts`)

| Function | Purpose |
| --- | --- |
| `scoreMcqAnswer` | Exact match on selected option text (case-insensitive) |
| `scoreShortAnswer` | Normalized exact match, substring match, or ≥85% string similarity |
| `scoreQuiz` | Averages per-question results into a 0–100 score + structured feedback |

Alternate short answers can be separated with `|` in the stored correct answer.

#### Server actions (`src/lib/actions.ts`)

- `createQuestion` — add MCQ (2–4 options) or short-answer to a topic
- `deleteQuestion` — remove from question bank
- `submitQuiz` — score answers, create `RevisionAttempt` with JSON feedback, call `applyAttemptSchedule`

`applyAttemptSchedule` now also updates `currentMasteryScore` to the latest quiz score (placeholder until Phase 6 BKT).

#### UI

| Route / component | Purpose |
| --- | --- |
| `/topics/[id]` | Question bank (list + add form), recent attempts, **Start revision quiz** / **Practice quiz** |
| `/topics/[id]/quiz` | Full quiz session with per-question MCQ radios or short-answer inputs |
| `QuizSession` | Client submit flow + results breakdown |
| Dashboard **Revise** button | Quick link to quiz for due/overdue topics |

#### Scheduler integration

After quiz submit:

1. `RevisionAttempt` stored with `type: "quiz"`, score, and per-question feedback JSON
2. `scheduleAfterAttempt` recalculates `nextRevisionDate` (poor scores pull intervals closer)
3. Topic `currentMasteryScore` updated to quiz percentage

### How to run / test Phase 3

```bash
npm install
npx prisma migrate dev   # applies Question table migration
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Manual test checklist**

1. Open a topic and add 2 MCQ + 1 short-answer question  
2. Confirm questions appear in the bank with correct answers shown  
3. Click **Start revision quiz** (or **Practice quiz** if not yet due)  
4. Submit with mixed correct/incorrect answers — verify score breakdown  
5. Confirm **Recent attempts** shows the quiz and **Next revision** date changed  
6. Score below 60% — next revision should compress to ~1 day out  
7. Score 80%+ — next revision should extend on the SM-2 ladder  
8. From home dashboard, use **Revise** on a due topic  

**Scoring sanity check**

```bash
npx tsx -e "
import { scoreShortAnswer, scoreQuiz } from './src/lib/quiz-scoring.ts';
console.log('close match:', scoreShortAnswer('O(log n)', 'O(log n)'));
console.log('quiz:', scoreQuiz(
  [{ id: '1', type: 'mcq', correctAnswer: 'A', options: null }],
  { '1': 'A' }
));
"
```

### Explicitly NOT in Phase 3

- AI question generation (Phase 4)  
- Feynman / explain-it-back mode (Phase 5)  
- Bayesian mastery model (Phase 6)  
- Mastery trend charts (Phase 7)  

---

## Phase 4 — OpenAI-powered question generation

**Status:** Complete  
**Date:** 2026-09-08

### Goals

- Add an AI provider abstraction with an OpenAI implementation
- Given topic notes, generate a mixed set of quiz questions as strict JSON
- **Generate questions with AI** on the topic page with review/edit before saving

### What was built

#### AI layer (`src/lib/ai/`)

| File | Purpose |
| --- | --- |
| `provider.ts` | `AIProvider` interface — vendor-neutral contract |
| `openai-provider.ts` | OpenAI Chat Completions + JSON mode (`gpt-4o-mini` default) |
| `types.ts` | `GeneratedQuestion`, `QuestionDraft`, input/result types |
| `validate.ts` | Parse AI JSON, validate drafts before DB insert |
| `index.ts` | `getAIProvider()` factory (`AI_PROVIDER=openai`) |

Swapping providers later: implement `AIProvider` and register in `getAIProvider()` — no changes to UI or quiz logic.

#### Server actions

- `generateQuestionsWithAI(topicId)` — reads topic notes, calls provider, returns editable drafts
- `saveGeneratedQuestions(topicId, drafts)` — validates, then batch-inserts into `Question` table

#### UI (`AiQuestionGenerator`)

On the topic **Question bank** card:

1. **Generate questions with AI** (requires topic notes)
2. Review panel — edit type, prompt, options, correct answer; remove items
3. **Save to question bank** or **Discard**

Clear errors when `OPENAI_API_KEY` is missing or the API fails.

### Environment

Add to `.env` (see `.env.example`):

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # optional
AI_PROVIDER=openai         # optional, default openai
```

Never commit a real API key.

### How to run / test Phase 4

```bash
npm install
# Set OPENAI_API_KEY in .env
npm run dev
```

Open a topic that has **notes**, then:

1. Click **Generate questions with AI** — wait for drafts  
2. Edit a question (change wording or fix an option)  
3. Remove one draft, save the rest — confirm they appear in the question bank  
4. Take a quiz with the saved AI questions  
5. Try generating without notes — confirm the disabled state / alert  
6. Unset `OPENAI_API_KEY` — confirm a clear error message  

### Explicitly NOT in Phase 4

- Feynman / explain-it-back mode (Phase 5)  
- Bayesian mastery model (Phase 6)  
- Mastery trend charts (Phase 7)  

---

## Phase 5 — Feynman / explain-it-back mode

**Status:** Complete  
**Date:** 2026-09-08

### Goals

- New revision mode: student writes a free-form explanation instead of a quiz
- Send explanation + reference notes to OpenAI for structured grading
- Display comprehension score, gaps, and comment; store as `RevisionAttempt`
- Feed the score into the same scheduler as quiz attempts

### What was built

#### AI provider extension

| Method | Purpose |
| --- | --- |
| `gradeExplanation(input)` | Returns `{ score, comment, gaps[] }` as strict JSON |

Implemented in `openai-provider.ts`; validated via `parseExplanationFeedback()` in `validate.ts`.

#### Server action

- `submitExplanation(topicId, explanation)` — validates length (≥40 chars), calls AI, stores attempt with `type: "explanation"`, runs `applyAttemptSchedule`

Feedback JSON stored on the attempt:

```json
{
  "comment": "…",
  "gaps": ["…", "…"],
  "explanation": "student text…"
}
```

#### UI

| Route / component | Purpose |
| --- | --- |
| `/topics/[id]/explain` | Feynman revision session |
| `ExplanationSession` | Textarea → AI grading → results with gaps |
| Topic page | **Explain it back** / **Practice explanation** button (requires notes) |
| Dashboard | **Explain** button next to **Quiz** when topic has notes |
| Recent attempts | Shows AI comment preview for explanation attempts |

Notes are **not** shown during the explanation (student explains from memory); AI compares against notes server-side only.

### How to run / test Phase 5

```bash
npm install
# OPENAI_API_KEY required in .env
npm run dev
```

1. Ensure a topic has **notes** and is **active**  
2. Open **Explain it back** from the topic page or dashboard  
3. Write a paragraph explaining the topic (≥40 characters)  
4. Submit — review score, overall comment, and 2–3 gaps  
5. Confirm **Recent attempts** and **Next revision** updated on the topic page  
6. Compare a strong vs weak explanation — schedule should extend vs compress  

### Explicitly NOT in Phase 5

- Bayesian mastery model (Phase 6)  
- Mastery trend charts (Phase 7)  

---

## Phase 6 — Adaptive mastery engine upgrade

**Status:** Complete  
**Date:** 2026-09-08

### Goals

- Replace flat SM-2 score updates with a lightweight BKT-inspired mastery model
- Factor in time decay between reviews
- Recalculate next revision from mastery estimate (still exam-date capped)
- Show mastery estimate and trend on the topic detail page

### What was built

#### Mastery model (`src/lib/mastery.ts`)

| Concept | Implementation |
| --- | --- |
| Prior | `P_L0 = 0.2` (~20% for new topics) |
| Observation | Soft BKT update from 0–100 quiz/explanation score |
| Forgetting | Exponential decay between reviews (`DECAY_RATE_PER_DAY`) |
| Display | `currentMasteryScore` stores 0–100 estimate |

Key functions: `computeMasteryFromAttempts`, `estimateCurrentMastery`, `buildMasteryTimeline`, `masteryBand`.

#### Scheduling (`src/lib/scheduler.ts`)

- `intervalDaysFromMastery` — maps mastery % to interval ladder (1→60 days)
- `scheduleFromMastery` — replaces `scheduleAfterAttempt` for post-attempt scheduling
- Poor latest attempt (&lt;60) still forces a 1-day reset
- Exam compression unchanged

#### Integration (`src/lib/schedule-service.ts`)

- `applyAttemptSchedule` replays attempt history → BKT mastery → `scheduleFromMastery`
- `refreshMasteryEstimates` runs on dashboard sync (applies time decay to stored scores)
- New topics start at ~20% mastery

#### UI (`MasteryPanel` on topic page)

- Current mastery % with band label (Needs work → Mastered)
- **Mastery trend** table: each attempt → mastery after update
- Header badge shows estimated mastery (includes decay)

### How to run / test Phase 6

```bash
npm install
npm run dev
```

1. Create a topic — confirm mastery ~20% on topic page  
2. Take a quiz with a high score — mastery should rise; next revision extends  
3. Take a quiz with score &lt;60 — mastery drops; next revision ~1 day  
4. Check **Mastery trend** shows running estimates after each attempt  
5. Reload dashboard — decay may lower mastery for topics idle several days  

**Sanity check**

```bash
npx tsx -e "
import { computeMasteryFromAttempts, bktUpdateFromScore, P_L0 } from './src/lib/mastery.ts';
const studied = new Date('2026-09-01');
const attempts = [{ date: new Date('2026-09-05'), score: 85 }];
console.log('after good quiz:', computeMasteryFromAttempts(studied, attempts));
console.log('single update:', Math.round(bktUpdateFromScore(P_L0, 85) * 100));
"
```

### Explicitly NOT in Phase 6

- Recharts mastery charts (Phase 7)  
- Email/push reminders (Phase 7)  

---

## Phase 7 — Dashboard polish & analytics

**Status:** Not started  
