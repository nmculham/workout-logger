import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/postgres';

const router = Router();

// GET /api/exercises
router.get('/', async (req, res) => {
  const { rows } = await getPool().query(
    'SELECT * FROM exercises WHERE is_global = true OR user_id = $1 ORDER BY muscle_group, name',
    [req.userId]
  );
  res.json(rows);
});

// POST /api/exercises
router.post('/', async (req, res) => {
  const { name, muscle_group } = req.body;
  if (!name || !muscle_group) return res.status(400).json({ error: 'name and muscle_group required' });
  const id = uuidv4();
  await getPool().query(
    'INSERT INTO exercises (id, name, muscle_group, is_global, user_id) VALUES ($1, $2, $3, false, $4)',
    [id, name, muscle_group, req.userId]
  );
  res.status(201).json({ id });
});

// PUT /api/exercises/:id
router.put('/:id', async (req, res) => {
  const { name, muscle_group } = req.body;
  const { rowCount } = await getPool().query(
    'UPDATE exercises SET name = $1, muscle_group = $2, updated_at = now() WHERE id = $3 AND user_id = $4 AND is_global = false',
    [name, muscle_group, req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// DELETE /api/exercises/:id
router.delete('/:id', async (req, res) => {
  await getPool().query(
    'DELETE FROM exercises WHERE id = $1 AND user_id = $2 AND is_global = false',
    [req.params.id, req.userId]
  );
  res.json({ ok: true });
});

export default router;
