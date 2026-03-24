import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getDb } from '../db/sqlite';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

// POST /api/sync/push - push queued local changes to Supabase
router.post('/push', async (req, res) => {
  const db = getDb();
  const queue = db.prepare('SELECT * FROM sync_queue ORDER BY id').all() as any[];

  if (!queue.length) return res.json({ pushed: 0 });

  let supabase: any;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  let pushed = 0;
  for (const item of queue) {
    const payload = JSON.parse(item.payload);
    try {
      if (item.operation === 'DELETE') {
        await supabase.from(item.table_name).delete().eq('id', item.record_id);
      } else if (item.operation === 'INSERT') {
        await supabase.from(item.table_name).upsert(payload);
      } else {
        await supabase.from(item.table_name).update(payload).eq('id', item.record_id);
      }
      db.prepare('DELETE FROM sync_queue WHERE id = ?').run(item.id);
      if (item.table_name === 'workouts' && item.operation !== 'DELETE') {
        db.prepare("UPDATE workouts SET synced_at = datetime('now') WHERE id = ?").run(item.record_id);
      }
      pushed++;
    } catch (err) {
      console.error('Sync error for item', item.id, err);
    }
  }

  res.json({ pushed, remaining: queue.length - pushed });
});

// POST /api/sync/pull - pull from Supabase into local SQLite
router.post('/pull', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  let supabase: any;
  try {
    supabase = getSupabase();
  } catch {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const db = getDb();

  const { data: exercises } = await supabase.from('exercises').select('*');
  if (exercises) {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO exercises (id, name, muscle_group, is_global, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const e of exercises) {
      upsert.run([e.id, e.name, e.muscle_group, e.is_global ? 1 : 0, e.user_id, e.created_at, e.updated_at]);
    }
  }

  const { data: workouts } = await supabase.from('workouts').select('*').eq('user_id', user_id);
  if (workouts) {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO workouts (id, user_id, name, date, notes, synced_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const w of workouts) {
      upsert.run([w.id, w.user_id, w.name, w.date, w.notes, w.synced_at, w.created_at, w.updated_at]);
    }
  }

  res.json({ ok: true, exercises: exercises?.length ?? 0, workouts: workouts?.length ?? 0 });
});

export default router;
