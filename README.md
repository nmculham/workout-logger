# Workout Logger

A full-stack workout logging application with cloud storage (Supabase/Postgres) and optional native mobile builds (Capacitor).

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth (JWT verified server-side on all API routes)
- **Native**: Capacitor (iOS/Android) with local SQLite for offline use

---

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- A Supabase project (free tier works fine)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/workout-logger.git
cd workout-logger
npm install
```

This installs dependencies for both the `client` and `server` workspaces via npm workspaces.

### 2. Set up environment variables

Copy the root env example and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

Copy the client env example:

```bash
cp client/.env.example client/.env
```

Edit `client/.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### 3. Run database migrations

Apply the schema to your Supabase Postgres database:

```bash
cd server && npm run migrate
```

This runs all SQL files in `server/src/db/migrations/` in order, tracking applied migrations in a `schema_migrations` table.

### 4. Run the development servers

Start both the backend and frontend together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run server   # Express API on http://localhost:3001
npm run client   # Vite dev server on http://localhost:5173
```

---

## Supabase Setup

### Enable Email Auth

In your Supabase dashboard: **Authentication > Providers > Email** — ensure it is enabled. For local development you may want to disable email confirmation under **Authentication > Settings**.

### Row Level Security

RLS policies are defined in `supabase/migrations/`. Run these in the Supabase SQL Editor if you want RLS enforced at the database level (optional — the Express API enforces user scoping via JWT on every query).

---

## Project Structure

```
workout-logger/
├── package.json              # Workspace root — runs both client and server
├── .env.example              # Server environment variables template
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Express app entry point + global error handler
│       ├── db/
│       │   ├── postgres.ts   # Pool init and connection
│       │   ├── migrate.ts    # Migration runner (npm run migrate)
│       │   └── migrations/
│       │       ├── 001_initial_schema.sql
│       │       ├── 002_seed_exercises.sql
│       │       ├── 003_templates.sql
│       │       └── 004_workout_exercise_metadata.sql
│       ├── middleware/
│       │   ├── auth.ts       # JWT verification via Supabase, attaches req.userId
│       │   └── asyncHandler.ts  # Wraps async handlers, forwards errors to Express
│       └── routes/
│           ├── workouts.ts   # CRUD for workouts, workout_exercises, and metadata
│           ├── exercises.ts  # CRUD for exercises
│           ├── sets.ts       # CRUD for sets
│           └── templates.ts  # Workout templates (save, apply, delete)
│
├── client/
│   ├── package.json
│   ├── capacitor.config.ts   # Capacitor native build config
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── .env.example
│   └── src/
│       ├── main.tsx
│       ├── App.tsx           # Router, auth state, UnitsProvider
│       ├── index.css         # Global dark theme styles
│       ├── lib/
│       │   ├── api.ts        # API layer — Supabase direct (web) or SQLite (native)
│       │   ├── auth.ts       # Supabase auth helpers
│       │   ├── supabase.ts   # Supabase client instance
│       │   ├── sqlite.ts     # Capacitor SQLite init (native only)
│       │   ├── migrations.ts # Native SQLite migration runner
│       │   ├── sync.ts       # Supabase sync helpers (native only)
│       │   └── audio.ts      # Web Audio API tone generator for tempo timer
│       ├── hooks/
│       │   ├── useTempoTimer.ts  # Tempo phase cycling and countdown logic
│       │   ├── useDialog.ts      # Promise-based in-app confirm/prompt dialogs
│       │   └── useNetwork.ts     # Online/offline detection
│       ├── contexts/
│       │   └── UnitsContext.tsx  # Metric/imperial preference (localStorage)
│       ├── components/
│       │   ├── Nav.tsx           # Top navigation bar
│       │   ├── Dialog.tsx        # In-app modal (replaces window.confirm/prompt)
│       │   ├── ExercisePicker.tsx
│       │   ├── TemplatePicker.tsx
│       │   ├── SetRow.tsx        # Inline editable set row
│       │   └── OfflineBanner.tsx
│       └── pages/
│           ├── Login.tsx
│           ├── Dashboard.tsx        # Overview, recent workouts, stats
│           ├── WorkoutHistory.tsx   # Full workout list
│           ├── NewWorkout.tsx       # Create a new workout session
│           ├── WorkoutDetail.tsx    # Log exercises, sets, and tempo timer
│           ├── ExerciseLibrary.tsx  # Browse and create custom exercises
│           ├── Templates.tsx        # Workout templates
│           ├── Charts.tsx           # Historical progress charts
│           └── Settings.tsx         # Metric/imperial toggle
│
└── supabase/
    └── migrations/              # Postgres schema + RLS policies (for Supabase SQL Editor)
```

---

## API Endpoints

All endpoints (except `/api/health`) require a `Authorization: Bearer <token>` header. Requests are scoped to the authenticated user — no user can access another user's data.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/workouts` | List workouts for the authenticated user |
| GET | `/api/workouts/:id` | Get workout with exercises and sets |
| POST | `/api/workouts` | Create a new workout |
| PUT | `/api/workouts/:id` | Update a workout |
| DELETE | `/api/workouts/:id` | Delete a workout |
| POST | `/api/workouts/:id/exercises` | Add an exercise to a workout |
| DELETE | `/api/workouts/exercises/:weId` | Remove an exercise from a workout |
| PATCH | `/api/workouts/exercises/:weId/metadata` | Update exercise metadata (e.g. tempo) |
| GET | `/api/exercises` | List global + user's custom exercises |
| POST | `/api/exercises` | Create a custom exercise |
| PUT | `/api/exercises/:id` | Update a custom exercise |
| DELETE | `/api/exercises/:id` | Delete a custom exercise |
| GET | `/api/sets?workout_exercise_id=` | List sets for a workout exercise |
| POST | `/api/sets` | Log a new set |
| PUT | `/api/sets/:id` | Update a set |
| DELETE | `/api/sets/:id` | Delete a set |
| GET | `/api/templates` | List workout templates |
| POST | `/api/templates/from-workout/:workoutId` | Save a workout as a template |
| POST | `/api/templates/:id/apply` | Create a workout from a template |
| DELETE | `/api/templates/:id` | Delete a template |

---

## Features

- **Exercise library**: 30+ built-in global exercises across muscle groups. Add custom exercises.
- **Set logging**: Track weight, reps, rest time, and RPE per set. Values auto-save on blur.
- **Tempo timer**: Per-exercise eccentric/pause/concentric/pause timer with distinct audio tones per phase. Tempo persists to the database.
- **Workout templates**: Save any workout as a reusable template and apply it to create a new session.
- **Historical charts**: Visualize progress over time per exercise.
- **Metric / imperial**: Toggle weight units in Settings; preference persists in localStorage.
- **Auth**: Email/password authentication via Supabase Auth.
- **Native mobile**: Capacitor builds for iOS and Android with local SQLite storage.

---

## Native Mobile Build (Capacitor)

```bash
cd client
npm run build
npx cap sync
npx cap open ios      # or android
```

On native, the app uses a local SQLite database instead of the Express API. Migrations run automatically on first launch.

---

## Building for Production

```bash
npm run build
```

This compiles the server TypeScript to `server/dist/` and builds the client to `client/dist/`.

To run the compiled server:

```bash
cd server && node dist/index.js
```
