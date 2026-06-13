CREATE TABLE IF NOT EXISTS workout_templates (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_exercises (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_sets (
  id TEXT PRIMARY KEY,
  template_exercise_id TEXT NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight NUMERIC,
  rest_time_seconds INTEGER,
  rpe NUMERIC CHECK (rpe >= 1 AND rpe <= 10),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own templates CRUD" ON workout_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own template_exercises CRUD" ON template_exercises FOR ALL
  USING (template_id IN (SELECT id FROM workout_templates WHERE user_id = auth.uid()));
CREATE POLICY "Own template_sets CRUD" ON template_sets FOR ALL
  USING (template_exercise_id IN (
    SELECT te.id FROM template_exercises te
    JOIN workout_templates wt ON wt.id = te.template_id
    WHERE wt.user_id = auth.uid()
  ));
