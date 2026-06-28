import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/postgres';

const router = Router();

// GET /api/sets?workout_exercise_id=...
router.get('/', async (req, res) => {
  const { workout_exercise_id } = req.query;
  if (!workout_exercise_id) return res.status(400).json({ error: 'workout_exercise_id required' });
  const { rows } = await getPool().query(`
    SELECT s.* FROM sets s
    JOIN workout_exercises we ON we.id = s.workout_exercise_id
    JOIN workouts w ON w.id = we.workout_id
    WHERE s.workout_exercise_id = $1 AND w.user_id = $2
    ORDER BY s.set_number
  `, [workout_exercise_id, req.userId]);
  res.json(rows);
});

// POST /api/sets
router.post('/', async (req, res) => {
  const { workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata } = req.body;
  if (!workout_exercise_id || set_number == null) {
    return res.status(400).json({ error: 'workout_exercise_id and set_number required' });
  }
  // Verify the workout_exercise belongs to the authenticated user
  const { rows } = await getPool().query(`
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = $1 AND w.user_id = $2
  `, [workout_exercise_id, req.userId]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });

  const id = uuidv4();
  await getPool().query(`
    INSERT INTO sets (id, workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [id, workout_exercise_id, set_number, reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, metadata ?? {}]);
  res.status(201).json({ id });
});

// PUT /api/sets/:id
router.put('/:id', async (req, res) => {
  const { reps, weight, rest_time_seconds, rpe, notes, metadata } = req.body;
  const { rowCount } = await getPool().query(`
    UPDATE sets s SET
      reps = $1, weight = $2, rest_time_seconds = $3, rpe = $4,
      notes = $5, metadata = $6, updated_at = now()
    FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    WHERE s.id = $7 AND s.workout_exercise_id = we.id AND w.user_id = $8
  `, [reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, metadata ?? {}, req.params.id, req.userId]);
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// DELETE /api/sets/:id
router.delete('/:id', async (req, res) => {
  await getPool().query(`
    DELETE FROM sets s
    USING workout_exercises we, workouts w
    WHERE s.id = $1 AND s.workout_exercise_id = we.id AND we.workout_id = w.id AND w.user_id = $2
  `, [req.params.id, req.userId]);
  res.json({ ok: true });
});

export default router;
