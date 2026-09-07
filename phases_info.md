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

**Status:** Not started  

---

## Phase 4 — OpenAI-powered question generation

**Status:** Not started  

---

## Phase 5 — Feynman / explain-it-back mode

**Status:** Not started  

---

## Phase 6 — Adaptive mastery engine upgrade

**Status:** Not started  

---

## Phase 7 — Dashboard polish & analytics

**Status:** Not started  
