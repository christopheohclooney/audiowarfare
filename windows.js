// windows.js — module 3: window management
// Drag, z-index stacking, open/close animations, taskbar indicators.

(function () {

  let topZ = 100;
  const TASKBAR_H = 48;

  // ── utils ──────────────────────────────────────────────────────────────

  function getWin(id) {
    return document.getElementById('window-' + id);
  }

  function getBtn(id) {
    return document.querySelector(`.taskbar-btn[data-open="${id}"]`);
  }

  function bringToFront(winEl) {
    winEl.style.zIndex = ++topZ;
  }

  // ── open / close ───────────────────────────────────────────────────────

  function openWindow(id) {
    const winEl = getWin(id);
    const btn   = getBtn(id);
    if (!winEl) return;

    // Already open — just raise it
    if (winEl.classList.contains('is-open')) {
      bringToFront(winEl);
      return;
    }

    // Set initial position once from data attributes
    if (!winEl.dataset.positioned) {
      const ox = parseInt(winEl.dataset.offsetX, 10) || 60;
      const oy = parseInt(winEl.dataset.offsetY, 10) || 60;
      winEl.style.left = ox + 'px';
      winEl.style.top  = oy + 'px';
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

  // ── drag ───────────────────────────────────────────────────────────────

  function initDrag(winEl) {
    const titlebar = winEl.querySelector('.window-titlebar');
    if (!titlebar) return;

    let active = false;
    let startX, startY, startLeft, startTop;

    titlebar.addEventListener('pointerdown', (e) => {
      // Don't intercept close button clicks
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

  // ── init ───────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {

    // Taskbar buttons → open windows
    document.querySelectorAll('.taskbar-btn[data-open]').forEach(btn => {
      btn.addEventListener('click', () => openWindow(btn.dataset.open));
    });

    // Close buttons → close windows
    document.querySelectorAll('.window-close[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeWindow(btn.dataset.close));
    });

    // Each window: drag + raise on click
    document.querySelectorAll('.window').forEach(winEl => {
      initDrag(winEl);
      winEl.addEventListener('pointerdown', () => bringToFront(winEl));
    });

  });

  // Public API — other modules can open/close windows programmatically
  window.AudioWarfareWindows = { openWindow, closeWindow };

})();
