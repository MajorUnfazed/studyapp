import React from 'react';
import { usePomodoroTimer, formatTime } from './hooks/usePomodoroTimer.js';

export default function App() {
  const { mode, secondsLeft, isRunning, start, pause, reset } = usePomodoroTimer();

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 360, margin: '2rem auto', textAlign: 'center' }}>
      <h1>Pomodoro</h1>
      <div style={{ marginBottom: '0.5rem' }}>Mode: <strong>{mode === 'work' ? 'Work' : 'Break'}</strong></div>
      <div style={{ fontSize: '3rem', margin: '1rem 0', letterSpacing: '2px' }}>{formatTime(secondsLeft)}</div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        {!isRunning && (
          <button onClick={start}>Start</button>
        )}
        {isRunning && (
          <button onClick={pause}>Pause</button>
        )}
        <button onClick={reset}>Reset</button>
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#555' }}>Work: 00:10 • Break: 00:05 (test mode)</p>
    </div>
  );
}
