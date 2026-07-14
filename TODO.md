# Workout Logger — TODO

## Features
- [x] Create historical charts section
- [x] Set tempo timer
- [x] Settings section with metric / imperial toggle
- [x] Dashboard "show more" / pagination past the first 5 workouts

## Bugs
- [x] Investigate: reps and weights from previous workouts not being saved — fixed by removing metadata passthrough from SetRow.save() which was crashing silently after Express/pg stored it as "[object Object]"
- [x] Investigate: logging in on one browser does not show results visible in a different browser with the same user — fixed by bypassing Express/Render and using Supabase directly on web
- [x] Fix sync pull — `syncPull` now fetches `workout_exercises` and `sets` for all pulled workouts (native only)
- [x] Fix native sync queue — addExercise, removeExercise, updateExerciseMeta, createSet, updateSet, deleteSet now all queue to sync_queue (native only)
- [x] Replace `window.prompt()` / `alert()` in WorkoutDetail — fixed across all pages with Dialog component + useDialog hook
- [x] Fix starting a workout from a template on native — SQLite schema was missing the template tables entirely (every template query threw "no such table"); added migration 006, template pull in syncPull, sync-queueing for template/apply mutations, and an initial push+pull sync on login

## Security
- [x] Add JWT verification to Express routes — added requireAuth middleware using supabase.auth.getUser(), all routes now scope to req.userId

## Missing / Incomplete
- [x] Implement `PUT /api/exercises/:id` route — implemented during security rewrite (scoped to user_id, is_global = false)
- [x] Add try/catch error handling to all Express route handlers — added asyncHandler wrapper + global error handler in index.ts
- [x] Create missing server migration script — reads SQL files from migrations/, tracks applied migrations in schema_migrations table

## Docs
- [x] Update README — reflects Postgres/Supabase stack, Capacitor, current project structure, all API routes and features
