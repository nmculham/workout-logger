import { supabase } from './supabase';
import { sqliteQuery, sqliteRun } from './sqlite';

export async function syncPush(): Promise<{ pushed: number; remaining: number }> {
  const queue = await sqliteQuery('SELECT * FROM sync_queue ORDER BY id');

  if (!queue.length) return { pushed: 0, remaining: 0 };

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
      await sqliteRun('DELETE FROM sync_queue WHERE id = ?', [item.id]);
      if (item.table_name === 'workouts' && item.operation !== 'DELETE') {
        await sqliteRun("UPDATE workouts SET synced_at = datetime('now') WHERE id = ?", [item.record_id]);
      }
      pushed++;
    } catch (err) {
      console.error('Sync error for item', item.id, err);
    }
  }

  return { pushed, remaining: queue.length - pushed };
}

export async function syncPull(userId: string): Promise<{ exercises: number; workouts: number }> {
  const { data: exercises } = await supabase.from('exercises').select('*');
  if (exercises) {
    for (const e of exercises) {
      await sqliteRun(
        'INSERT OR REPLACE INTO exercises (id, name, muscle_group, is_global, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [e.id, e.name, e.muscle_group, e.is_global ? 1 : 0, e.user_id ?? null, e.created_at, e.updated_at]
      );
    }
  }

  const { data: workouts } = await supabase.from('workouts').select('*').eq('user_id', userId);
  if (workouts) {
    for (const w of workouts) {
      await sqliteRun(
        'INSERT OR REPLACE INTO workouts (id, user_id, name, date, notes, synced_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        [w.id, w.user_id, w.name, w.date, w.notes ?? null, w.synced_at ?? null, w.created_at, w.updated_at]
      );
    }
  }

  return { exercises: exercises?.length ?? 0, workouts: workouts?.length ?? 0 };
}
