import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/sqlite';

const router = Router();

// GET /api/templates?user_id=
router.get('/', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const db = getDb();
  const templates = db.prepare(`
    SELECT wt.*,
      COUNT(DISTINCT te.id) as exercise_count,
      GROUP_CONCAT(e.name, ', ') as exercise_names
    FROM workout_templates wt
    LEFT JOIN template_exercises te ON te.template_id = wt.id
    LEFT JOIN exercises e ON e.id = te.exercise_id
    WHERE wt.user_id = ?
    GROUP BY wt.id
    ORDER BY wt.created_at DESC
  `).all(user_id as string);
  res.json(templates);
});

// POST /api/templates/from-workout/:workoutId  { name? }
router.post('/from-workout/:workoutId', (req, res) => {
  const { name } = req.body;
  const db = getDb();

  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.workoutId) as any;
  if (!workout) return res.status(404).json({ error: 'Workout not found' });

  const templateId = uuidv4();
  db.prepare(
    'INSERT INTO workout_templates (id, user_id, name, notes) VALUES (?, ?, ?, ?)'
  ).run([templateId, workout.user_id, name || workout.name, workout.notes || null]);

  const workoutExercises = db.prepare(
    'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY "order"'
  ).all(req.params.workoutId) as any[];

  for (const we of workoutExercises) {
    const teId = uuidv4();
    db.prepare(
      'INSERT INTO template_exercises (id, template_id, exercise_id, "order") VALUES (?, ?, ?, ?)'
    ).run([teId, templateId, we.exercise_id, we.order]);

    const sets = db.prepare(
      'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number'
    ).all(we.id) as any[];
    for (const s of sets) {
      db.prepare(
        'INSERT INTO template_sets (id, template_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run([uuidv4(), teId, s.set_number, s.reps ?? null, s.weight ?? null, s.rest_time_seconds ?? null, s.rpe ?? null, s.notes ?? null, s.metadata || '{}']);
    }
  }

  res.status(201).json({ id: templateId });
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM workout_templates WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/templates/:id/apply  { user_id, name?, date }
router.post('/:id/apply', (req, res) => {
  const { user_id, name, date } = req.body;
  if (!user_id || !date) return res.status(400).json({ error: 'user_id and date required' });
  const db = getDb();

  const template = db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(req.params.id) as any;
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const workoutId = uuidv4();
  db.prepare(
    'INSERT INTO workouts (id, user_id, name, date, notes) VALUES (?, ?, ?, ?, ?)'
  ).run([workoutId, user_id, name || template.name, date, template.notes || null]);

  const templateExercises = db.prepare(
    'SELECT * FROM template_exercises WHERE template_id = ? ORDER BY "order"'
  ).all(req.params.id) as any[];

  for (const te of templateExercises) {
    const weId = uuidv4();
    db.prepare(
      'INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES (?, ?, ?, ?)'
    ).run([weId, workoutId, te.exercise_id, te.order]);

    const templateSets = db.prepare(
      'SELECT * FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number'
    ).all(te.id) as any[];
    for (const ts of templateSets) {
      db.prepare(
        'INSERT INTO sets (id, workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run([uuidv4(), weId, ts.set_number, ts.reps ?? null, ts.weight ?? null, ts.rest_time_seconds ?? null, ts.rpe ?? null, ts.notes ?? null, ts.metadata || '{}']);
    }
  }

  res.status(201).json({ id: workoutId });
});

export default router;
