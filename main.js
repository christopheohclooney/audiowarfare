// main.js — orchestration: boot → desktop, clock, auto-open Records

document.addEventListener('DOMContentLoaded', () => {

  const bootEl   = document.getElementById('boot-screen');
  const desktop  = document.getElementById('desktop');
  const skipBtn  = document.getElementById('boot-skip');

  // ── clock ─────────────────────────────────────────────────────────────
  const clockEl = document.getElementById('taskbar-clock');
  function tickClock() {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2, '0');
    const m   = String(now.getMinutes()).padStart(2, '0');
    const s   = String(now.getSeconds()).padStart(2, '0');
    clockEl.textContent = `${h}:${m}:${s}`;
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ── show desktop ──────────────────────────────────────────────────────
  function showDesktop() {
    bootEl.classList.add('boot-fade-out');

    bootEl.addEventListener('animationend', () => {
      bootEl.classList.add('is-hidden');
      desktop.classList.add('desktop-fade-in');

      // Auto-open Records 2 seconds after the desktop appears
      setTimeout(() => {
        if (window.AudioWarfareWindows) {
          AudioWarfareWindows.openWindow('records');
        }
      }, 2000);

    }, { once: true });
  }

  // ── boot decision ──────────────────────────────────────────────────────
  if (window.AudioWarfareBoot && !window.AudioWarfareBoot.shouldSkip()) {
    AudioWarfareBoot.run({
      bootEl,
      skipBtn,
      onComplete: showDesktop
    });
  } else {
    // Return visitor — skip straight to desktop
    bootEl.classList.add('is-hidden');
    desktop.classList.add('desktop-fade-in');

    setTimeout(() => {
      if (window.AudioWarfareWindows) {
        AudioWarfareWindows.openWindow('records');
      }
    }, 2000);
  }

});
