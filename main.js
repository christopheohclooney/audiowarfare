// main.js — orchestration
// Temporary: show desktop directly so module 1 shell is visible without boot sequence

document.addEventListener('DOMContentLoaded', () => {
  const boot    = document.getElementById('boot-screen');
  const desktop = document.getElementById('desktop');

  // Skip boot for now — show desktop immediately
  if (boot)    boot.classList.add('is-hidden');
  if (desktop) desktop.classList.remove('is-hidden');

  // Clock
  const clock = document.getElementById('taskbar-clock');
  if (clock) {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      clock.textContent = `${h}:${m}:${s}`;
    };
    tick();
    setInterval(tick, 1000);
  }
});
