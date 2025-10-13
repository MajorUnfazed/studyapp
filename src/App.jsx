import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle.jsx';
import TaskList from './components/TaskList.jsx';
import { usePomodoroTimer, formatTime } from './hooks/usePomodoroTimer.js';
import Profile from './pages/Profile.jsx';

function TimerPage() {
  const {
    mode, secondsLeft, isRunning, start, pause, reset, workDuration, breakDuration, longBreakDuration, cyclesBeforeLongBreak,
  updateDurations, historySummary, skip, selectMode,
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
    <div className="min-h-screen bg-base-100 text-base-content">
      {/* Top bar */}
      <div className="navbar bg-base-100 border-b">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">Pomodoro</a>
        </div>
        <div className="flex-none gap-2">
          <ul className="menu menu-horizontal px-1">
            <li><Link to="/">Timer</Link></li>
            <li><Link to="/profile">Profile</Link></li>
          </ul>
          <ThemeToggle />
        </div>
      </div>

      {/* Banners */}
      {(!online || !backendOnline) && (
        <div className="alert alert-warning rounded-none">
          <span>
            {!online
              ? 'You are offline. Changes will be saved locally and synced when back online.'
              : 'Backend is unreachable (http://localhost:4000). Stats, history, and achievements won’t sync until it’s back. The timer still works.'}
          </span>
        </div>
      )}

      <main className="container mx-auto p-4 max-w-4xl">
        {/* Hero timer */}
        <section className="rounded-2xl shadow-2xl overflow-hidden">
          <div className={`hero min-h-[360px] ${mode === 'work' ? 'bg-rose-600' : mode === 'break' ? 'bg-emerald-600' : 'bg-sky-700'} text-rose-50`}>
            <div className="hero-content text-center">
              <div className="w-full">
                {/* Mode tabs (read-only indication) */}
                <div className="tabs tabs-boxed inline-flex">
                  <button className={`tab ${mode === 'work' ? 'tab-active' : ''}`} onClick={() => selectMode('work')}>Pomodoro</button>
                  <button className={`tab ${mode === 'break' ? 'tab-active' : ''}`} onClick={() => selectMode('break')}>Short Break</button>
                  <button className={`tab ${mode === 'longBreak' ? 'tab-active' : ''}`} onClick={() => selectMode('longBreak')}>Long Break</button>
                </div>

                <div className="mt-4 text-[72px] md:text-[96px] font-extrabold tracking-wider leading-none drop-shadow-sm">
                  {formatTime(secondsLeft)}
                </div>
                <div className="mt-1 text-sm opacity-90">
                  {mode === 'work' ? 'Time to focus!' : mode === 'break' ? 'Take a short pause.' : 'Take a long pause.'}
                  {mode !== 'work' && (
                    <span className="ml-2 opacity-90">Cycle {cycleCount}/{cyclesBeforeLongBreak}</span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
                  {!isRunning ? (
                    <button onClick={start} className="btn bg-white text-rose-600 hover:bg-rose-50 border-0 shadow-lg px-8 text-lg">START</button>
                  ) : (
                    <button onClick={pause} className="btn bg-white text-rose-600 hover:bg-rose-50 border-0 shadow-lg px-8 text-lg">PAUSE</button>
                  )}
                  <button onClick={reset} className="btn btn-ghost normal-case">Reset</button>
                  <button onClick={skip} className="btn btn-ghost normal-case" title="Skip current interval (no XP)">Skip</button>
                </div>

                <div className="mt-3 inline-flex items-center text-sm opacity-90">
                  <input type="checkbox" className="checkbox checkbox-sm mr-2" checked={autoStartNext} onChange={e => setAutoStartNext(e.target.checked)} />
                  Auto-start next
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Presets & Settings */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {presets.map(p => (
                    <button key={p.label} className="btn btn-sm" onClick={() => usePreset(p)}>{p.label}</button>
                  ))}
                </div>
                <label className="label cursor-pointer text-sm">
                  <input type="checkbox" className="toggle mr-2" checked={distractionFree} onChange={e => setDistractionFree(e.target.checked)} />
                  Distraction-free
                </label>
              </div>
              <fieldset disabled={isRunning} className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <label className="form-control">
                  <span className="label-text">Work (s)</span>
                  <input type="number" min={1} value={workInput} onChange={e => setWorkInput(e.target.value)} className="input input-bordered" />
                </label>
                <label className="form-control">
                  <span className="label-text">Break (s)</span>
                  <input type="number" min={1} value={breakInput} onChange={e => setBreakInput(e.target.value)} className="input input-bordered" />
                </label>
                <label className="form-control">
                  <span className="label-text">Long (s)</span>
                  <input type="number" min={1} value={longBreakInput} onChange={e => setLongBreakInput(e.target.value)} className="input input-bordered" />
                </label>
                <label className="form-control">
                  <span className="label-text">Cycles</span>
                  <input type="number" min={2} value={cyclesInput} onChange={e => setCyclesInput(e.target.value)} className="input input-bordered" />
                </label>
                <div className="md:col-span-1">
                  <button type="button" onClick={apply} className="btn btn-primary w-full">Apply</button>
                </div>
              </fieldset>
              {isRunning && <div className="mt-1 text-sm opacity-70">Changes disabled while timer runs</div>}
              <div className="mt-2 text-sm opacity-70">Current: Work {formatTime(workDuration)} • Break {formatTime(breakDuration)} • Long {formatTime(longBreakDuration)} • Every {cyclesBeforeLongBreak} cycles</div>
            </div>
          </div>
        </div>

        {/* Tasks */}
  <SmartTaskList />

        {/* Toasts */}
        <div className="toast toast-end">
          {toasts.map(t => (
            <div key={t.id} className={`alert ${t.type === 'info' ? 'alert-info' : t.type === 'success' ? 'alert-success' : t.type === 'warning' ? 'alert-warning' : 'alert-error'}`}>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="footer footer-center p-4 bg-base-200 text-base-content mt-10">
        <aside>
          <p>© {new Date().getFullYear()} Pomodoro</p>
        </aside>
      </footer>
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

// Simple persistent task list (localStorage) to support adding tasks now
function SmartTaskList() {
  const [tasks, setTasks] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('tasks_v1') || '[]'); } catch { return []; }
  });
  const [text, setText] = React.useState('');
  React.useEffect(() => {
    try { localStorage.setItem('tasks_v1', JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setTasks(prev => [...prev, { id: Date.now(), text: t, completed: false }]);
    setText('');
  };
  const toggle = (id) => setTasks(prev => prev.map(x => x.id === id ? { ...x, completed: !x.completed } : x));
  const remove = (id) => setTasks(prev => prev.filter(x => x.id !== id));

  return (
    <div className="card bg-base-100 shadow mt-8">
      <div className="card-body">
        <h3 className="card-title">Task List</h3>
        <div className="join w-full">
          <input className="input input-bordered join-item w-full" placeholder="Add a new task" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          <button className="btn btn-primary join-item" onClick={add}>Add</button>
        </div>
        <ul className="mt-4 space-y-2">
          {tasks.map(t => (
            <li key={t.id} className="flex items-center gap-3">
              <input type="checkbox" className="checkbox" checked={t.completed} onChange={() => toggle(t.id)} />
              <span className={t.completed ? 'line-through opacity-60' : ''}>{t.text}</span>
              <button className="btn btn-ghost btn-xs ml-auto" onClick={() => remove(t.id)}>Remove</button>
            </li>
          ))}
          {!tasks.length && <li className="opacity-60 text-sm">No tasks yet. Add your first focus task.</li>}
        </ul>
      </div>
    </div>
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
