// canvas-bg.js — interactive dot matrix background

(function () {

  const DOT_SPACING  = 24;
  const DOT_RADIUS   = 1.5;
  const DOT_RADIUS_MAX = 2.2;
  const DOT_OPACITY  = 0.08;
  const DOT_OPACITY_MAX = 0.55;
  const CURSOR_RADIUS = 64;
  const LERP_SPEED   = 0.22;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile      = window.innerWidth < 768;

  if (isMobile) {
    document.body.classList.add('no-canvas');
    return;
  }

  // ── canvas setup ─────────────────────────────────────────────────────────

  const canvas = document.createElement('canvas');
  canvas.className = 'desktop-canvas';
  document.getElementById('desktop').appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // ── state ────────────────────────────────────────────────────────────────

  let dots   = [];
  let cursor = { x: -9999, y: -9999 };

  // ── dot grid ─────────────────────────────────────────────────────────────

  function buildGrid() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    dots = [];
    const cols = Math.ceil(canvas.width  / DOT_SPACING);
    const rows = Math.ceil(canvas.height / DOT_SPACING);

    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        dots.push({
          x:    c * DOT_SPACING,
          y:    r * DOT_SPACING,
          glow: 0,
        });
      }
    }
  }

  // ── render loop ──────────────────────────────────────────────────────────

  function draw(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dots
    const color = '110,232,158';

    for (let i = 0; i < dots.length; i++) {
      const d    = dots[i];
      const dx   = d.x - cursor.x;
      const dy   = d.y - cursor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const target = reducedMotion ? 0 : Math.pow(Math.max(0, 1 - dist / CURSOR_RADIUS), 2.2);

      if (!reducedMotion) {
        d.glow += (target - d.glow) * LERP_SPEED;
      }

      const opacity = DOT_OPACITY + (DOT_OPACITY_MAX - DOT_OPACITY) * d.glow;
      const size    = (DOT_RADIUS  + (DOT_RADIUS_MAX  - DOT_RADIUS)  * d.glow) * 2;

      ctx.fillStyle = `rgba(${color},${opacity.toFixed(3)})`;
      ctx.fillRect(Math.round(d.x - size / 2), Math.round(d.y - size / 2), Math.round(size), Math.round(size));
    }

    if (!reducedMotion) {
      requestAnimationFrame(draw);
    }
  }

  // ── events ───────────────────────────────────────────────────────────────

  window.addEventListener('mousemove', (e) => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    cursor.x = -9999;
    cursor.y = -9999;
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildGrid, 150);
  });

  // ── init ─────────────────────────────────────────────────────────────────

  buildGrid();

  if (reducedMotion) {
    // Single static frame
    requestAnimationFrame(draw);
  } else {
    requestAnimationFrame(draw);
  }

})();
