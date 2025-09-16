import React, { useState, useEffect } from 'react';
import { usePomodoroTimer, formatTime } from './hooks/usePomodoroTimer.js';

export default function App() {
  const { mode, secondsLeft, isRunning, start, pause, reset, workDuration, breakDuration, updateDurations, progress } = usePomodoroTimer();
  const [workInput, setWorkInput] = useState(workDuration);
  const [breakInput, setBreakInput] = useState(breakDuration);

  useEffect(() => { setWorkInput(workDuration); }, [workDuration]);
  useEffect(() => { setBreakInput(breakDuration); }, [breakDuration]);

  const apply = () => {
    const w = Number(workInput);
    const b = Number(breakInput);
    updateDurations(w, b);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '2rem auto', textAlign: 'center' }}>
      <h1>Pomodoro</h1>
      <fieldset style={{ border: '1px solid #ccc', padding: '0.75rem', marginBottom: '1rem' }} disabled={isRunning}>
        <legend style={{ fontSize: '0.9rem' }}>Durations (seconds)</legend>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
            Work
            <input type="number" min={1} value={workInput} onChange={e => setWorkInput(e.target.value)} style={{ width: 80, textAlign: 'center' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
            Break
            <input type="number" min={1} value={breakInput} onChange={e => setBreakInput(e.target.value)} style={{ width: 80, textAlign: 'center' }} />
          </label>
          <button type="button" onClick={apply} style={{ alignSelf: 'flex-end', height: 34 }}>Apply</button>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#555' }}>Changes disabled while timer running</div>
      </fieldset>
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
      <p style={{ marginTop: '1.0rem', fontSize: '0.7rem', color: '#555' }}>Current: Work {formatTime(workDuration)} • Break {formatTime(breakDuration)}</p>
      <div style={{ marginTop: '1rem', border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
        <strong>Progress</strong>
        {!progress && <div style={{ marginTop: 4 }}>Loading...</div>}
        {progress && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
            <li>Level: {progress.level}</li>
            <li>XP: {progress.xp}</li>
            <li>Work Sessions: {progress.work_sessions}</li>
            <li>Streak: {progress.current_streak} day(s)</li>
          </ul>
        )}
      </div>
    </div>
  );
}
