// windows.js — module 3: window management
// Drag, z-index stacking, open/close animations, taskbar indicators.

(function () {

  let topZ = 100;
  const TASKBAR_H = 48;

  // Default positions as viewport fractions — spreads windows across the screen.
  // Computed against actual viewport size when each window first opens.
  const POSITIONS = {
    records:  { x: 0.04, y: 0.07 },
    about:    { x: 0.56, y: 0.06 },
    services: { x: 0.18, y: 0.40 },
    contact:  { x: 0.64, y: 0.38 },
  };

  // ── utils ────────────────────────────────────────────────────────────

  function getWin(id) {
    return document.getElementById('window-' + id);
  }

  function getBtn(id) {
    return document.querySelector(`.taskbar-btn[data-open="${id}"]`);
  }

  function bringToFront(winEl) {
    winEl.style.zIndex = ++topZ;
  }

  // ── open / close ─────────────────────────────────────────────────────

  function openWindow(id) {
    const winEl = getWin(id);
    const btn   = getBtn(id);
    if (!winEl) return;

    // Already open — just raise it
    if (winEl.classList.contains('is-open')) {
      bringToFront(winEl);
      return;
    }

    // Set initial position once, using viewport-relative coordinates
    if (!winEl.dataset.positioned) {
      const vw   = window.innerWidth;
      const vh   = window.innerHeight;
      const pos  = POSITIONS[id] || { x: 0.1, y: 0.1 };

      const rawX = vw * pos.x;
      const rawY = vh * pos.y;

      // Clamp so window doesn't open off-screen
      const maxX = vw - winEl.offsetWidth  - 10;
      const maxY = vh - TASKBAR_H - 80;  // leave headroom at bottom

      winEl.style.left = Math.max(10, Math.min(rawX, maxX)) + 'px';
      winEl.style.top  = Math.max(10, Math.min(rawY, maxY)) + 'px';
      winEl.dataset.positioned = '1';
    }

    winEl.classList.remove('is-closing');
    winEl.classList.add('is-open');
    bringToFront(winEl);

    if (btn) btn.classList.add('is-active');
  }

  function closeWindow(id) {
    const winEl = getWin(id);
    const btn   = getBtn(id);
    if (!winEl || !winEl.classList.contains('is-open')) return;

    if (btn) btn.classList.remove('is-active');

    winEl.classList.add('is-closing');

    winEl.addEventListener('animationend', () => {
      winEl.classList.remove('is-open', 'is-closing');
    }, { once: true });
  }

  // ── drag ─────────────────────────────────────────────────────────────

  function initDrag(winEl) {
    const titlebar = winEl.querySelector('.window-titlebar');
    if (!titlebar) return;

    let active = false;
    let startX, startY, startLeft, startTop;

    titlebar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.window-close')) return;

      active = true;
      titlebar.setPointerCapture(e.pointerId);

      startX    = e.clientX;
      startY    = e.clientY;
      startLeft = winEl.offsetLeft;
      startTop  = winEl.offsetTop;

      bringToFront(winEl);
      e.preventDefault();
    });

    titlebar.addEventListener('pointermove', (e) => {
      if (!active) return;

      const desktop = document.getElementById('desktop');
      const maxX = desktop.offsetWidth  - winEl.offsetWidth;
      const maxY = desktop.offsetHeight - winEl.offsetHeight - TASKBAR_H;

      const newLeft = Math.max(0, Math.min(startLeft + (e.clientX - startX), maxX));
      const newTop  = Math.max(0, Math.min(startTop  + (e.clientY - startY), maxY));

      winEl.style.left = newLeft + 'px';
      winEl.style.top  = newTop  + 'px';
    });

    titlebar.addEventListener('pointerup',     () => { active = false; });
    titlebar.addEventListener('pointercancel', () => { active = false; });
  }

  // ── init ─────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.taskbar-btn[data-open]').forEach(btn => {
      btn.addEventListener('click', () => openWindow(btn.dataset.open));
    });

    document.querySelectorAll('.window-close[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeWindow(btn.dataset.close));
    });

    document.querySelectorAll('.window').forEach(winEl => {
      initDrag(winEl);
      winEl.addEventListener('pointerdown', () => bringToFront(winEl));
    });

  });

  // Public API
  window.AudioWarfareWindows = { openWindow, closeWindow };

})();
