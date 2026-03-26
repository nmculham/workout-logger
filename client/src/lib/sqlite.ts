import { Capacitor } from '@capacitor/core';
import { migrations } from './migrations';

// Lazy-loaded so web builds don't fail
let db: any = null;

export async function initSQLiteDb(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
  const sqliteConn = new SQLiteConnection(CapacitorSQLite);

  const DB_NAME = 'workout-logger';
  const isConn = (await sqliteConn.isConnection(DB_NAME, false)).result;

  if (isConn) {
    db = await sqliteConn.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqliteConn.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  }

  await db.open();
  await runMigrations();
}

async function runMigrations(): Promise<void> {
  if (!db) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const result = await db.query('SELECT name FROM __migrations');
  const applied = new Set((result.values ?? []).map((r: any) => r.name));

  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      await db.execute(migration.sql);
      await db.run('INSERT INTO __migrations (name) VALUES (?)', [migration.name]);
      console.log('Applied migration:', migration.name);
    }
  }
}

export async function sqliteQuery(sql: string, params?: any[]): Promise<any[]> {
  if (!db) throw new Error('SQLite not initialized');
  const result = await db.query(sql, params ?? []);
  return result.values ?? [];
}

export async function sqliteRun(sql: string, params?: any[]): Promise<void> {
  if (!db) throw new Error('SQLite not initialized');
  await db.run(sql, params ?? []);
}
