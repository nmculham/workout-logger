# Workout Logger — TODO

## Features
- [x] Create historical charts section
- [x] Set tempo timer
- [x] Settings section with metric / imperial toggle
- [x] Dashboard "show more" / pagination past the first 5 workouts

## Bugs
- [x] Investigate: reps and weights from previous workouts not being saved — fixed by removing metadata passthrough from SetRow.save() which was crashing silently after Express/pg stored it as "[object Object]"
- [x] Investigate: logging in on one browser does not show results visible in a different browser with the same user — fixed by bypassing Express/Render and using Supabase directly on web
- [ ] Fix sync pull — `syncPull` doesn't fetch `workout_exercises` or `sets`, so synced workouts arrive empty on a new device (native only)
- [ ] Fix native sync queue — set/exercise changes within a workout are never queued for Supabase push on Capacitor (native)
- [x] Replace `window.prompt()` / `alert()` in WorkoutDetail — fixed across all pages with Dialog component + useDialog hook

## Security
- [x] Add JWT verification to Express routes — added requireAuth middleware using supabase.auth.getUser(), all routes now scope to req.userId

## Missing / Incomplete
- [ ] Implement `PUT /api/exercises/:id` route (documented in README but not built)
- [x] Add try/catch error handling to all Express route handlers — added asyncHandler wrapper + global error handler in index.ts
- [ ] Create missing server migration script (`server/package.json` references `src/db/migrate.ts` which doesn't exist)

## Docs
- [ ] Update README (still references SQLite/better-sqlite3; no mention of Capacitor or mobile build)
