import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// ── Web: HTTP helpers ─────────────────────────────────────────────────────────
const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Native: SQLite helpers ────────────────────────────────────────────────────
function genId(): string {
  return crypto.randomUUID();
}

async function nq(sql: string, params?: any[]): Promise<any[]> {
  const { sqliteQuery } = await import('./sqlite');
  return sqliteQuery(sql, params);
}

async function nr(sql: string, params?: any[]): Promise<void> {
  const { sqliteRun } = await import('./sqlite');
  return sqliteRun(sql, params);
}

async function nativeQueueSync(table: string, recordId: string, op: string, payload: object) {
  await nr(
    'INSERT INTO sync_queue (table_name, record_id, operation, payload) VALUES (?, ?, ?, ?)',
    [table, recordId, op, JSON.stringify(payload)]
  );
}

// ── Unified API ───────────────────────────────────────────────────────────────
export const api = {
  // Workouts
  getWorkouts: async (userId: string): Promise<any[]> => {
    if (isNative) return nq('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC', [userId]);
    return req<any[]>(`/workouts?user_id=${userId}`);
  },

  getWorkout: async (id: string): Promise<any> => {
    if (isNative) {
      const rows = await nq('SELECT * FROM workouts WHERE id = ?', [id]);
      if (!rows.length) return null;
      const exercises = await nq(`
        SELECT we.*, e.name as exercise_name, e.muscle_group
        FROM workout_exercises we
        JOIN exercises e ON e.id = we.exercise_id
        WHERE we.workout_id = ?
        ORDER BY we."order"
      `, [id]);
      const weIds = exercises.map((we: any) => we.id);
      const sets = weIds.length
        ? await nq(
            `SELECT * FROM sets WHERE workout_exercise_id IN (${weIds.map(() => '?').join(',')}) ORDER BY set_number`,
            weIds
          )
        : [];
      return { ...rows[0], exercises, sets };
    }
    return req<any>(`/workouts/${id}`);
  },

  createWorkout: async (body: { user_id: string; name: string; date: string; notes?: string }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      await nr('INSERT INTO workouts (id, user_id, name, date, notes) VALUES (?, ?, ?, ?, ?)',
        [id, body.user_id, body.name, body.date, body.notes || null]);
      await nativeQueueSync('workouts', id, 'INSERT', { id, ...body });
      return { id };
    }
    return req<{ id: string }>('/workouts', { method: 'POST', body: JSON.stringify(body) });
  },

  updateWorkout: async (id: string, body: { name: string; date: string; notes?: string }): Promise<any> => {
    if (isNative) {
      await nr("UPDATE workouts SET name = ?, date = ?, notes = ?, updated_at = datetime('now') WHERE id = ?",
        [body.name, body.date, body.notes || null, id]);
      await nativeQueueSync('workouts', id, 'UPDATE', body);
      return { ok: true };
    }
    return req<any>(`/workouts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },

  deleteWorkout: async (id: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM workouts WHERE id = ?', [id]);
      await nativeQueueSync('workouts', id, 'DELETE', {});
      return { ok: true };
    }
    return req<any>(`/workouts/${id}`, { method: 'DELETE' });
  },

  addExerciseToWorkout: async (workoutId: string, body: { exercise_id: string; order?: number }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      await nr('INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES (?, ?, ?, ?)',
        [id, workoutId, body.exercise_id, body.order ?? 0]);
      return { id };
    }
    return req<{ id: string }>(`/workouts/${workoutId}/exercises`, { method: 'POST', body: JSON.stringify(body) });
  },

  removeExerciseFromWorkout: async (weId: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM workout_exercises WHERE id = ?', [weId]);
      return { ok: true };
    }
    return req<any>(`/workouts/exercises/${weId}`, { method: 'DELETE' });
  },

  // Exercises
  getExercises: async (userId?: string): Promise<any[]> => {
    if (isNative) {
      return userId
        ? nq('SELECT * FROM exercises WHERE is_global = 1 OR user_id = ? ORDER BY muscle_group, name', [userId])
        : nq('SELECT * FROM exercises WHERE is_global = 1 ORDER BY muscle_group, name');
    }
    return req<any[]>(`/exercises${userId ? `?user_id=${userId}` : ''}`);
  },

  createExercise: async (body: { name: string; muscle_group: string; user_id?: string }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      await nr('INSERT INTO exercises (id, name, muscle_group, is_global, user_id) VALUES (?, ?, ?, 0, ?)',
        [id, body.name, body.muscle_group, body.user_id || null]);
      return { id };
    }
    return req<{ id: string }>('/exercises', { method: 'POST', body: JSON.stringify(body) });
  },

  deleteExercise: async (id: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM exercises WHERE id = ? AND is_global = 0', [id]);
      return { ok: true };
    }
    return req<any>(`/exercises/${id}`, { method: 'DELETE' });
  },

  // Sets
  getSets: async (weId: string): Promise<any[]> => {
    if (isNative) return nq('SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number', [weId]);
    return req<any[]>(`/sets?workout_exercise_id=${weId}`);
  },

  createSet: async (body: { workout_exercise_id: string; set_number: number; [key: string]: any }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      const { workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata } = body;
      await nr(
        'INSERT INTO sets (id, workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, workout_exercise_id, set_number, reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, JSON.stringify(metadata ?? {})]
      );
      return { id };
    }
    return req<{ id: string }>('/sets', { method: 'POST', body: JSON.stringify(body) });
  },

  updateSet: async (id: string, body: { reps?: number; weight?: number; rest_time_seconds?: number; rpe?: number; notes?: string; metadata?: object }): Promise<any> => {
    if (isNative) {
      const { reps, weight, rest_time_seconds, rpe, notes, metadata } = body;
      await nr(
        "UPDATE sets SET reps = ?, weight = ?, rest_time_seconds = ?, rpe = ?, notes = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?",
        [reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, JSON.stringify(metadata ?? {}), id]
      );
      return { ok: true };
    }
    return req<any>(`/sets/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },

  deleteSet: async (id: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM sets WHERE id = ?', [id]);
      return { ok: true };
    }
    return req<any>(`/sets/${id}`, { method: 'DELETE' });
  },

  // Sync
  syncPush: async (): Promise<{ pushed: number; remaining?: number }> => {
    if (isNative) {
      const { syncPush } = await import('./sync');
      return syncPush();
    }
    return req<any>('/sync/push', { method: 'POST' });
  },

  syncPull: async (userId: string): Promise<{ exercises: number; workouts: number }> => {
    if (isNative) {
      const { syncPull } = await import('./sync');
      return syncPull(userId);
    }
    return req<any>('/sync/pull', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
  },
};
