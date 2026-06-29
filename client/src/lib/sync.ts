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

  const workoutIds = workouts?.map(w => w.id) ?? [];
  if (workoutIds.length) {
    const { data: wes } = await supabase.from('workout_exercises').select('*').in('workout_id', workoutIds);
    if (wes) {
      for (const we of wes) {
        await sqliteRun(
          'INSERT OR REPLACE INTO workout_exercises (id, workout_id, exercise_id, "order", metadata, created_at) VALUES (?,?,?,?,?,?)',
          [we.id, we.workout_id, we.exercise_id, we.order, JSON.stringify(we.metadata ?? {}), we.created_at]
        );
      }
      const weIds = wes.map(we => we.id);
      if (weIds.length) {
        const { data: sets } = await supabase.from('sets').select('*').in('workout_exercise_id', weIds);
        if (sets) {
          for (const s of sets) {
            await sqliteRun(
              'INSERT OR REPLACE INTO sets (id, workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
              [s.id, s.workout_exercise_id, s.set_number, s.reps ?? null, s.weight ?? null, s.rest_time_seconds ?? null, s.rpe ?? null, s.notes ?? null, JSON.stringify(s.metadata ?? {}), s.created_at, s.updated_at]
            );
          }
        }
      }
    }
  }

  return { exercises: exercises?.length ?? 0, workouts: workouts?.length ?? 0 };
}
