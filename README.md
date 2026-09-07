# Adaptive Revision Planner

Personalized, exam-aware spaced-repetition planner for students. Built as a phased Next.js mini project.

See **[phases_info.md](./phases_info.md)** for what each phase implements and how to test it.

## Current phase

**Phase 2** — exam-aware SM-2 scheduler, auto-archive, revision dashboard.

## Quick start

```bash
npm install
npx prisma migrate dev
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## Environment

Copy `.env.example` to `.env` if needed. Phases 1–2 only need:

```
DATABASE_URL="file:./dev.db"
```

`OPENAI_API_KEY` is required from Phase 4 onward (never commit a real key).
