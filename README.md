# Adaptive Revision Planner

Personalized, exam-aware spaced-repetition planner for students. Built as a phased Next.js mini project.

See **[phases_info.md](./phases_info.md)** for what each phase implements and how to test it.

## Current phase

**Phase 7 (complete)** — Recharts analytics, retention health summary, due banner, UI polish.

## Quick start

```bash
npm install
npx prisma migrate dev
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

See **[phases_info.md](./phases_info.md)** for the full phased build log and test checklists.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

## Environment

Copy `.env.example` to `.env` if needed.

```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=sk-...   # Phases 4–5 AI features (never commit a real key)
```

Optional: `OPENAI_MODEL`, `AI_PROVIDER`.
