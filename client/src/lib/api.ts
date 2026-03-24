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

export const api = {
  // Workouts
  getWorkouts: (userId: string) => req<any[]>(`/workouts?user_id=${userId}`),
  getWorkout: (id: string) => req<any>(`/workouts/${id}`),
  createWorkout: (body: object) => req<{ id: string }>('/workouts', { method: 'POST', body: JSON.stringify(body) }),
  updateWorkout: (id: string, body: object) => req<any>(`/workouts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWorkout: (id: string) => req<any>(`/workouts/${id}`, { method: 'DELETE' }),

  // Workout exercises
  addExerciseToWorkout: (workoutId: string, body: object) =>
    req<{ id: string }>(`/workouts/${workoutId}/exercises`, { method: 'POST', body: JSON.stringify(body) }),
  removeExerciseFromWorkout: (weId: string) =>
    req<any>(`/workouts/exercises/${weId}`, { method: 'DELETE' }),

  // Exercises
  getExercises: (userId?: string) =>
    req<any[]>(`/exercises${userId ? `?user_id=${userId}` : ''}`),
  createExercise: (body: object) => req<{ id: string }>('/exercises', { method: 'POST', body: JSON.stringify(body) }),
  deleteExercise: (id: string) => req<any>(`/exercises/${id}`, { method: 'DELETE' }),

  // Sets
  getSets: (weId: string) => req<any[]>(`/sets?workout_exercise_id=${weId}`),
  createSet: (body: object) => req<{ id: string }>('/sets', { method: 'POST', body: JSON.stringify(body) }),
  updateSet: (id: string, body: object) => req<any>(`/sets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSet: (id: string) => req<any>(`/sets/${id}`, { method: 'DELETE' }),

  // Sync
  syncPush: () => req<any>('/sync/push', { method: 'POST' }),
  syncPull: (userId: string) => req<any>('/sync/pull', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
};
