// webgl-bg.js — custom WebGL CRT / surveillance-monitor background
// Full-viewport fragment shader: barrel distortion, slow liquid warp,
// scanlines, faint chromatic aberration, mint-green tint over black.
//
// Mobile (<768px): WebGL disabled, CSS scanline fallback (.no-canvas).
// prefers-reduced-motion: renders a single static frame, no animation.

(function () {

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile      = window.innerWidth < 768;

  if (isMobile) {
    document.body.classList.add('no-canvas');
    return;
  }

  const host = document.querySelector('.desktop-bg');
  if (!host) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'desktop-canvas';
  host.insertBefore(canvas, host.firstChild);

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    // No WebGL — fall back to the CSS scanline pattern
    document.body.classList.add('no-canvas');
    canvas.remove();
    return;
  }

  // ── shaders ────────────────────────────────────────────────────────────

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision mediump float;

    uniform vec2  uRes;
    uniform float uTime;

    // hash / value-noise helpers
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) {
        v += amp * noise(p);
        p *= 2.0;
        amp *= 0.5;
      }
      return v;
    }

    // barrel distortion — edges curve very slightly inward
    vec2 barrel(vec2 uv, float amt) {
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      uv += cc * r2 * amt;
      return uv;
    }

    // sample the mint signal field at a given uv
    float field(vec2 uv, float t) {
      // slow liquid warp — layered, low amplitude
      vec2 warp;
      warp.x = fbm(uv * 3.0 + vec2(t * 0.03, 0.0));
      warp.y = fbm(uv * 3.0 + vec2(0.0, t * 0.025));
      vec2 wuv = uv + (warp - 0.5) * 0.06;

      float base = fbm(wuv * 4.0 + t * 0.02);
      // faint horizontal drift, like a slow signal roll
      base += 0.15 * fbm(wuv * vec2(2.0, 8.0) - vec2(0.0, t * 0.04));
      return base;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;

      // barrel distort the sampling coords
      vec2 buv = barrel(uv, 0.12);

      // if barrel pushes us off-screen, clamp to black edges
      float edge = step(0.0, buv.x) * step(buv.x, 1.0) *
                   step(0.0, buv.y) * step(buv.y, 1.0);

      float t = uTime;

      // chromatic aberration — tiny per-channel offset radiating from centre
      vec2 dir = buv - 0.5;
      float ca = 0.0018;
      float r = field(buv + dir * ca, t);
      float g = field(buv,            t);
      float b = field(buv - dir * ca, t);

      // mint green tint (#6ee89e) modulated by the signal field
      vec3 mint = vec3(0.431, 0.910, 0.620);
      vec3 col = vec3(r, g, b);
      col = mint * col;

      // keep it dark — this sits behind UI
      col *= 0.14;
      col += mint * 0.008; // faint ambient glow floor

      // scanlines — thin horizontal lines ~8%
      float scan = 0.92 + 0.08 * sin(gl_FragCoord.y * 3.14159);
      col *= scan;

      // vignette — deepen the CRT corners
      float vig = smoothstep(1.1, 0.3, length(uv - 0.5));
      col *= vig;

      col *= edge;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ── compile ────────────────────────────────────────────────────────────

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('shader compile error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { document.body.classList.add('no-canvas'); canvas.remove(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // fullscreen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1,
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes  = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');

  // ── sizing ─────────────────────────────────────────────────────────────

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(host.clientWidth  * dpr);
    const h = Math.floor(host.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();

  // ── render ─────────────────────────────────────────────────────────────

  const start = performance.now();

  function draw() {
    const t = (performance.now() - start) / 1000;
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!reducedMotion) requestAnimationFrame(draw);
  }

  if (reducedMotion) {
    gl.uniform1f(uTime, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  } else {
    requestAnimationFrame(draw);
  }

})();
