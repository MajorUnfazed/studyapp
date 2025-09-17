import React, { useState, useEffect } from 'react';
import { usePomodoroTimer, formatTime } from './hooks/usePomodoroTimer.js';

export default function App() {
  const {
    mode, secondsLeft, isRunning, start, pause, reset, workDuration, breakDuration, longBreakDuration, cyclesBeforeLongBreak,
    updateDurations, progress, achievements, historySummary, heatmap, skip,
    autoStartNext, setAutoStartNext,
    notificationsEnabled, setNotificationsEnabled,
    dailyGoalMinutes, setDailyGoalMinutes,
    cycleCount,
  } = usePomodoroTimer();

  const [workInput, setWorkInput] = useState(workDuration);
  const [breakInput, setBreakInput] = useState(breakDuration);
  const [longBreakInput, setLongBreakInput] = useState(longBreakDuration);
  const [cyclesInput, setCyclesInput] = useState(cyclesBeforeLongBreak);
  const [goalInput, setGoalInput] = useState(dailyGoalMinutes);
  const [permission, setPermission] = useState((typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'default');

  useEffect(() => { setWorkInput(workDuration); }, [workDuration]);
  useEffect(() => { setBreakInput(breakDuration); }, [breakDuration]);
  useEffect(() => { setLongBreakInput(longBreakDuration); }, [longBreakDuration]);
  useEffect(() => { setCyclesInput(cyclesBeforeLongBreak); }, [cyclesBeforeLongBreak]);
  useEffect(() => { setGoalInput(dailyGoalMinutes); }, [dailyGoalMinutes]);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.isComposing)) return;
      if (e.code === 'Space') { e.preventDefault(); isRunning ? pause() : start(); }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); skip(); }
      else if (e.key.toLowerCase() === 'r') { e.preventDefault(); reset(); }
      else if (e.key.toLowerCase() === 'a') { e.preventDefault(); setAutoStartNext(!autoStartNext); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRunning, start, pause, reset, skip, autoStartNext, setAutoStartNext]);

  const apply = () => {
    const w = Number(workInput);
    const b = Number(breakInput);
    const lb = Number(longBreakInput);
    const c = Number(cyclesInput);
    updateDurations(w, b, lb, c);
  };

  const requestNotifications = async () => {
    try {
      if (!('Notification' in window)) return;
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p === 'granted') setNotificationsEnabled(true);
    } catch { /* ignore */ }
  };

  const todaySec = historySummary?.today_seconds || 0;
  const goalSec = Math.max(0, Number(goalInput) * 60);
  const goalPct = goalSec > 0 ? Math.min(100, Math.round((todaySec / goalSec) * 100)) : 0;

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 760, margin: '2rem auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h1>Pomodoro</h1>

      <fieldset style={{ border: '1px solid #ccc', padding: '0.75rem', margin: 0 }} disabled={isRunning}>
        <legend style={{ fontSize: '0.9rem' }}>Durations & Cycles</legend>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
            Work (s)
            <input type="number" min={1} value={workInput} onChange={e => setWorkInput(e.target.value)} style={{ width: 88, textAlign: 'center' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
            Break (s)
            <input type="number" min={1} value={breakInput} onChange={e => setBreakInput(e.target.value)} style={{ width: 88, textAlign: 'center' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
            Long Break (s)
            <input type="number" min={1} value={longBreakInput} onChange={e => setLongBreakInput(e.target.value)} style={{ width: 100, textAlign: 'center' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
            Cycles before long
            <input type="number" min={2} value={cyclesInput} onChange={e => setCyclesInput(e.target.value)} style={{ width: 120, textAlign: 'center' }} />
          </label>
          <button type="button" onClick={apply} style={{ alignSelf: 'flex-end', height: 34 }}>Apply</button>
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#555' }}>Changes disabled while timer running</div>
      </fieldset>

      <div>
        <div style={{ marginBottom: '0.5rem' }}>
          Mode: <strong>{mode === 'work' ? 'Work' : mode === 'break' ? 'Break' : 'Long Break'}</strong>
          {mode !== 'work' && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#666' }}>Cycle {cycleCount}/{cyclesBeforeLongBreak}</span>}
        </div>
        <div style={{ fontSize: '3rem', margin: '1rem 0', letterSpacing: '2px' }}>{formatTime(secondsLeft)}</div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          {!isRunning && (<button onClick={start}>Start</button>)}
          {isRunning && (<button onClick={pause}>Pause</button>)}
          <button onClick={reset}>Reset</button>
          <button onClick={skip} title="Skip current interval (no XP)">Skip</button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', marginLeft: 8 }}>
            <input type="checkbox" checked={autoStartNext} onChange={e => setAutoStartNext(e.target.checked)} />
            Auto-start next
          </label>
        </div>
        <p style={{ marginTop: '1.0rem', fontSize: '0.7rem', color: '#555' }}>Current: Work {formatTime(workDuration)} • Break {formatTime(breakDuration)} • Long {formatTime(longBreakDuration)} • Every {cyclesBeforeLongBreak} cycles</p>
      </div>

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
          <strong>Daily Goal</strong>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div title={`${goalPct}%`} style={{ flex: 1, height: 10, background: '#eee', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ width: `${goalPct}%`, height: '100%', background: goalPct >= 100 ? '#4caf50' : '#81c784' }} />
            </div>
            <div style={{ fontSize: '0.75rem', minWidth: 72, textAlign: 'right' }}>{formatTime(todaySec)} / {Math.max(0, Number(goalInput))}m</div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.75rem' }}>Goal (min)</label>
            <input type="number" min={0} value={goalInput} onChange={e => setGoalInput(e.target.value)} style={{ width: 90, textAlign: 'center' }} />
            <button type="button" onClick={() => setDailyGoalMinutes(Number(goalInput) || 0)}>Save</button>
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
          <strong>Notifications</strong>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={notificationsEnabled} onChange={e => setNotificationsEnabled(e.target.checked)} />
              Enable desktop notifications
            </label>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>Status: {('Notification' in window) ? permission : 'unsupported'}</span>
            {('Notification' in window) && permission !== 'granted' && (
              <button type="button" onClick={requestNotifications}>Allow</button>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#666' }}>
            {permission === 'denied' ? 'Notifications are blocked in your browser settings for this site.' : 'Shows alerts when a work/break ends.'}
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
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

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
          <strong>Achievements</strong>
          {!achievements.length && <div style={{ marginTop: 4 }}>Loading...</div>}
          {!!achievements.length && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {achievements.map(a => (
                <li key={a.code} style={{ opacity: a.earned ? 1 : 0.4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span>
                    <span style={{ fontWeight: 600 }}>{a.name}</span><br />
                    <span style={{ fontSize: '0.65rem' }}>{a.description}</span>
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 12, background: a.earned ? '#4caf50' : '#999', color: '#fff' }}>{a.earned ? 'Earned' : 'Locked'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
          <strong>Today & 7 Days</strong>
          {!historySummary && <div style={{ marginTop: 4 }}>Loading...</div>}
          {historySummary && (
            <div style={{ marginTop: 4 }}>
              <div>Today Focus: {formatTime(historySummary.today_seconds)}</div>
              <div style={{ marginTop: 6, fontSize: '0.65rem' }}>Last 7 Days (day: mm:ss)</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', fontSize: '0.65rem' }}>
                {historySummary.last7_days.map(d => (
                  <li key={d.day}>{d.day.slice(5)}: {formatTime(d.total)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
          <strong>Recent Sessions</strong>
          {!historySummary && <div style={{ marginTop: 4 }}>Loading...</div>}
          {historySummary && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', fontSize: '0.65rem', maxHeight: 160, overflowY: 'auto' }}>
              {historySummary.recent_sessions.map((s, i) => (
                <li key={i}>{s.started_at.slice(5,16)} → {formatTime(s.duration_seconds)}</li>
              ))}
              {!historySummary.recent_sessions.length && <li>No sessions yet</li>}
            </ul>
          )}
        </div>

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
          <strong>Heatmap (last 120 days)</strong>
          {!heatmap && <div style={{ marginTop: 4 }}>Loading...</div>}
          {heatmap && (
            <HeatmapGrid data={heatmap} />
          )}
        </div>
      </div>
    </div>
  );
}

function HeatmapGrid({ data }) {
  // Build a map for quick lookup
  const totals = new Map(data.data.map(d => [d.day, d.total]));
  const start = new Date(data.start);
  const end = new Date(data.end);
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().slice(0,10);
    days.push({ day: dayStr, total: totals.get(dayStr) || 0 });
  }
  const weeks = [];
  let week = [];
  // Align to week starting Monday
  const startDay = (start.getDay() + 6) % 7; // 0=Mon
  for (let i = 0; i < startDay; i++) week.push(null);
  for (const entry of days) {
    week.push(entry);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const colorFor = (sec) => {
    if (sec <= 0) return '#eee';
    if (sec < 300) return '#c8e6c9';       // <5m
    if (sec < 1200) return '#81c784';     // <20m
    if (sec < 3600) return '#4caf50';     // <60m
    return '#2e7d32';                     // >=60m
  };

  return (
    <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'min-content', gap: 2 }}>
      {weeks.map((w, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 10px)', gap: 2 }}>
          {w.map((cell, ci) => (
            <div key={ci} title={cell ? `${cell.day} • ${formatTime(cell.total)}` : ''} style={{ width: 10, height: 10, background: cell ? colorFor(cell.total) : 'transparent', borderRadius: 2 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
