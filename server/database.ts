import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { migrateProfile, type Profile, type CharacterClass } from '../shared/content.js';
export class CharacterStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS characters (token_hash TEXT PRIMARY KEY, profile TEXT NOT NULL, updated_at TEXT NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS class_profiles (token_hash TEXT NOT NULL, class_type TEXT NOT NULL, profile TEXT NOT NULL, PRIMARY KEY(token_hash, class_type))');
  }
  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
  load(token: string): Profile | undefined {
    const row = this.db.prepare('SELECT profile FROM characters WHERE token_hash = ?').get(this.hash(token));
    return row ? migrateProfile(JSON.parse(row.profile as string)) : undefined;
  }
  save(token: string, profile: Profile) {
    const hash = this.hash(token), json = JSON.stringify({ ...profile, cooldowns: {} });
    this.db.exec('BEGIN');
    try {
      this.db.prepare('INSERT INTO characters VALUES (?, ?, ?) ON CONFLICT(token_hash) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at').run(hash, json, new Date().toISOString());
      if (!profile.classChoicePending) this.db.prepare('INSERT INTO class_profiles VALUES (?, ?, ?) ON CONFLICT(token_hash, class_type) DO UPDATE SET profile = excluded.profile').run(hash, profile.classType, json);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  loadClass(token: string, classType: CharacterClass): Profile | undefined {
    const row = this.db.prepare('SELECT profile FROM class_profiles WHERE token_hash = ? AND class_type = ?').get(this.hash(token), classType);
    if (row) return migrateProfile(JSON.parse(row.profile as string));
    const active = this.load(token);
    return active?.classType === classType && !active.classChoicePending ? active : undefined;
  }
  close() { this.db.close(); }
}
