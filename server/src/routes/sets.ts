import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/sqlite';

const router = Router();

// GET /api/sets?workout_exercise_id=...
router.get('/', (req, res) => {
  const { workout_exercise_id } = req.query;
  if (!workout_exercise_id) return res.status(400).json({ error: 'workout_exercise_id required' });
  const db = getDb();
  const sets = db.prepare(
    'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number'
  ).all(workout_exercise_id as string);
  res.json(sets);
});

// POST /api/sets
router.post('/', (req, res) => {
  const { workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata } = req.body;
  if (!workout_exercise_id || set_number == null) {
    return res.status(400).json({ error: 'workout_exercise_id and set_number required' });
  }
  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO sets (id, workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run([id, workout_exercise_id, set_number, reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, JSON.stringify(metadata ?? {})]);
  res.status(201).json({ id });
});

// PUT /api/sets/:id
router.put('/:id', (req, res) => {
  const { reps, weight, rest_time_seconds, rpe, notes, metadata } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE sets SET reps = ?, weight = ?, rest_time_seconds = ?, rpe = ?, notes = ?, metadata = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run([reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, JSON.stringify(metadata ?? {}), req.params.id]);
  res.json({ ok: true });
});

// DELETE /api/sets/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sets WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
