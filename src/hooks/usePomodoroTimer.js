import { useCallback, useEffect, useRef, useState } from 'react';

// Keys for persistence
const LS_KEY = 'pomodoro_settings_v1';
const LS_FLAGS_KEY = 'pomodoro_flags_v1';
const LS_GOAL_KEY = 'pomodoro_goal_v1';
const DEFAULT_WORK = 10; // seconds
const DEFAULT_BREAK = 5; // seconds
const DEFAULT_LONG_BREAK = 15; // seconds (short for demo)
const DEFAULT_CYCLES = 4; // work sessions before a long break
// Preload audio (placed in project root). Vite will handle asset hashing.
import workEndSound from '/timer-terminer-342934.mp3';
import breakEndSound from '/ping-82822.mp3';

const API_BASE = 'http://localhost:4000/api';

export function usePomodoroTimer() {
  // durations are user adjustable
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [longBreakDuration, setLongBreakDuration] = useState(DEFAULT_LONG_BREAK);
  const [cyclesBeforeLongBreak, setCyclesBeforeLongBreak] = useState(DEFAULT_CYCLES);
  const [mode, setMode] = useState('work'); // 'work' | 'break' | 'longBreak'
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_WORK);
  const [isRunning, setIsRunning] = useState(false);
  const [autoStartNext, setAutoStartNext] = useState(true);
  const [progress, setProgress] = useState(null); // {xp,..., achievements?}
  const [achievements, setAchievements] = useState([]);
  const [heatmap, setHeatmap] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(60);
  const [cycleCount, setCycleCount] = useState(0); // completed short work cycles since last long break
  const intervalRef = useRef(null);
  const workAudioRef = useRef(null);
  const breakAudioRef = useRef(null);
  const sessionStartRef = useRef(null);
  const [historySummary, setHistorySummary] = useState(null);
  const modeRef = useRef('work');
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Load persisted settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.work === 'number' && parsed.work > 0) setWorkDuration(parsed.work);
        if (typeof parsed.break === 'number' && parsed.break > 0) setBreakDuration(parsed.break);
        if (typeof parsed.longBreak === 'number' && parsed.longBreak > 0) setLongBreakDuration(parsed.longBreak);
        if (typeof parsed.cycles === 'number' && parsed.cycles > 1) setCyclesBeforeLongBreak(parsed.cycles);
        // Initialize secondsLeft with (possibly) loaded work duration
        if (typeof parsed.work === 'number' && parsed.work > 0) setSecondsLeft(parsed.work);
      }
      const flagsRaw = localStorage.getItem(LS_FLAGS_KEY);
      if (flagsRaw) {
        const flags = JSON.parse(flagsRaw);
        if (typeof flags.autoStartNext === 'boolean') setAutoStartNext(flags.autoStartNext);
        if (typeof flags.notificationsEnabled === 'boolean') setNotificationsEnabled(flags.notificationsEnabled);
      }
      const goalRaw = localStorage.getItem(LS_GOAL_KEY);
      if (goalRaw) {
        const goal = JSON.parse(goalRaw);
        if (typeof goal.dailyGoalMinutes === 'number' && goal.dailyGoalMinutes >= 0) setDailyGoalMinutes(goal.dailyGoalMinutes);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist settings
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ work: workDuration, break: breakDuration, longBreak: longBreakDuration, cycles: cyclesBeforeLongBreak })); } catch { /* ignore */ }
  }, [workDuration, breakDuration, longBreakDuration, cyclesBeforeLongBreak]);

  // Persist flags
  useEffect(() => {
    try { localStorage.setItem(LS_FLAGS_KEY, JSON.stringify({ autoStartNext, notificationsEnabled })); } catch { /* ignore */ }
  }, [autoStartNext, notificationsEnabled]);

  // Persist goal
  useEffect(() => {
    try { localStorage.setItem(LS_GOAL_KEY, JSON.stringify({ dailyGoalMinutes })); } catch { /* ignore */ }
  }, [dailyGoalMinutes]);

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

  const maybeNotify = useCallback((title, body) => {
    try {
      if (!notificationsEnabled) return;
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } catch { /* ignore */ }
  }, [notificationsEnabled]);

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const switchMode = useCallback((opts = {}) => {
    const { manual = false, continueRunning: continueOverride } = opts; // manual switch shouldn't award XP or play sounds
    setMode(prev => {
      const justFinished = prev;
      let next = 'work';
      if (prev === 'work') {
        // Decide short or long break
        const willBeLong = (cycleCount + 1) >= cyclesBeforeLongBreak;
        next = willBeLong ? 'longBreak' : 'break';
        setCycleCount(willBeLong ? 0 : cycleCount + 1);
      } else {
        // coming from any break goes to work
        next = 'work';
      }
      const nextSeconds = next === 'work' ? workDuration : (next === 'break' ? breakDuration : longBreakDuration);
      setSecondsLeft(nextSeconds);
      if (!manual) {
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
                  try {
                    const hm = await fetch(`${API_BASE}/history/heatmap?days=120`);
                    if (hm.ok) { const jj = await hm.json(); if (jj?.data) setHeatmap(jj.data); }
                  } catch { /* ignore */ }
                }
              }
            } catch { /* ignore */ }
          })();
          maybeNotify('Work complete', next === 'work' ? 'Starting work again' : (next === 'break' ? 'Time for a short break' : 'Time for a long break'));
        } else {
          playSound('breakEnd');
          maybeNotify('Break over', 'Back to work');
        }
      }
      // Control running state based on autoStartNext (or provided override for manual skip)
      const shouldContinue = manual ? !!continueOverride : !!autoStartNext;
      if (!shouldContinue) {
        // pause at boundary
        setIsRunning(false);
      } else {
        // continue running; if entering a work interval, mark session start
        setIsRunning(true);
        if (next === 'work') {
          sessionStartRef.current = new Date();
        }
      }
      return next;
    });
  }, [workDuration, breakDuration, longBreakDuration, cyclesBeforeLongBreak, cycleCount, playSound, maybeNotify, autoStartNext]);

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
    if (modeRef.current === 'work') {
      sessionStartRef.current = new Date();
    }
    setIsRunning(true);
  }, [isRunning]);

  const pause = useCallback(() => { setIsRunning(false); }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setMode('work');
    setSecondsLeft(workDuration);
    sessionStartRef.current = null;
    setCycleCount(0);
  }, [workDuration]);

  // Manual skip: switch interval without XP/sounds; optionally keep running if auto-start is on
  const skip = useCallback(() => {
    const wasRunning = isRunning;
    setIsRunning(false);
    switchMode({ manual: true, continueRunning: autoStartNext && wasRunning });
  }, [isRunning, autoStartNext, switchMode]);

  // If user changes durations while NOT running, reflect immediately
  useEffect(() => {
    if (!isRunning && mode === 'work') setSecondsLeft(workDuration);
  }, [workDuration, isRunning, mode]);
  useEffect(() => {
    if (!isRunning && mode === 'break') setSecondsLeft(breakDuration);
  }, [breakDuration, isRunning, mode]);
  useEffect(() => {
    if (!isRunning && mode === 'longBreak') setSecondsLeft(longBreakDuration);
  }, [longBreakDuration, isRunning, mode]);

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
      try {
        const res2 = await fetch(`${API_BASE}/history/heatmap?days=120`);
        if (res2.ok) {
          const j2 = await res2.json();
          if (j2?.data) setHeatmap(j2.data);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const updateDurations = useCallback((nextWork, nextBreak, nextLongBreak, nextCycles) => {
    if (nextWork > 0) setWorkDuration(nextWork);
    if (nextBreak > 0) setBreakDuration(nextBreak);
    if (nextLongBreak > 0) setLongBreakDuration(nextLongBreak);
    if (nextCycles > 1) setCyclesBeforeLongBreak(nextCycles);
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
    skip,
    workDuration,
    breakDuration,
    longBreakDuration,
    cyclesBeforeLongBreak,
    updateDurations,
    progress,
    achievements,
    historySummary,
    heatmap,
    autoStartNext,
    setAutoStartNext,
    notificationsEnabled,
    setNotificationsEnabled,
    dailyGoalMinutes,
    setDailyGoalMinutes,
    cycleCount,
  };
}

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
