import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/sqlite';

const router = Router();

// GET /api/workouts?user_id=...
router.get('/', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const db = getDb();
  const workouts = db.prepare(
    'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC'
  ).all(user_id as string);
  res.json(workouts);
});

// GET /api/workouts/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
  if (!workout) return res.status(404).json({ error: 'Not found' });

  const workoutExercises = db.prepare(`
    SELECT we.*, e.name as exercise_name, e.muscle_group
    FROM workout_exercises we
    JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_id = ?
    ORDER BY we."order"
  `).all(req.params.id);

  const weIds = (workoutExercises as any[]).map(we => we.id);
  const sets = weIds.length
    ? db.prepare(
        `SELECT * FROM sets WHERE workout_exercise_id IN (${weIds.map(() => '?').join(',')}) ORDER BY set_number`
      ).all(weIds)
    : [];

  res.json({ ...(workout as object), exercises: workoutExercises, sets });
});

// POST /api/workouts
router.post('/', (req, res) => {
  const { user_id, name, date, notes } = req.body;
  if (!user_id || !name || !date) return res.status(400).json({ error: 'user_id, name, date required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO workouts (id, user_id, name, date, notes) VALUES (?, ?, ?, ?, ?)'
  ).run([id, user_id, name, date, notes || null]);
  queueSync(db, 'workouts', id, 'INSERT', { id, user_id, name, date, notes });
  res.status(201).json({ id });
});

// PUT /api/workouts/:id
router.put('/:id', (req, res) => {
  const { name, date, notes } = req.body;
  const db = getDb();
  db.prepare(
    "UPDATE workouts SET name = ?, date = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
  ).run([name, date, notes || null, req.params.id]);
  queueSync(db, 'workouts', req.params.id, 'UPDATE', { name, date, notes });
  res.json({ ok: true });
});

// DELETE /api/workouts/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM workouts WHERE id = ?').run(req.params.id);
  queueSync(db, 'workouts', req.params.id, 'DELETE', {});
  res.json({ ok: true });
});

// POST /api/workouts/:id/exercises
router.post('/:id/exercises', (req, res) => {
  const { exercise_id, order } = req.body;
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES (?, ?, ?, ?)'
  ).run([id, req.params.id, exercise_id, order ?? 0]);
  res.status(201).json({ id });
});

// DELETE /api/workouts/exercises/:weId
router.delete('/exercises/:weId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM workout_exercises WHERE id = ?').run(req.params.weId);
  res.json({ ok: true });
});

function queueSync(db: any, table: string, recordId: string, op: string, payload: object) {
  db.prepare(
    'INSERT INTO sync_queue (table_name, record_id, operation, payload) VALUES (?, ?, ?, ?)'
  ).run([table, recordId, op, JSON.stringify(payload)]);
}

export default router;
