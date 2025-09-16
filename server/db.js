import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  work_seconds INTEGER NOT NULL,
  break_seconds INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);`);

// Progress tracking (single-user for now)
db.exec(`CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  xp INTEGER NOT NULL,
  work_sessions INTEGER NOT NULL,
  current_streak INTEGER NOT NULL,
  last_session_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`);

const progressRow = db.prepare('SELECT * FROM progress WHERE id = 1').get();
if (!progressRow) {
  db.prepare("INSERT INTO progress (id, xp, work_sessions, current_streak, last_session_date, created_at, updated_at) VALUES (1, 0, 0, 0, NULL, datetime('now'), datetime('now'))").run();
}

// Ensure single row
const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
if (!row) {
  db.prepare("INSERT INTO settings (id, work_seconds, break_seconds, updated_at) VALUES (1, ?, ?, datetime('now'))")
    .run(10, 5);
}

export function getSettings() {
  return db.prepare('SELECT work_seconds, break_seconds FROM settings WHERE id = 1').get();
}

export function updateSettings(work, brk) {
  db.prepare("UPDATE settings SET work_seconds = ?, break_seconds = ?, updated_at = datetime('now') WHERE id = 1")
    .run(work, brk);
  return getSettings();
}

export function getProgress() {
  return db.prepare('SELECT xp, work_sessions, current_streak, last_session_date FROM progress WHERE id = 1').get();
}

export function recordWorkSession() {
  const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const p = getProgress();
  let newStreak = p.current_streak;
  if (p.last_session_date === today) {
    // same day, streak unchanged
  } else {
    // check if yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    if (p.last_session_date === yesterday) newStreak += 1; else newStreak = 1;
  }
  const xpGain = 10; // static per session
  db.prepare("UPDATE progress SET xp = xp + ?, work_sessions = work_sessions + 1, current_streak = ?, last_session_date = ?, updated_at = datetime('now') WHERE id = 1")
    .run(xpGain, newStreak, today);
  return getProgress();
}

export function calculateLevel(xp) {
  // Simple linear progression: level every 100 XP
  return Math.floor(xp / 100) + 1;
}
