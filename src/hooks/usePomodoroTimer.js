import { useCallback, useEffect, useRef, useState } from 'react';

// Durations in seconds (temporary short values for testing sounds)
const WORK_DURATION = 10; // 10 seconds (was 25 * 60)
const BREAK_DURATION = 5; // 5 seconds (as requested)

// Preload audio (placed in project root). Vite will handle asset hashing.
import workEndSound from '/timer-terminer-342934.mp3';
import breakEndSound from '/ping-82822.mp3';

export function usePomodoroTimer() {
  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const workAudioRef = useRef(null);
  const breakAudioRef = useRef(null);

  // Lazy init audio elements once (avoid creating each render)
  useEffect(() => {
    workAudioRef.current = new Audio(workEndSound);
    breakAudioRef.current = new Audio(breakEndSound);
  }, []);

  const playSound = useCallback((type) => {
    const el = type === 'workEnd' ? workAudioRef.current : breakAudioRef.current;
    if (!el) return;
    // Attempt to play; browsers may block before user interaction (user will have interacted by starting timer)
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
      const justFinished = prev; // store what ended
      const next = prev === 'work' ? 'break' : 'work';
      setSecondsLeft(next === 'work' ? WORK_DURATION : BREAK_DURATION);
      // Play corresponding end sound
      if (justFinished === 'work') playSound('workEnd');
      else playSound('breakEnd');
      return next;
    });
  }, [playSound]);

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

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setMode('work');
    setSecondsLeft(WORK_DURATION);
  }, []);

  // Manage interval
  useEffect(() => {
    clear();
    if (isRunning) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return clear;
  }, [isRunning, tick]);

  // When switching modes, ensure we don't display stale second after switch
  useEffect(() => {
    if (!isRunning) return; // already handled by interval
  }, [mode, isRunning]);

  // Cleanup on unmount
  useEffect(() => clear, []);

  return {
    mode,
    secondsLeft,
    isRunning,
    start,
    pause,
    reset,
    workDuration: WORK_DURATION,
    breakDuration: BREAK_DURATION,
  };
}

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
