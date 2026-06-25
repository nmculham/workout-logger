# Workout Logger — TODO

## Features
- [ ] Create historical charts section
- [ ] Set tempo timer
- [ ] Settings section with metric / imperial toggle
- [ ] Dashboard "show more" / pagination past the first 5 workouts

## Bugs
- [x] Investigate: logging in on one browser does not show results visible in a different browser with the same user — fixed by bypassing Express/Render and using Supabase directly on web
- [ ] Fix sync pull — `syncPull` doesn't fetch `workout_exercises` or `sets`, so synced workouts arrive empty on a new device (native only)
- [ ] Fix native sync queue — set/exercise changes within a workout are never queued for Supabase push on Capacitor (native)
- [ ] Replace `window.prompt()` / `alert()` in WorkoutDetail — breaks inside Capacitor WebView on iOS/Android

## Security
- [ ] Add JWT verification to Express routes (currently any caller with a known UUID can read/modify another user's data)

## Missing / Incomplete
- [ ] Implement `PUT /api/exercises/:id` route (documented in README but not built)
- [ ] Add try/catch error handling to all Express route handlers
- [ ] Create missing server migration script (`server/package.json` references `src/db/migrate.ts` which doesn't exist)

## Docs
- [ ] Update README (still references SQLite/better-sqlite3; no mention of Capacitor or mobile build)
