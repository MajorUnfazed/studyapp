import { useCallback, useEffect, useRef, useState } from 'react';

// Keys for persistence
const LS_KEY = 'pomodoro_settings_v1';
const DEFAULT_WORK = 10; // seconds
const DEFAULT_BREAK = 5; // seconds
// Preload audio (placed in project root). Vite will handle asset hashing.
import workEndSound from '/timer-terminer-342934.mp3';
import breakEndSound from '/ping-82822.mp3';

export function usePomodoroTimer() {
  // durations are user adjustable
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_WORK);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const workAudioRef = useRef(null);
  const breakAudioRef = useRef(null);

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
      if (justFinished === 'work') playSound('workEnd'); else playSound('breakEnd');
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

  const updateDurations = useCallback((nextWork, nextBreak) => {
    // Guard: don't allow zero or negative
    if (nextWork > 0) setWorkDuration(nextWork);
    if (nextBreak > 0) setBreakDuration(nextBreak);
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
  };
}

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
