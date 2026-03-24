import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/sqlite';

const router = Router();

// GET /api/exercises?user_id=...
router.get('/', (req, res) => {
  const { user_id } = req.query;
  const db = getDb();
  const exercises = user_id
    ? db.prepare(
        'SELECT * FROM exercises WHERE is_global = 1 OR user_id = ? ORDER BY muscle_group, name'
      ).all(user_id as string)
    : db.prepare('SELECT * FROM exercises WHERE is_global = 1 ORDER BY muscle_group, name').all();
  res.json(exercises);
});

// POST /api/exercises
router.post('/', (req, res) => {
  const { name, muscle_group, user_id } = req.body;
  if (!name || !muscle_group) return res.status(400).json({ error: 'name and muscle_group required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO exercises (id, name, muscle_group, is_global, user_id) VALUES (?, ?, ?, 0, ?)'
  ).run([id, name, muscle_group, user_id || null]);
  res.status(201).json({ id });
});

// PUT /api/exercises/:id
router.put('/:id', (req, res) => {
  const { name, muscle_group } = req.body;
  const db = getDb();
  db.prepare(
    "UPDATE exercises SET name = ?, muscle_group = ?, updated_at = datetime('now') WHERE id = ? AND is_global = 0"
  ).run([name, muscle_group, req.params.id]);
  res.json({ ok: true });
});

// DELETE /api/exercises/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM exercises WHERE id = ? AND is_global = 0').run(req.params.id);
  res.json({ ok: true });
});

export default router;
