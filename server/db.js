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

// Achievements
db.exec(`CREATE TABLE IF NOT EXISTS achievements (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  earned INTEGER NOT NULL DEFAULT 0,
  earned_at TEXT
);`);

// Seed achievements if not exist
const baseAchievements = [
  { code: 'first_session', name: 'First Focus', description: 'Complete your first work session' },
  { code: 'five_sessions', name: 'Getting Warm', description: 'Complete 5 work sessions' },
  { code: 'streak_3', name: 'On a Roll', description: 'Maintain a 3-day streak' }
];
const existingCodes = new Set(db.prepare('SELECT code FROM achievements').all().map(r => r.code));
for (const a of baseAchievements) {
  if (!existingCodes.has(a.code)) {
    db.prepare('INSERT INTO achievements (code, name, description, earned) VALUES (?, ?, ?, 0)').run(a.code, a.name, a.description);
  }
}

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
  const updated = getProgress();
  evaluateAchievements(updated);
  return updated;
}

export function calculateLevel(xp) {
  // Simple linear progression: level every 100 XP
  return Math.floor(xp / 100) + 1;
}

export function getAchievements() {
  return db.prepare('SELECT code, name, description, earned, earned_at FROM achievements ORDER BY code').all();
}

function evaluateAchievements(progress) {
  const achMap = Object.fromEntries(getAchievements().map(a => [a.code, a]));
  const toEarn = [];
  if (!achMap.first_session.earned && progress.work_sessions >= 1) toEarn.push('first_session');
  if (!achMap.five_sessions.earned && progress.work_sessions >= 5) toEarn.push('five_sessions');
  if (!achMap.streak_3.earned && progress.current_streak >= 3) toEarn.push('streak_3');
  if (toEarn.length) {
    const stmt = db.prepare("UPDATE achievements SET earned = 1, earned_at = datetime('now') WHERE code = ?");
    const trx = db.transaction(codes => { codes.forEach(c => stmt.run(c)); });
    trx(toEarn);
  }
}
