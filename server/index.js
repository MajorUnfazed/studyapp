import express from 'express';
import cors from 'cors';
import { getSettings, updateSettings, getProgress, recordWorkSession, calculateLevel, getAchievements } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/settings', (_req, res) => {
  try {
    const data = getSettings();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to load settings' });
  }
});

app.post('/api/settings', (req, res) => {
  const { work_seconds, break_seconds } = req.body || {};
  if (typeof work_seconds !== 'number' || work_seconds <= 0 || typeof break_seconds !== 'number' || break_seconds <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid values' });
  }
  try {
    const data = updateSettings(work_seconds, break_seconds);
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

app.get('/api/progress', (_req, res) => {
  try {
    const p = getProgress();
  const achievements = getAchievements();
  res.json({ success: true, data: { ...p, level: calculateLevel(p.xp), achievements } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to load progress' });
  }
});

app.post('/api/session-complete', (req, res) => {
  // For now assume only work sessions count for XP
  try {
    const p = recordWorkSession();
    const achievements = getAchievements();
    res.json({ success: true, data: { ...p, level: calculateLevel(p.xp), achievements } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to record session' });
  }
});

app.get('/api/achievements', (_req, res) => {
  try {
    const achievements = getAchievements();
    res.json({ success: true, data: achievements });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to load achievements' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
