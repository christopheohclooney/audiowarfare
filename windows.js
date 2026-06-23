// windows.js — module 3: window management
// Drag with momentum, z-index stacking, open/close, taskbar indicators.

(function () {

  let topZ = 100;
  const TASKBAR_H = 48;
  const FRICTION  = 0.88;  // velocity multiplier per 16ms frame — lower = more skid
  const MIN_SPEED = 0.08;  // px/ms threshold below which momentum stops

  const POSITIONS = {
    records:  { x: 0.04, y: 0.07 },
    about:    { x: 0.56, y: 0.06 },
    services: { x: 0.18, y: 0.40 },
    contact:  { x: 0.64, y: 0.38 },
  };

  // ── utils ─────────────────────────────────────────────────────────

  function getWin(id) {
    return document.getElementById('window-' + id);
  }

  function getBtn(id) {
    return document.querySelector(`.taskbar-btn[data-open="${id}"]`);
  }

  function bringToFront(winEl) {
    winEl.style.zIndex = ++topZ;
  }

  function clampPos(winEl, left, top) {
    const desktop = document.getElementById('desktop');
    const maxX = desktop.offsetWidth  - winEl.offsetWidth;
    const maxY = desktop.offsetHeight - winEl.offsetHeight - TASKBAR_H;
    return {
      left: Math.max(0, Math.min(left, maxX)),
      top:  Math.max(0, Math.min(top,  maxY)),
    };
  }

  // ── momentum ────────────────────────────────────────────────────────

  function applyMomentum(winEl, vx, vy) {
    let left     = winEl.offsetLeft;
    let top      = winEl.offsetTop;
    let lastTime = performance.now();

    function frame(now) {
      const dt    = Math.min(now - lastTime, 64);
      lastTime    = now;
      const scale = Math.pow(FRICTION, dt / 16);
      vx *= scale;
      vy *= scale;

      left += vx * dt;
      top  += vy * dt;

      const clamped = clampPos(winEl, left, top);
      left = clamped.left;
      top  = clamped.top;

      winEl.style.left = left + 'px';
      winEl.style.top  = top  + 'px';

      if (Math.sqrt(vx * vx + vy * vy) > MIN_SPEED) {
        winEl._momentumRaf = requestAnimationFrame(frame);
      } else {
        winEl._momentumRaf = null;
      }
    }

    winEl._momentumRaf = requestAnimationFrame(frame);
  }

  // ── open / close ────────────────────────────────────────────────────

  function openWindow(id) {
    const winEl = getWin(id);
    const btn   = getBtn(id);
    if (!winEl) return;

    if (winEl.classList.contains('is-open')) {
      bringToFront(winEl);
      return;
    }

    if (!winEl.dataset.positioned) {
      const vw      = window.innerWidth;
      const vh      = window.innerHeight;
      const pos     = POSITIONS[id] || { x: 0.1, y: 0.1 };
      const clamped = clampPos(winEl, vw * pos.x, vh * pos.y);
      winEl.style.left = clamped.left + 'px';
      winEl.style.top  = clamped.top  + 'px';
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

    if (winEl._momentumRaf) {
      cancelAnimationFrame(winEl._momentumRaf);
      winEl._momentumRaf = null;
    }

    if (btn) btn.classList.remove('is-active');
    winEl.classList.add('is-closing');

    winEl.addEventListener('animationend', () => {
      winEl.classList.remove('is-open', 'is-closing');
    }, { once: true });
  }

  // ── drag ────────────────────────────────────────────────────────────

  function initDrag(winEl) {
    const titlebar = winEl.querySelector('.window-titlebar');
    if (!titlebar) return;

    let active = false;
    let startX, startY, startLeft, startTop;
    let prevX, prevY, prevTime;
    let velX = 0, velY = 0;

    titlebar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.window-close')) return;

      if (winEl._momentumRaf) {
        cancelAnimationFrame(winEl._momentumRaf);
        winEl._momentumRaf = null;
      }

      active    = true;
      velX      = 0;
      velY      = 0;
      prevX     = e.clientX;
      prevY     = e.clientY;
      prevTime  = performance.now();
      startX    = e.clientX;
      startY    = e.clientY;
      startLeft = winEl.offsetLeft;
      startTop  = winEl.offsetTop;

      titlebar.setPointerCapture(e.pointerId);
      bringToFront(winEl);
      e.preventDefault();
    });

    titlebar.addEventListener('pointermove', (e) => {
      if (!active) return;

      const now = performance.now();
      const dt  = now - prevTime;

      if (dt > 0) {
        velX = (e.clientX - prevX) / dt;
        velY = (e.clientY - prevY) / dt;
      }

      prevX    = e.clientX;
      prevY    = e.clientY;
      prevTime = now;

      const clamped = clampPos(
        winEl,
        startLeft + (e.clientX - startX),
        startTop  + (e.clientY - startY)
      );
      winEl.style.left = clamped.left + 'px';
      winEl.style.top  = clamped.top  + 'px';
    });

    titlebar.addEventListener('pointerup', () => {
      if (!active) return;
      active = false;
      if (Math.sqrt(velX * velX + velY * velY) > MIN_SPEED) {
        applyMomentum(winEl, velX, velY);
      }
    });

    titlebar.addEventListener('pointercancel', () => {
      active = false;
      velX   = 0;
      velY   = 0;
    });
  }

  // ── init ───────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.taskbar-btn[data-open]').forEach(btn => {
      btn.addEventListener('click', () => openWindow(btn.dataset.open));
    });

    document.querySelectorAll('.window-close[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeWindow(btn.dataset.close));
    });

    document.querySelectorAll('.window').forEach(winEl => {
      initDrag(winEl);
      winEl.addEventListener('pointerdown', () => {
        if (winEl._momentumRaf) {
          cancelAnimationFrame(winEl._momentumRaf);
          winEl._momentumRaf = null;
        }
        bringToFront(winEl);
      });
    });

  });

  window.AudioWarfareWindows = { openWindow, closeWindow };

})();
