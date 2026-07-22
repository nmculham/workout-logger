-- Enable Row-Level Security on all application tables.
-- The live schema was created by server/src/db/migrations (no RLS), so the
-- policies here cast user_id to text to work with either the TEXT or UUID
-- variant of the column.

ALTER TABLE IF EXISTS exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS template_sets ENABLE ROW LEVEL SECURITY;
-- Internal bookkeeping table created by the server migration runner; no
-- policies means no client access (the postgres owner role bypasses RLS).
ALTER TABLE IF EXISTS schema_migrations ENABLE ROW LEVEL SECURITY;

-- Exercises: global ones are readable by everyone; users manage their own.
DROP POLICY IF EXISTS "Global exercises readable by all" ON exercises;
CREATE POLICY "Global exercises readable by all" ON exercises
  FOR SELECT USING (is_global = true);

DROP POLICY IF EXISTS "Own exercises CRUD" ON exercises;
CREATE POLICY "Own exercises CRUD" ON exercises
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Workouts
DROP POLICY IF EXISTS "Own workouts CRUD" ON workouts;
CREATE POLICY "Own workouts CRUD" ON workouts
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Workout exercises: owned via parent workout
DROP POLICY IF EXISTS "Own workout_exercises CRUD" ON workout_exercises;
CREATE POLICY "Own workout_exercises CRUD" ON workout_exercises
  FOR ALL TO authenticated
  USING (workout_id IN (
    SELECT id FROM workouts WHERE user_id::text = auth.uid()::text
  ));

-- Sets: owned via workout_exercise -> workout
DROP POLICY IF EXISTS "Own sets CRUD" ON sets;
CREATE POLICY "Own sets CRUD" ON sets
  FOR ALL TO authenticated
  USING (workout_exercise_id IN (
    SELECT we.id FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE w.user_id::text = auth.uid()::text
  ));

-- Templates
DROP POLICY IF EXISTS "Own templates CRUD" ON workout_templates;
CREATE POLICY "Own templates CRUD" ON workout_templates
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Own template_exercises CRUD" ON template_exercises;
CREATE POLICY "Own template_exercises CRUD" ON template_exercises
  FOR ALL TO authenticated
  USING (template_id IN (
    SELECT id FROM workout_templates WHERE user_id::text = auth.uid()::text
  ));

DROP POLICY IF EXISTS "Own template_sets CRUD" ON template_sets;
CREATE POLICY "Own template_sets CRUD" ON template_sets
  FOR ALL TO authenticated
  USING (template_exercise_id IN (
    SELECT te.id FROM template_exercises te
    JOIN workout_templates wt ON wt.id = te.template_id
    WHERE wt.user_id::text = auth.uid()::text
  ));
