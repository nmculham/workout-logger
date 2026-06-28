import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/postgres';

const router = Router();

// GET /api/workouts
router.get('/', async (req, res) => {
  const { rows } = await getPool().query(
    'SELECT * FROM workouts WHERE user_id = $1 ORDER BY date DESC',
    [req.userId]
  );
  res.json(rows);
});

// GET /api/workouts/:id
router.get('/:id', async (req, res) => {
  const pool = getPool();
  const { rows: [workout] } = await pool.query(
    'SELECT * FROM workouts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!workout) return res.status(404).json({ error: 'Not found' });

  const { rows: workoutExercises } = await pool.query(`
    SELECT we.*, e.name as exercise_name, e.muscle_group
    FROM workout_exercises we
    JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_id = $1
    ORDER BY we."order"
  `, [req.params.id]);

  const weIds = workoutExercises.map(we => we.id);
  const sets = weIds.length
    ? (await pool.query(
        'SELECT * FROM sets WHERE workout_exercise_id = ANY($1) ORDER BY set_number',
        [weIds]
      )).rows
    : [];

  res.json({ ...workout, exercises: workoutExercises, sets });
});

// POST /api/workouts
router.post('/', async (req, res) => {
  const { name, date, notes } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'name and date required' });
  const id = uuidv4();
  await getPool().query(
    'INSERT INTO workouts (id, user_id, name, date, notes) VALUES ($1, $2, $3, $4, $5)',
    [id, req.userId, name, date, notes || null]
  );
  res.status(201).json({ id });
});

// PUT /api/workouts/:id
router.put('/:id', async (req, res) => {
  const { name, date, notes } = req.body;
  const { rowCount } = await getPool().query(
    'UPDATE workouts SET name = $1, date = $2, notes = $3, updated_at = now() WHERE id = $4 AND user_id = $5',
    [name, date, notes || null, req.params.id, req.userId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// DELETE /api/workouts/:id
router.delete('/:id', async (req, res) => {
  await getPool().query(
    'DELETE FROM workouts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  res.json({ ok: true });
});

// POST /api/workouts/:id/exercises
router.post('/:id/exercises', async (req, res) => {
  const pool = getPool();
  const { rows: [workout] } = await pool.query(
    'SELECT id FROM workouts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.userId]
  );
  if (!workout) return res.status(404).json({ error: 'Not found' });

  const { exercise_id, order } = req.body;
  const id = uuidv4();
  await pool.query(
    'INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES ($1, $2, $3, $4)',
    [id, req.params.id, exercise_id, order ?? 0]
  );
  res.status(201).json({ id });
});

// DELETE /api/workouts/exercises/:weId
router.delete('/exercises/:weId', async (req, res) => {
  const pool = getPool();
  const { rowCount } = await pool.query(`
    DELETE FROM workout_exercises we
    USING workouts w
    WHERE we.id = $1 AND we.workout_id = w.id AND w.user_id = $2
  `, [req.params.weId, req.userId]);
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// PATCH /api/workouts/exercises/:weId/metadata
router.patch('/exercises/:weId/metadata', async (req, res) => {
  const { metadata } = req.body;
  const { rowCount } = await getPool().query(`
    UPDATE workout_exercises we
    SET metadata = $1
    FROM workouts w
    WHERE we.id = $2 AND we.workout_id = w.id AND w.user_id = $3
  `, [JSON.stringify(metadata ?? {}), req.params.weId, req.userId]);
  if (!rowCount) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
