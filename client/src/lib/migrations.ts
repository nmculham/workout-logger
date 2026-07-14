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
  {
    name: '003_add_more_exercises',
    sql: `
      INSERT OR IGNORE INTO exercises (id, name, muscle_group, is_global) VALUES
        ('ex-031', 'Bulgarian Split Squat', 'Legs', 1),
        ('ex-032', 'Hip Thrust', 'Legs', 1),
        ('ex-033', 'Walking Lunge', 'Legs', 1),
        ('ex-034', 'Hack Squat', 'Legs', 1),
        ('ex-035', 'Goblet Squat', 'Legs', 1),
        ('ex-036', 'Seated Leg Curl', 'Legs', 1),
        ('ex-037', 'Sumo Deadlift', 'Legs', 1),
        ('ex-038', 'Chin-Up', 'Back', 1),
        ('ex-039', 'Single Arm Dumbbell Row', 'Back', 1),
        ('ex-040', 'T-Bar Row', 'Back', 1),
        ('ex-041', 'Straight Arm Pulldown', 'Back', 1),
        ('ex-042', 'Back Extension', 'Back', 1),
        ('ex-043', 'Rack Pull', 'Back', 1),
        ('ex-044', 'Dumbbell Bench Press', 'Chest', 1),
        ('ex-045', 'Incline Barbell Press', 'Chest', 1),
        ('ex-046', 'Decline Bench Press', 'Chest', 1),
        ('ex-047', 'Pec Deck', 'Chest', 1),
        ('ex-048', 'Chest Dip', 'Chest', 1),
        ('ex-049', 'Cable Fly', 'Chest', 1),
        ('ex-050', 'Overhead Dumbbell Press', 'Shoulders', 1),
        ('ex-051', 'Front Raise', 'Shoulders', 1),
        ('ex-052', 'Cable Lateral Raise', 'Shoulders', 1),
        ('ex-053', 'Upright Row', 'Shoulders', 1),
        ('ex-054', 'Barbell Shrug', 'Shoulders', 1),
        ('ex-055', 'Tricep Cable Extension', 'Arms', 1),
        ('ex-056', 'EZ Bar Curl', 'Arms', 1),
        ('ex-057', 'Preacher Curl', 'Arms', 1),
        ('ex-058', 'Cable Curl', 'Arms', 1),
        ('ex-059', 'Overhead Tricep Extension', 'Arms', 1),
        ('ex-060', 'Close Grip Bench Press', 'Arms', 1),
        ('ex-061', 'Incline Dumbbell Curl', 'Arms', 1),
        ('ex-062', 'Crunch', 'Core', 1),
        ('ex-063', 'Russian Twist', 'Core', 1),
        ('ex-064', 'Hanging Leg Raise', 'Core', 1),
        ('ex-065', 'Ab Wheel Rollout', 'Core', 1),
        ('ex-066', 'Side Plank', 'Core', 1),
        ('ex-067', 'Bicycle Crunch', 'Core', 1);
    `,
  },
  {
    name: '004_workout_exercise_metadata',
    sql: `ALTER TABLE workout_exercises ADD COLUMN metadata TEXT DEFAULT '{}';`,
  },
  {
    name: '005_rename_overhead_press',
    sql: `
      UPDATE exercises SET name = 'Overhead Barbell Press' WHERE id = 'ex-019' AND is_global = 1;
      UPDATE exercises SET name = 'Overhead Dumbbell Press' WHERE id = 'ex-050' AND is_global = 1;
    `,
  },
  {
    name: '006_template_tables',
    sql: `
      CREATE TABLE IF NOT EXISTS workout_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS template_exercises (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS template_sets (
        id TEXT PRIMARY KEY,
        template_exercise_id TEXT NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        reps INTEGER,
        weight REAL,
        rest_time_seconds INTEGER,
        rpe REAL,
        notes TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
];
