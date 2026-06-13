import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/postgres';

const router = Router();

// GET /api/templates?user_id=
router.get('/', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const { rows } = await getPool().query(`
    SELECT wt.*,
      COUNT(DISTINCT te.id) as exercise_count,
      STRING_AGG(e.name, ', ') as exercise_names
    FROM workout_templates wt
    LEFT JOIN template_exercises te ON te.template_id = wt.id
    LEFT JOIN exercises e ON e.id = te.exercise_id
    WHERE wt.user_id = $1
    GROUP BY wt.id
    ORDER BY wt.created_at DESC
  `, [user_id]);
  res.json(rows);
});

// POST /api/templates/from-workout/:workoutId  { name? }
router.post('/from-workout/:workoutId', async (req, res) => {
  const { name } = req.body;
  const pool = getPool();

  const { rows: [workout] } = await pool.query('SELECT * FROM workouts WHERE id = $1', [req.params.workoutId]);
  if (!workout) return res.status(404).json({ error: 'Workout not found' });

  const templateId = uuidv4();
  await pool.query(
    'INSERT INTO workout_templates (id, user_id, name, notes) VALUES ($1, $2, $3, $4)',
    [templateId, workout.user_id, name || workout.name, workout.notes || null]
  );

  const { rows: workoutExercises } = await pool.query(
    'SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY "order"',
    [req.params.workoutId]
  );

  for (const we of workoutExercises) {
    const teId = uuidv4();
    await pool.query(
      'INSERT INTO template_exercises (id, template_id, exercise_id, "order") VALUES ($1, $2, $3, $4)',
      [teId, templateId, we.exercise_id, we.order]
    );

    const { rows: sets } = await pool.query(
      'SELECT * FROM sets WHERE workout_exercise_id = $1 ORDER BY set_number',
      [we.id]
    );
    for (const s of sets) {
      await pool.query(
        'INSERT INTO template_sets (id, template_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [uuidv4(), teId, s.set_number, s.reps ?? null, s.weight ?? null, s.rest_time_seconds ?? null, s.rpe ?? null, s.notes ?? null, s.metadata ?? {}]
      );
    }
  }

  res.status(201).json({ id: templateId });
});

// DELETE /api/templates/:id
router.delete('/:id', async (req, res) => {
  await getPool().query('DELETE FROM workout_templates WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// POST /api/templates/:id/apply  { user_id, name?, date }
router.post('/:id/apply', async (req, res) => {
  const { user_id, name, date } = req.body;
  if (!user_id || !date) return res.status(400).json({ error: 'user_id and date required' });
  const pool = getPool();

  const { rows: [template] } = await pool.query('SELECT * FROM workout_templates WHERE id = $1', [req.params.id]);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const workoutId = uuidv4();
  await pool.query(
    'INSERT INTO workouts (id, user_id, name, date, notes) VALUES ($1, $2, $3, $4, $5)',
    [workoutId, user_id, name || template.name, date, template.notes || null]
  );

  const { rows: templateExercises } = await pool.query(
    'SELECT * FROM template_exercises WHERE template_id = $1 ORDER BY "order"',
    [req.params.id]
  );

  for (const te of templateExercises) {
    const weId = uuidv4();
    await pool.query(
      'INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES ($1, $2, $3, $4)',
      [weId, workoutId, te.exercise_id, te.order]
    );

    const { rows: templateSets } = await pool.query(
      'SELECT * FROM template_sets WHERE template_exercise_id = $1 ORDER BY set_number',
      [te.id]
    );
    for (const ts of templateSets) {
      await pool.query(
        'INSERT INTO sets (id, workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [uuidv4(), weId, ts.set_number, ts.reps ?? null, ts.weight ?? null, ts.rest_time_seconds ?? null, ts.rpe ?? null, ts.notes ?? null, ts.metadata ?? {}]
      );
    }
  }

  res.status(201).json({ id: workoutId });
});

export default router;
