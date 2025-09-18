/*
  Drift-resistant timer worker.
  - Receives { type: 'start', endTime } to schedule ticks every 500ms
  - Sends { type: 'tick', remaining } back
  - Receives { type: 'pause' } to stop
  - Receives { type: 'resync', endTime } to resync endTime
*/
let intervalId = null;
let endTime = null;

function clearTimer() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

self.onmessage = (e) => {
  const msg = e.data || {};
  if (msg.type === 'start') {
    endTime = msg.endTime || null;
    clearTimer();
    if (!endTime) return;
    // Send an immediate tick for responsiveness
    {
      const remainingNow = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      self.postMessage({ type: 'tick', remaining: remainingNow });
      if (remainingNow <= 0) {
        clearTimer(); endTime = null; self.postMessage({ type: 'done' });
        return;
      }
    }
    intervalId = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      self.postMessage({ type: 'tick', remaining });
      if (remaining <= 0) {
        clearTimer();
        endTime = null;
        self.postMessage({ type: 'done' });
      }
    }, 500);
  } else if (msg.type === 'pause') {
    clearTimer();
  } else if (msg.type === 'resync') {
    endTime = msg.endTime || null;
    if (intervalId) {
      // keep running with new endTime
    }
  } else if (msg.type === 'stop') {
    clearTimer();
    endTime = null;
  }
};
