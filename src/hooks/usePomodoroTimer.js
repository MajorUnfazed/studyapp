import { useCallback, useEffect, useRef, useState } from 'react';

// Keys for persistence
const LS_KEY = 'pomodoro_settings_v1';
const DEFAULT_WORK = 10; // seconds
const DEFAULT_BREAK = 5; // seconds
// Preload audio (placed in project root). Vite will handle asset hashing.
import workEndSound from '/timer-terminer-342934.mp3';
import breakEndSound from '/ping-82822.mp3';

const API_BASE = 'http://localhost:4000/api';

export function usePomodoroTimer() {
  // durations are user adjustable
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_WORK);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(null); // {xp,..., achievements?}
  const [achievements, setAchievements] = useState([]);
  const intervalRef = useRef(null);
  const workAudioRef = useRef(null);
  const breakAudioRef = useRef(null);
  const sessionStartRef = useRef(null);
  const [historySummary, setHistorySummary] = useState(null);

  // Load persisted settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.work === 'number' && parsed.work > 0) setWorkDuration(parsed.work);
        if (typeof parsed.break === 'number' && parsed.break > 0) setBreakDuration(parsed.break);
        // Initialize secondsLeft with (possibly) loaded work duration
        if (typeof parsed.work === 'number' && parsed.work > 0) setSecondsLeft(parsed.work);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist settings
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ work: workDuration, break: breakDuration })); } catch { /* ignore */ }
  }, [workDuration, breakDuration]);

  // Lazy init audio elements once
  useEffect(() => {
    workAudioRef.current = new Audio(workEndSound);
    breakAudioRef.current = new Audio(breakEndSound);
  }, []);

  const playSound = useCallback((type) => {
    const el = type === 'workEnd' ? workAudioRef.current : breakAudioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play().catch(() => {/* ignore */});
  }, []);

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const switchMode = useCallback(() => {
    setMode(prev => {
      const justFinished = prev;
      const next = prev === 'work' ? 'break' : 'work';
      setSecondsLeft(next === 'work' ? workDuration : breakDuration);
      if (justFinished === 'work') {
        playSound('workEnd');
        const end = new Date();
        const startDate = sessionStartRef.current || end;
        const duration = Math.round((end - startDate) / 1000);
        sessionStartRef.current = null;
        (async () => {
          try {
            const res = await fetch(`${API_BASE}/session-complete`, { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ started_at: startDate.toISOString(), ended_at: end.toISOString(), duration_seconds: duration })
            });
            if (res.ok) {
              const j = await res.json();
              if (j?.data) {
                setProgress(j.data);
                if (j.data.achievements) setAchievements(j.data.achievements);
                if (j.data.history) setHistorySummary(j.data.history);
              }
            }
          } catch { /* ignore */ }
        })();
      } else {
        playSound('breakEnd');
      }
      return next;
    });
  }, [workDuration, breakDuration, playSound]);

  const tick = useCallback(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        switchMode();
        return prev;
      }
      return prev - 1;
    });
  }, [switchMode]);

  const start = useCallback(() => {
    if (isRunning) return;
    sessionStartRef.current = new Date();
    setIsRunning(true);
  }, [isRunning]);

  const pause = useCallback(() => { setIsRunning(false); }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setMode('work');
    setSecondsLeft(workDuration);
  }, [workDuration]);

  // If user changes durations while NOT running, reflect immediately
  useEffect(() => {
    if (!isRunning && mode === 'work') setSecondsLeft(workDuration);
  }, [workDuration, isRunning, mode]);
  useEffect(() => {
    if (!isRunning && mode === 'break') setSecondsLeft(breakDuration);
  }, [breakDuration, isRunning, mode]);

  useEffect(() => {
    clear();
    if (isRunning) intervalRef.current = setInterval(tick, 1000);
    return clear;
  }, [isRunning, tick]);

  useEffect(() => clear, []);

  // After local load, attempt server fetch (non-blocking)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`);
        if (!res.ok) return;
        const json = await res.json();
        if (json?.data) {
          const { work_seconds, break_seconds } = json.data;
            if (typeof work_seconds === 'number' && work_seconds > 0) setWorkDuration(work_seconds);
            if (typeof break_seconds === 'number' && break_seconds > 0) setBreakDuration(break_seconds);
            if (mode === 'work') setSecondsLeft(work_seconds);
        }
      } catch { /* offline or server not started */ }
    })();
  }, []);

  // Fetch progress data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/progress`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setProgress(json.data);
            if (json.data.achievements) setAchievements(json.data.achievements);
          }
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Initial history fetch
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/history/summary`);
        if (res.ok) {
          const j = await res.json();
          if (j?.data) setHistorySummary(j.data);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const updateDurations = useCallback((nextWork, nextBreak) => {
    if (nextWork > 0) setWorkDuration(nextWork);
    if (nextBreak > 0) setBreakDuration(nextBreak);
    // Fire and forget save to server
    (async () => {
      try {
        await fetch(`${API_BASE}/settings`, {
          method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ work_seconds: nextWork, break_seconds: nextBreak })
        });
      } catch { /* ignore network errors */ }
    })();
  }, []);

  return {
    mode,
    secondsLeft,
    isRunning,
    start,
    pause,
    reset,
    workDuration,
    breakDuration,
    updateDurations,
    progress,
    achievements,
    historySummary,
  };
}

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
