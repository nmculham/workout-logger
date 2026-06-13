import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/postgres';

const router = Router();

// GET /api/sets?workout_exercise_id=...
router.get('/', async (req, res) => {
  const { workout_exercise_id } = req.query;
  if (!workout_exercise_id) return res.status(400).json({ error: 'workout_exercise_id required' });
  const { rows } = await getPool().query(
    'SELECT * FROM sets WHERE workout_exercise_id = $1 ORDER BY set_number',
    [workout_exercise_id]
  );
  res.json(rows);
});

// POST /api/sets
router.post('/', async (req, res) => {
  const { workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata } = req.body;
  if (!workout_exercise_id || set_number == null) {
    return res.status(400).json({ error: 'workout_exercise_id and set_number required' });
  }
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
  await getPool().query(`
    UPDATE sets SET reps = $1, weight = $2, rest_time_seconds = $3, rpe = $4, notes = $5, metadata = $6, updated_at = now()
    WHERE id = $7
  `, [reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, metadata ?? {}, req.params.id]);
  res.json({ ok: true });
});

// DELETE /api/sets/:id
router.delete('/:id', async (req, res) => {
  await getPool().query('DELETE FROM sets WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
