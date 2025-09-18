import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { usePomodoroTimer, formatTime } from './hooks/usePomodoroTimer.js';
import Profile from './pages/Profile.jsx';

function TimerPage() {
  const {
    mode, secondsLeft, isRunning, start, pause, reset, workDuration, breakDuration, longBreakDuration, cyclesBeforeLongBreak,
  updateDurations, historySummary, skip,
    autoStartNext, setAutoStartNext,
    notificationsEnabled, setNotificationsEnabled,
  dailyGoalMinutes, setDailyGoalMinutes,
    cycleCount,
    distractionFree, setDistractionFree,
  } = usePomodoroTimer();

  const [workInput, setWorkInput] = useState(workDuration);
  const [breakInput, setBreakInput] = useState(breakDuration);
  const [longBreakInput, setLongBreakInput] = useState(longBreakDuration);
  const [cyclesInput, setCyclesInput] = useState(cyclesBeforeLongBreak);
  const [goalInput, setGoalInput] = useState(dailyGoalMinutes);
  const [permission, setPermission] = useState((typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'default');
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [backendOnline, setBackendOnline] = useState(true);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  useEffect(() => { setWorkInput(workDuration); }, [workDuration]);
  useEffect(() => { setBreakInput(breakDuration); }, [breakDuration]);
  useEffect(() => { setLongBreakInput(longBreakDuration); }, [longBreakDuration]);
  useEffect(() => { setCyclesInput(cyclesBeforeLongBreak); }, [cyclesBeforeLongBreak]);
  useEffect(() => { setGoalInput(dailyGoalMinutes); }, [dailyGoalMinutes]);
  useEffect(() => { if (typeof window !== 'undefined' && 'Notification' in window) setPermission(Notification.permission); }, []);

  // Title & favicon updates
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const origTitle = document.title;
    const favicon = document.querySelector("link[rel='icon']");
    const update = () => {
      document.title = isRunning ? `${formatTime(secondsLeft)} • Pomodoro` : 'Pomodoro';
      if (favicon) {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,64,64);
        ctx.fillStyle = isRunning ? '#4caf50' : '#999';
        ctx.beginPath(); ctx.arc(32,32,28,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.max(0, Math.floor(secondsLeft/60))), 32, 34);
        favicon.href = canvas.toDataURL('image/png');
      }
    };
    update();
    return () => { document.title = origTitle; };
  }, [isRunning, secondsLeft]);

  // Online/offline banner
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Backend health polling
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 800);
        const res = await fetch('http://localhost:4000/api/health', { signal: ctrl.signal });
        clearTimeout(timer);
        if (!cancelled) setBackendOnline(!!res.ok);
      } catch {
        if (!cancelled) setBackendOnline(false);
      }
    };
    check();
    const id = setInterval(check, 5000);
    const onFocus = () => check();
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.isComposing)) return;
      if (e.code === 'Space') { e.preventDefault(); isRunning ? pause() : start(); }
      else if (e.key.toLowerCase() === 's') { e.preventDefault(); skip(); }
      else if (e.key.toLowerCase() === 'r') { e.preventDefault(); reset(); }
      else if (e.key.toLowerCase() === 'a') { e.preventDefault(); setAutoStartNext(!autoStartNext); }
      else if (e.key.toLowerCase() === 'd') { e.preventDefault(); setDistractionFree(!distractionFree); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRunning, start, pause, reset, skip, autoStartNext, setAutoStartNext, distractionFree, setDistractionFree]);

  const apply = () => {
    const w = Number(workInput);
    const b = Number(breakInput);
    const lb = Number(longBreakInput);
    const c = Number(cyclesInput);
    updateDurations(w, b, lb, c);
    pushToast('Settings saved');
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

  const pushToast = (msg, type = 'info', ttl = 2500) => {
    const id = ++toastIdRef.current;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ttl);
  };

  const presets = [
    { label: '25/5', w: 25*60, b: 5*60, lb: 15*60, c: 4 },
    { label: '50/10', w: 50*60, b: 10*60, lb: 20*60, c: 4 },
    { label: '90/15', w: 90*60, b: 15*60, lb: 30*60, c: 3 },
  ];

  const usePreset = (p) => {
    updateDurations(p.w, p.b, p.lb, p.c);
    pushToast(`Preset applied: ${p.label}`);
  };

  // Lock page scroll and margins in distraction-free to avoid scrollbars (e.g., F11 fullscreen)
  useEffect(() => {
    if (!distractionFree) return;
    const body = document.body;
    const html = document.documentElement;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyMargin: body.style.margin,
      bodyHeight: body.style.height,
      htmlOverflow: html.style.overflow,
    };
    body.style.overflow = 'hidden';
    body.style.margin = '0';
    body.style.height = '100vh';
    html.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev.bodyOverflow;
      body.style.margin = prev.bodyMargin;
      body.style.height = prev.bodyHeight;
      html.style.overflow = prev.htmlOverflow;
    };
  }, [distractionFree]);

  // Distraction-free: show only the big timer, nothing else
  if (distractionFree) {
    return (
      <div style={{ fontFamily: 'sans-serif', position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => setDistractionFree(false)}
          title="Unhide"
          style={{ position: 'fixed', top: 12, right: 12, background: '#fff', border: '1px solid #ccc', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
        >Unhide</button>
        <div style={{ fontSize: '6rem', letterSpacing: '2px', userSelect: 'none' }}>{formatTime(secondsLeft)}</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 820, margin: '2rem auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {(!online || !backendOnline) && (
        <div style={{ background: '#ffecb3', color: '#7a5d00', padding: '6px 10px', border: '1px solid #ffd54f', borderRadius: 4 }}>
          {!online ? (
            <>You are offline. Changes will be saved locally and synced when back online.</>
          ) : (
            <>Backend is unreachable (http://localhost:4000). Stats, history, and achievements won’t sync until it’s back. The timer still works.</>
          )}
        </div>
      )}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Pomodoro</h1>
        <nav style={{ display: 'flex', gap: 10 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>Timer</Link>
          <Link to="/profile" style={{ textDecoration: 'none' }}>Profile</Link>
        </nav>
      </header>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button key={p.label} onClick={() => usePreset(p)}>{p.label}</button>
        ))}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8, fontSize: '0.85rem' }}>
          <input type="checkbox" checked={distractionFree} onChange={e => setDistractionFree(e.target.checked)} />
          Distraction-free
        </label>
      </div>

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

  {/* Secondary panels moved to Profile page */}

      {/* Toasts */}
      <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: '#333', color: '#fff', padding: '8px 12px', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontSize: '0.85rem' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TimerPage />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

function DailyGoalCard({ todaySec, goalInput, setGoalInput, setDailyGoalMinutes, goalPct }) {
  return (
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
  );
}

function NotificationsCard({ notificationsEnabled, setNotificationsEnabled, permission, requestNotifications }) {
  return (
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
  );
}

function ProgressCard({ progress }) {
  return (
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
  );
}

function AchievementsCard({ achievements }) {
  return (
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
  );
}

function HistoryCard({ historySummary }) {
  return (
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
  );
}

function HeatmapCard({ heatmap }) {
  return (
    <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4, fontSize: '0.75rem', textAlign: 'left' }}>
      <strong>Heatmap (last 120 days)</strong>
      {!heatmap && <div style={{ marginTop: 4 }}>Loading...</div>}
      {heatmap && (
        <HeatmapGrid data={heatmap} />
      )}
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
