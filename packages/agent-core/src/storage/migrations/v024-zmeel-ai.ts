/**
 * Migration v024 — create zmeel_credits table
 *
 * Stores the last known credit usage for the Zmeel AI free tier.
 * Uses a dedicated single-row table instead of a column on `providers`
 * because `setConnectedProvider()` uses INSERT OR REPLACE which would
 * silently wipe any extra columns on the providers table.
 */
import type { Database } from 'better-sqlite3';
import type { Migration } from './index.js';

export const migration: Migration = {
  version: 25,
  up: (db: Database) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS zmeel_credits (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        credits_json TEXT NOT NULL
      )
    `);
  },
  down: (db: Database) => {
    db.exec('DROP TABLE IF EXISTS zmeel_credits');
  },
};
