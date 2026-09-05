import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { Profile } from '../shared/content.js';
export class CharacterStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS characters (token_hash TEXT PRIMARY KEY, profile TEXT NOT NULL, updated_at TEXT NOT NULL)');
  }
  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
  load(token: string): Profile | undefined {
    const row = this.db.prepare('SELECT profile FROM characters WHERE token_hash = ?').get(this.hash(token));
    return row ? JSON.parse(row.profile as string) : undefined;
  }
  save(token: string, profile: Profile) {
    this.db.prepare('INSERT INTO characters VALUES (?, ?, ?) ON CONFLICT(token_hash) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at').run(this.hash(token), JSON.stringify({ ...profile, cooldowns: {} }), new Date().toISOString());
  }
  close() { this.db.close(); }
}
