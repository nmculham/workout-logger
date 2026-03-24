# Workout Logger

A full-stack workout logging application with offline-first local storage (SQLite) and optional cloud sync (Supabase).

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Local DB**: SQLite via better-sqlite3 (auto-migrated on startup)
- **Cloud DB**: Supabase (Postgres + Auth) for sync and auth

---

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- A Supabase project (free tier works fine) — optional for local-only use

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
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

Copy the client env example:

```bash
cp client/.env.example client/.env
```

Edit `client/.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> If you want to run fully offline without Supabase, you can leave the Supabase values empty. Auth and sync features will be unavailable, but local logging will work.

### 3. Run the development servers

Start both the backend and frontend together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run server   # Express API on http://localhost:3001
npm run client   # Vite dev server on http://localhost:5173
```

The SQLite database is created automatically at `server/data/workout-logger.db` and migrations run on first startup.

---

## Supabase Setup

### Create the schema

In your Supabase project, open the SQL Editor and run the contents of:

1. `supabase/migrations/001_initial_schema.sql` — creates tables and RLS policies
2. `supabase/migrations/002_seed_exercises.sql` — seeds 30 built-in exercises

### Enable Email Auth

In your Supabase dashboard: **Authentication > Providers > Email** — ensure it is enabled. For local development you may want to disable email confirmation under **Authentication > Settings**.

### Row Level Security

RLS is enabled on all tables. The policies ensure:
- Global exercises are readable by anyone
- Users can only read and write their own workouts, workout exercises, and sets
- Custom exercises are scoped to the creating user

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
│       ├── index.ts          # Express app entry point
│       ├── db/
│       │   ├── sqlite.ts     # DB init, connection, migration runner
│       │   └── migrations/
│       │       ├── 001_initial_schema.sql
│       │       └── 002_seed_exercises.sql
│       └── routes/
│           ├── workouts.ts   # CRUD for workouts and workout_exercises
│           ├── exercises.ts  # CRUD for exercises
│           ├── sets.ts       # CRUD for sets
│           └── sync.ts       # Push/pull sync with Supabase
│
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── .env.example
│   └── src/
│       ├── main.tsx
│       ├── App.tsx           # Router and auth state
│       ├── index.css         # Global dark theme styles
│       ├── lib/
│       │   ├── api.ts        # Typed fetch wrappers for all API endpoints
│       │   ├── auth.ts       # Supabase auth helpers
│       │   └── supabase.ts   # Supabase client instance
│       ├── components/
│       │   ├── Nav.tsx       # Top navigation bar
│       │   ├── ExercisePicker.tsx  # Modal for selecting exercises
│       │   └── SetRow.tsx    # Inline editable set row
│       └── pages/
│           ├── Login.tsx         # Sign in / register
│           ├── Dashboard.tsx     # Overview + recent workouts + sync
│           ├── WorkoutHistory.tsx # Full workout list with delete
│           ├── NewWorkout.tsx    # Create a new workout session
│           ├── WorkoutDetail.tsx # Add exercises and log sets
│           └── ExerciseLibrary.tsx # Browse and create custom exercises
│
└── supabase/
    └── migrations/
        ├── 001_initial_schema.sql  # Postgres schema + RLS
        └── 002_seed_exercises.sql  # Built-in exercise seed data
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/workouts?user_id=` | List workouts for a user |
| GET | `/api/workouts/:id` | Get workout with exercises and sets |
| POST | `/api/workouts` | Create a new workout |
| PUT | `/api/workouts/:id` | Update a workout |
| DELETE | `/api/workouts/:id` | Delete a workout |
| POST | `/api/workouts/:id/exercises` | Add an exercise to a workout |
| DELETE | `/api/workouts/exercises/:weId` | Remove an exercise from a workout |
| GET | `/api/exercises?user_id=` | List all exercises |
| POST | `/api/exercises` | Create a custom exercise |
| PUT | `/api/exercises/:id` | Update a custom exercise |
| DELETE | `/api/exercises/:id` | Delete a custom exercise |
| GET | `/api/sets?workout_exercise_id=` | List sets for a workout exercise |
| POST | `/api/sets` | Log a new set |
| PUT | `/api/sets/:id` | Update a set |
| DELETE | `/api/sets/:id` | Delete a set |
| POST | `/api/sync/push` | Push local changes to Supabase |
| POST | `/api/sync/pull` | Pull data from Supabase into local DB |

---

## Features

- **Offline-first**: All data is stored locally in SQLite. The app works without an internet connection.
- **Cloud sync**: Push local changes to Supabase and pull remote data on demand from the Dashboard.
- **Exercise library**: 30 built-in global exercises across 6 muscle groups. Add your own custom exercises.
- **Set logging**: Track weight, reps, rest time, and RPE per set. Values auto-save on blur.
- **Sync status badges**: Each workout shows whether it has been synced to the cloud.
- **Auth**: Email/password authentication via Supabase Auth.

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
