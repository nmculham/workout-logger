export interface Migration {
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    name: '001_initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        is_global INTEGER NOT NULL DEFAULT 0,
        user_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        synced_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sets (
        id TEXT PRIMARY KEY,
        workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        reps INTEGER,
        weight REAL,
        rest_time_seconds INTEGER,
        rpe REAL,
        notes TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
  {
    name: '002_seed_exercises',
    sql: `
      INSERT OR IGNORE INTO exercises (id, name, muscle_group, is_global) VALUES
        ('ex-001', 'Barbell Back Squat', 'Legs', 1),
        ('ex-002', 'Barbell Front Squat', 'Legs', 1),
        ('ex-003', 'Leg Press', 'Legs', 1),
        ('ex-004', 'Romanian Deadlift', 'Legs', 1),
        ('ex-005', 'Leg Curl', 'Legs', 1),
        ('ex-006', 'Leg Extension', 'Legs', 1),
        ('ex-007', 'Calf Raise', 'Legs', 1),
        ('ex-008', 'Barbell Deadlift', 'Back', 1),
        ('ex-009', 'Pull-Up', 'Back', 1),
        ('ex-010', 'Barbell Row', 'Back', 1),
        ('ex-011', 'Cable Row', 'Back', 1),
        ('ex-012', 'Lat Pulldown', 'Back', 1),
        ('ex-013', 'Face Pull', 'Back', 1),
        ('ex-014', 'Barbell Bench Press', 'Chest', 1),
        ('ex-015', 'Incline Dumbbell Press', 'Chest', 1),
        ('ex-016', 'Dumbbell Fly', 'Chest', 1),
        ('ex-017', 'Cable Crossover', 'Chest', 1),
        ('ex-018', 'Push-Up', 'Chest', 1),
        ('ex-019', 'Overhead Press', 'Shoulders', 1),
        ('ex-020', 'Lateral Raise', 'Shoulders', 1),
        ('ex-021', 'Arnold Press', 'Shoulders', 1),
        ('ex-022', 'Rear Delt Fly', 'Shoulders', 1),
        ('ex-023', 'Barbell Curl', 'Arms', 1),
        ('ex-024', 'Dumbbell Curl', 'Arms', 1),
        ('ex-025', 'Hammer Curl', 'Arms', 1),
        ('ex-026', 'Tricep Pushdown', 'Arms', 1),
        ('ex-027', 'Skull Crusher', 'Arms', 1),
        ('ex-028', 'Dips', 'Arms', 1),
        ('ex-029', 'Plank', 'Core', 1),
        ('ex-030', 'Cable Crunch', 'Core', 1);
    `,
  },
];
