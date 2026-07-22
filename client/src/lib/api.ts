import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

const isNative = Capacitor.isNativePlatform();

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

// SQLite stores metadata as TEXT; Postgres wants a JSON object. Legacy rows may
// hold junk like "[object Object]", so fall back to {} rather than throwing.
function parseMetadata(raw: any): object {
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function nativeQueueSync(table: string, recordId: string, op: string, payload: object) {
  await nr(
    'INSERT INTO sync_queue (table_name, record_id, operation, payload) VALUES (?, ?, ?, ?)',
    [table, recordId, op, JSON.stringify(payload)]
  );
}

// ── Web: Supabase helper ──────────────────────────────────────────────────────
function sbErr(error: any): never {
  throw new Error(error?.message ?? 'Supabase error');
}

// ── Unified API ───────────────────────────────────────────────────────────────
export const api = {
  // Workouts
  getWorkouts: async (userId: string): Promise<any[]> => {
    if (isNative) return nq('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC', [userId]);
    const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId).order('date', { ascending: false });
    if (error) sbErr(error);
    return data ?? [];
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
    const { data: workout, error: wErr } = await supabase.from('workouts').select('*').eq('id', id).single();
    if (wErr) sbErr(wErr);
    const { data: weRows, error: weErr } = await supabase
      .from('workout_exercises')
      .select('*, exercises(name, muscle_group)')
      .eq('workout_id', id)
      .order('order');
    if (weErr) sbErr(weErr);
    const exercises = (weRows ?? []).map(({ exercises: ex, ...we }: any) => ({
      ...we,
      exercise_name: ex?.name,
      muscle_group: ex?.muscle_group,
    }));
    const weIds = exercises.map((we: any) => we.id);
    const { data: sets } = weIds.length
      ? await supabase.from('sets').select('*').in('workout_exercise_id', weIds).order('set_number')
      : { data: [] };
    return { ...workout, exercises, sets: sets ?? [] };
  },

  createWorkout: async (body: { user_id: string; name: string; date: string; notes?: string }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      await nr('INSERT INTO workouts (id, user_id, name, date, notes) VALUES (?, ?, ?, ?, ?)',
        [id, body.user_id, body.name, body.date, body.notes || null]);
      await nativeQueueSync('workouts', id, 'INSERT', { id, ...body });
      return { id };
    }
    const id = genId();
    const { error } = await supabase.from('workouts').insert({ id, ...body });
    if (error) sbErr(error);
    return { id };
  },

  updateWorkout: async (id: string, body: { name: string; date: string; notes?: string }): Promise<any> => {
    if (isNative) {
      await nr("UPDATE workouts SET name = ?, date = ?, notes = ?, updated_at = datetime('now') WHERE id = ?",
        [body.name, body.date, body.notes || null, id]);
      await nativeQueueSync('workouts', id, 'UPDATE', body);
      return { ok: true };
    }
    const { error } = await supabase.from('workouts').update(body).eq('id', id);
    if (error) sbErr(error);
    return { ok: true };
  },

  deleteWorkout: async (id: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM workouts WHERE id = ?', [id]);
      await nativeQueueSync('workouts', id, 'DELETE', {});
      return { ok: true };
    }
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) sbErr(error);
    return { ok: true };
  },

  addExerciseToWorkout: async (workoutId: string, body: { exercise_id: string; order?: number }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      await nr('INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES (?, ?, ?, ?)',
        [id, workoutId, body.exercise_id, body.order ?? 0]);
      await nativeQueueSync('workout_exercises', id, 'INSERT', { id, workout_id: workoutId, exercise_id: body.exercise_id, order: body.order ?? 0 });
      return { id };
    }
    const id = genId();
    const { error } = await supabase.from('workout_exercises').insert({
      id, workout_id: workoutId, exercise_id: body.exercise_id, order: body.order ?? 0,
    });
    if (error) sbErr(error);
    return { id };
  },

  removeExerciseFromWorkout: async (weId: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM workout_exercises WHERE id = ?', [weId]);
      await nativeQueueSync('workout_exercises', weId, 'DELETE', {});
      return { ok: true };
    }
    const { error } = await supabase.from('workout_exercises').delete().eq('id', weId);
    if (error) sbErr(error);
    return { ok: true };
  },

  updateWorkoutExerciseMeta: async (weId: string, metadata: object): Promise<any> => {
    if (isNative) {
      await nr("UPDATE workout_exercises SET metadata = ? WHERE id = ?", [JSON.stringify(metadata), weId]);
      await nativeQueueSync('workout_exercises', weId, 'UPDATE', { metadata });
      return { ok: true };
    }
    const { error } = await supabase.from('workout_exercises').update({ metadata: metadata as any }).eq('id', weId);
    if (error) sbErr(error);
    return { ok: true };
  },

  // Exercises
  getExercises: async (userId?: string): Promise<any[]> => {
    if (isNative) {
      return userId
        ? nq('SELECT * FROM exercises WHERE is_global = 1 OR user_id = ? ORDER BY muscle_group, name', [userId])
        : nq('SELECT * FROM exercises WHERE is_global = 1 ORDER BY muscle_group, name');
    }
    const query = supabase.from('exercises').select('*').order('muscle_group').order('name');
    const { data, error } = userId
      ? await query.or(`is_global.eq.true,user_id.eq.${userId}`)
      : await query.eq('is_global', true);
    if (error) sbErr(error);
    return data ?? [];
  },

  createExercise: async (body: { name: string; muscle_group: string; user_id?: string }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      await nr('INSERT INTO exercises (id, name, muscle_group, is_global, user_id) VALUES (?, ?, ?, 0, ?)',
        [id, body.name, body.muscle_group, body.user_id || null]);
      return { id };
    }
    const id = genId();
    const { error } = await supabase.from('exercises').insert({ id, ...body, is_global: false });
    if (error) sbErr(error);
    return { id };
  },

  deleteExercise: async (id: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM exercises WHERE id = ? AND is_global = 0', [id]);
      return { ok: true };
    }
    const { error } = await supabase.from('exercises').delete().eq('id', id).eq('is_global', false);
    if (error) sbErr(error);
    return { ok: true };
  },

  // Sets
  getSets: async (weId: string): Promise<any[]> => {
    if (isNative) return nq('SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number', [weId]);
    const { data, error } = await supabase.from('sets').select('*').eq('workout_exercise_id', weId).order('set_number');
    if (error) sbErr(error);
    return data ?? [];
  },

  createSet: async (body: { workout_exercise_id: string; set_number: number; [key: string]: any }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      const { workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata } = body;
      await nr(
        'INSERT INTO sets (id, workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, workout_exercise_id, set_number, reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, JSON.stringify(metadata ?? {})]
      );
      await nativeQueueSync('sets', id, 'INSERT', { id, workout_exercise_id, set_number, reps: reps ?? null, weight: weight ?? null, rest_time_seconds: rest_time_seconds ?? null, rpe: rpe ?? null, notes: notes ?? null, metadata: metadata ?? {} });
      return { id };
    }
    const id = genId();
    const { error } = await supabase.from('sets').insert({ id, ...body });
    if (error) sbErr(error);
    return { id };
  },

  updateSet: async (id: string, body: { reps?: number; weight?: number; rest_time_seconds?: number; rpe?: number; notes?: string; metadata?: object }): Promise<any> => {
    if (isNative) {
      const { reps, weight, rest_time_seconds, rpe, notes, metadata } = body;
      await nr(
        "UPDATE sets SET reps = ?, weight = ?, rest_time_seconds = ?, rpe = ?, notes = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?",
        [reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, JSON.stringify(metadata ?? {}), id]
      );
      await nativeQueueSync('sets', id, 'UPDATE', body);
      return { ok: true };
    }
    const { error } = await supabase.from('sets').update(body).eq('id', id);
    if (error) sbErr(error);
    return { ok: true };
  },

  deleteSet: async (id: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM sets WHERE id = ?', [id]);
      await nativeQueueSync('sets', id, 'DELETE', {});
      return { ok: true };
    }
    const { error } = await supabase.from('sets').delete().eq('id', id);
    if (error) sbErr(error);
    return { ok: true };
  },

  // Templates
  getTemplates: async (userId: string): Promise<any[]> => {
    if (isNative) return nq(`
      SELECT wt.*,
        COUNT(DISTINCT te.id) as exercise_count,
        GROUP_CONCAT(e.name, ', ') as exercise_names
      FROM workout_templates wt
      LEFT JOIN template_exercises te ON te.template_id = wt.id
      LEFT JOIN exercises e ON e.id = te.exercise_id
      WHERE wt.user_id = ?
      GROUP BY wt.id
      ORDER BY wt.created_at DESC
    `, [userId]);
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*, template_exercises(id, exercises(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) sbErr(error);
    return (data ?? []).map(({ template_exercises: tes, ...t }: any) => ({
      ...t,
      exercise_count: tes?.length ?? 0,
      exercise_names: tes?.map((te: any) => te.exercises?.name).filter(Boolean).join(', ') ?? '',
    }));
  },

  getTemplate: async (id: string): Promise<any> => {
    if (isNative) {
      const rows = await nq('SELECT * FROM workout_templates WHERE id = ?', [id]);
      if (!rows.length) return null;
      const exercises = await nq(`
        SELECT te.*, e.name as exercise_name, e.muscle_group
        FROM template_exercises te
        JOIN exercises e ON e.id = te.exercise_id
        WHERE te.template_id = ?
        ORDER BY te."order"
      `, [id]);
      const teIds = exercises.map((te: any) => te.id);
      const sets = teIds.length
        ? await nq(
            `SELECT * FROM template_sets WHERE template_exercise_id IN (${teIds.map(() => '?').join(',')}) ORDER BY set_number`,
            teIds
          )
        : [];
      return { ...rows[0], exercises, sets };
    }
    const { data: template, error: tErr } = await supabase.from('workout_templates').select('*').eq('id', id).single();
    if (tErr) sbErr(tErr);
    const { data: teRows, error: teErr } = await supabase
      .from('template_exercises')
      .select('*, exercises(name, muscle_group)')
      .eq('template_id', id)
      .order('order');
    if (teErr) sbErr(teErr);
    const exercises = (teRows ?? []).map(({ exercises: ex, ...te }: any) => ({
      ...te,
      exercise_name: ex?.name,
      muscle_group: ex?.muscle_group,
    }));
    const teIds = exercises.map((te: any) => te.id);
    const { data: sets } = teIds.length
      ? await supabase.from('template_sets').select('*').in('template_exercise_id', teIds).order('set_number')
      : { data: [] };
    return { ...template, exercises, sets: sets ?? [] };
  },

  updateTemplate: async (id: string, body: { name: string; notes?: string }): Promise<any> => {
    if (isNative) {
      await nr('UPDATE workout_templates SET name = ?, notes = ? WHERE id = ?', [body.name, body.notes || null, id]);
      await nativeQueueSync('workout_templates', id, 'UPDATE', { name: body.name, notes: body.notes || null });
      return { ok: true };
    }
    const { error } = await supabase.from('workout_templates').update({ name: body.name, notes: body.notes ?? null }).eq('id', id);
    if (error) sbErr(error);
    return { ok: true };
  },

  addExerciseToTemplate: async (templateId: string, body: { exercise_id: string; order?: number }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      await nr('INSERT INTO template_exercises (id, template_id, exercise_id, "order") VALUES (?, ?, ?, ?)',
        [id, templateId, body.exercise_id, body.order ?? 0]);
      await nativeQueueSync('template_exercises', id, 'INSERT', { id, template_id: templateId, exercise_id: body.exercise_id, order: body.order ?? 0 });
      return { id };
    }
    const id = genId();
    const { error } = await supabase.from('template_exercises').insert({
      id, template_id: templateId, exercise_id: body.exercise_id, order: body.order ?? 0,
    });
    if (error) sbErr(error);
    return { id };
  },

  removeTemplateExercise: async (teId: string): Promise<any> => {
    if (isNative) {
      // Delete children explicitly — FK cascades aren't guaranteed to be on in SQLite.
      await nr('DELETE FROM template_sets WHERE template_exercise_id = ?', [teId]);
      await nr('DELETE FROM template_exercises WHERE id = ?', [teId]);
      await nativeQueueSync('template_exercises', teId, 'DELETE', {});
      return { ok: true };
    }
    const { error } = await supabase.from('template_exercises').delete().eq('id', teId);
    if (error) sbErr(error);
    return { ok: true };
  },

  createTemplateSet: async (body: { template_exercise_id: string; set_number: number; [key: string]: any }): Promise<{ id: string }> => {
    if (isNative) {
      const id = genId();
      const { template_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata } = body;
      await nr(
        'INSERT INTO template_sets (id, template_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, template_exercise_id, set_number, reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, JSON.stringify(metadata ?? {})]
      );
      await nativeQueueSync('template_sets', id, 'INSERT', { id, template_exercise_id, set_number, reps: reps ?? null, weight: weight ?? null, rest_time_seconds: rest_time_seconds ?? null, rpe: rpe ?? null, notes: notes ?? null, metadata: metadata ?? {} });
      return { id };
    }
    const id = genId();
    const { error } = await supabase.from('template_sets').insert({ id, ...body });
    if (error) sbErr(error);
    return { id };
  },

  updateTemplateSet: async (id: string, body: { reps?: number; weight?: number; rest_time_seconds?: number; rpe?: number; notes?: string; metadata?: object }): Promise<any> => {
    if (isNative) {
      const { reps, weight, rest_time_seconds, rpe, notes, metadata } = body;
      // template_sets has no updated_at column
      await nr(
        'UPDATE template_sets SET reps = ?, weight = ?, rest_time_seconds = ?, rpe = ?, notes = ?, metadata = ? WHERE id = ?',
        [reps ?? null, weight ?? null, rest_time_seconds ?? null, rpe ?? null, notes ?? null, JSON.stringify(metadata ?? {}), id]
      );
      await nativeQueueSync('template_sets', id, 'UPDATE', body);
      return { ok: true };
    }
    const { error } = await supabase.from('template_sets').update(body).eq('id', id);
    if (error) sbErr(error);
    return { ok: true };
  },

  deleteTemplateSet: async (id: string): Promise<any> => {
    if (isNative) {
      await nr('DELETE FROM template_sets WHERE id = ?', [id]);
      await nativeQueueSync('template_sets', id, 'DELETE', {});
      return { ok: true };
    }
    const { error } = await supabase.from('template_sets').delete().eq('id', id);
    if (error) sbErr(error);
    return { ok: true };
  },

  saveAsTemplate: async (workoutId: string, name: string): Promise<{ id: string }> => {
    if (isNative) {
      const workout = await nq('SELECT * FROM workouts WHERE id = ?', [workoutId]);
      if (!workout.length) throw new Error('Workout not found');
      const templateId = genId();
      await nr('INSERT INTO workout_templates (id, user_id, name, notes) VALUES (?, ?, ?, ?)',
        [templateId, workout[0].user_id, name, workout[0].notes || null]);
      await nativeQueueSync('workout_templates', templateId, 'INSERT',
        { id: templateId, user_id: workout[0].user_id, name, notes: workout[0].notes || null });
      const wes = await nq('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY "order"', [workoutId]);
      for (const we of wes) {
        const teId = genId();
        await nr('INSERT INTO template_exercises (id, template_id, exercise_id, "order") VALUES (?, ?, ?, ?)',
          [teId, templateId, we.exercise_id, we.order]);
        await nativeQueueSync('template_exercises', teId, 'INSERT',
          { id: teId, template_id: templateId, exercise_id: we.exercise_id, order: we.order });
        const sets = await nq('SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number', [we.id]);
        for (const s of sets) {
          const tsId = genId();
          await nr('INSERT INTO template_sets (id, template_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES (?,?,?,?,?,?,?,?,?)',
            [tsId, teId, s.set_number, s.reps ?? null, s.weight ?? null, s.rest_time_seconds ?? null, s.rpe ?? null, s.notes ?? null, s.metadata || '{}']);
          await nativeQueueSync('template_sets', tsId, 'INSERT', {
            id: tsId, template_exercise_id: teId, set_number: s.set_number,
            reps: s.reps ?? null, weight: s.weight ?? null, rest_time_seconds: s.rest_time_seconds ?? null,
            rpe: s.rpe ?? null, notes: s.notes ?? null, metadata: parseMetadata(s.metadata),
          });
        }
      }
      return { id: templateId };
    }
    const { data: workout, error: wErr } = await supabase.from('workouts').select('*').eq('id', workoutId).single();
    if (wErr) sbErr(wErr);
    const templateId = genId();
    const { error: tErr } = await supabase.from('workout_templates').insert({
      id: templateId, user_id: workout.user_id, name, notes: workout.notes ?? null,
    });
    if (tErr) sbErr(tErr);
    const { data: wes, error: weErr } = await supabase.from('workout_exercises').select('*').eq('workout_id', workoutId).order('order');
    if (weErr) sbErr(weErr);
    for (const we of wes ?? []) {
      const teId = genId();
      const { error: teErr } = await supabase.from('template_exercises').insert({
        id: teId, template_id: templateId, exercise_id: we.exercise_id, order: we.order,
      });
      if (teErr) sbErr(teErr);
      const { data: sets, error: sErr } = await supabase.from('sets').select('*').eq('workout_exercise_id', we.id).order('set_number');
      if (sErr) sbErr(sErr);
      for (const s of sets ?? []) {
        const { error: tsErr } = await supabase.from('template_sets').insert({
          id: genId(), template_exercise_id: teId, set_number: s.set_number,
          reps: s.reps ?? null, weight: s.weight ?? null, rest_time_seconds: s.rest_time_seconds ?? null,
          rpe: s.rpe ?? null, notes: s.notes ?? null, metadata: s.metadata ?? {},
        });
        if (tsErr) sbErr(tsErr);
      }
    }
    return { id: templateId };
  },

  deleteTemplate: async (id: string): Promise<any> => {
    if (isNative) {
      // Delete children explicitly — FK cascades aren't guaranteed to be on in SQLite.
      await nr('DELETE FROM template_sets WHERE template_exercise_id IN (SELECT id FROM template_exercises WHERE template_id = ?)', [id]);
      await nr('DELETE FROM template_exercises WHERE template_id = ?', [id]);
      await nr('DELETE FROM workout_templates WHERE id = ?', [id]);
      await nativeQueueSync('workout_templates', id, 'DELETE', {});
      return { ok: true };
    }
    const { error } = await supabase.from('workout_templates').delete().eq('id', id);
    if (error) sbErr(error);
    return { ok: true };
  },

  applyTemplate: async (templateId: string, body: { user_id: string; name: string; date: string }): Promise<{ id: string }> => {
    if (isNative) {
      const tmpl = await nq('SELECT * FROM workout_templates WHERE id = ?', [templateId]);
      if (!tmpl.length) throw new Error('Template not found');
      const workoutId = genId();
      await nr('INSERT INTO workouts (id, user_id, name, date, notes) VALUES (?, ?, ?, ?, ?)',
        [workoutId, body.user_id, body.name, body.date, tmpl[0].notes || null]);
      await nativeQueueSync('workouts', workoutId, 'INSERT', { id: workoutId, ...body, notes: tmpl[0].notes || null });
      const tes = await nq('SELECT * FROM template_exercises WHERE template_id = ? ORDER BY "order"', [templateId]);
      for (const te of tes) {
        const weId = genId();
        await nr('INSERT INTO workout_exercises (id, workout_id, exercise_id, "order") VALUES (?, ?, ?, ?)',
          [weId, workoutId, te.exercise_id, te.order]);
        await nativeQueueSync('workout_exercises', weId, 'INSERT',
          { id: weId, workout_id: workoutId, exercise_id: te.exercise_id, order: te.order });
        const tsets = await nq('SELECT * FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number', [te.id]);
        for (const ts of tsets) {
          const sId = genId();
          await nr('INSERT INTO sets (id, workout_exercise_id, set_number, reps, weight, rest_time_seconds, rpe, notes, metadata) VALUES (?,?,?,?,?,?,?,?,?)',
            [sId, weId, ts.set_number, ts.reps ?? null, ts.weight ?? null, ts.rest_time_seconds ?? null, ts.rpe ?? null, ts.notes ?? null, ts.metadata || '{}']);
          await nativeQueueSync('sets', sId, 'INSERT', {
            id: sId, workout_exercise_id: weId, set_number: ts.set_number,
            reps: ts.reps ?? null, weight: ts.weight ?? null, rest_time_seconds: ts.rest_time_seconds ?? null,
            rpe: ts.rpe ?? null, notes: ts.notes ?? null, metadata: parseMetadata(ts.metadata),
          });
        }
      }
      return { id: workoutId };
    }
    const { data: template, error: tErr } = await supabase.from('workout_templates').select('*').eq('id', templateId).single();
    if (tErr) sbErr(tErr);
    const workoutId = genId();
    const { error: wErr } = await supabase.from('workouts').insert({
      id: workoutId, user_id: body.user_id, name: body.name, date: body.date, notes: template.notes ?? null,
    });
    if (wErr) sbErr(wErr);
    const { data: tes, error: teErr } = await supabase.from('template_exercises').select('*').eq('template_id', templateId).order('order');
    if (teErr) sbErr(teErr);
    for (const te of tes ?? []) {
      const weId = genId();
      const { error: weErr } = await supabase.from('workout_exercises').insert({
        id: weId, workout_id: workoutId, exercise_id: te.exercise_id, order: te.order,
      });
      if (weErr) sbErr(weErr);
      const { data: tsets, error: tsErr } = await supabase.from('template_sets').select('*').eq('template_exercise_id', te.id).order('set_number');
      if (tsErr) sbErr(tsErr);
      for (const ts of tsets ?? []) {
        const { error: sErr } = await supabase.from('sets').insert({
          id: genId(), workout_exercise_id: weId, set_number: ts.set_number,
          reps: ts.reps ?? null, weight: ts.weight ?? null, rest_time_seconds: ts.rest_time_seconds ?? null,
          rpe: ts.rpe ?? null, notes: ts.notes ?? null, metadata: ts.metadata ?? {},
        });
        if (sErr) sbErr(sErr);
      }
    }
    return { id: workoutId };
  },

  // Sync — native only; no-op on web since Supabase is the live store
  syncPush: async (): Promise<{ pushed: number; remaining?: number }> => {
    if (isNative) {
      const { syncPush } = await import('./sync');
      return syncPush();
    }
    return { pushed: 0 };
  },

  syncPull: async (userId: string): Promise<{ exercises: number; workouts: number; templates: number }> => {
    if (isNative) {
      const { syncPull } = await import('./sync');
      return syncPull(userId);
    }
    return { exercises: 0, workouts: 0, templates: 0 };
  },
};
