import React from 'react';
import { Link } from 'react-router-dom';
import { formatTime, usePomodoroTimer } from '../hooks/usePomodoroTimer.js';

export default function Profile() {
  const {
    notificationsEnabled, setNotificationsEnabled,
    dailyGoalMinutes, setDailyGoalMinutes,
    progress, achievements, historySummary, heatmap,
  } = usePomodoroTimer();

  const [goalInput, setGoalInput] = React.useState(dailyGoalMinutes);
  const [permission, setPermission] = React.useState((typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'default');

  React.useEffect(() => { setGoalInput(dailyGoalMinutes); }, [dailyGoalMinutes]);

  const requestNotifications = async () => {
    try {
      if (!('Notification' in window)) return;
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p === 'granted') setNotificationsEnabled(true);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ maxWidth: 900, margin: '1.5rem auto', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Profile</h2>
        <Link to="/" style={{ textDecoration: 'none' }}>← Back to Timer</Link>
      </div>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4 }}>
          <strong>Daily Goal</strong>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label>Goal (min)</label>
            <input type="number" min={0} value={goalInput} onChange={e => setGoalInput(e.target.value)} style={{ width: 100, textAlign: 'center' }} />
            <button type="button" onClick={() => setDailyGoalMinutes(Number(goalInput) || 0)}>Save</button>
          </div>
          <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#666' }}>
            Today: {historySummary ? formatTime(historySummary.today_seconds) : '—'}
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4 }}>
          <strong>Notifications</strong>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={notificationsEnabled} onChange={e => setNotificationsEnabled(e.target.checked)} />
              Enable desktop notifications
            </label>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>Status: {('Notification' in window) ? permission : 'unsupported'}</span>
            {('Notification' in window) && permission !== 'granted' && (
              <button type="button" onClick={requestNotifications}>Allow</button>
            )}
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4 }}>
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

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4 }}>
          <strong>Achievements</strong>
          {!achievements.length && <div style={{ marginTop: 4 }}>Loading...</div>}
          {!!achievements.length && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {achievements.map(a => (
                <li key={a.code} style={{ opacity: a.earned ? 1 : 0.4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span>
                    <span style={{ fontWeight: 600 }}>{a.name}</span><br />
                    <span style={{ fontSize: '0.8rem' }}>{a.description}</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 12, background: a.earned ? '#4caf50' : '#999', color: '#fff' }}>{a.earned ? 'Earned' : 'Locked'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ border: '1px solid #ddd', padding: '0.75rem', borderRadius: 4 }}>
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
  const startDay = (start.getDay() + 6) % 7; // Monday=0
  for (let i = 0; i < startDay; i++) week.push(null);
  for (const entry of days) { week.push(entry); if (week.length === 7) { weeks.push(week); week = []; } }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const colorFor = (sec) => {
    if (sec <= 0) return '#eee';
    if (sec < 300) return '#c8e6c9';
    if (sec < 1200) return '#81c784';
    if (sec < 3600) return '#4caf50';
    return '#2e7d32';
  };

  return (
    <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'min-content', gap: 2 }}>
      {weeks.map((w, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 10px)', gap: 2 }}>
          {w.map((cell, ci) => (
            <div key={ci} title={cell ? `${cell.day}` : ''} style={{ width: 10, height: 10, background: cell ? colorFor(cell.total) : 'transparent', borderRadius: 2 }} />
          ))}
        </div>
      ))}
    </div>
  );
}