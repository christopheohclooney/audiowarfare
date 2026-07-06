// webgl-bg.js — WebGL CRT / surveillance-monitor background
// Studio-still photo, night-vision mint treatment, barrel distortion,
// slow liquid warp, scanlines, faint chromatic aberration, and
// cursor-driven vapour trails that warp + glow over the image.
//
// Mobile (<768px): WebGL disabled, CSS scanline fallback (.no-canvas).
// prefers-reduced-motion: single static frame, no animation, no trails.

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
    document.body.classList.add('no-canvas');
    canvas.remove();
    return;
  }

  const MAX_TRAIL = 24;

  // ── shaders ────────────────────────────────────────────────────────────

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision mediump float;

    uniform vec2      uRes;
    uniform vec2      uImgRes;
    uniform float     uTime;
    uniform sampler2D uTex;
    uniform int       uTrailCount;
    uniform vec2      uTrail[${MAX_TRAIL}];
    uniform float     uTrailLife[${MAX_TRAIL}];

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i), b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // barrel distortion — edges curve very slightly inward
    vec2 barrel(vec2 uv, float amt) {
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      return uv + cc * r2 * amt;
    }

    // background-size: cover mapping
    vec2 coverUV(vec2 uv, vec2 res, vec2 img) {
      float ra = res.x / res.y;
      float ia = img.x / img.y;
      vec2 s = ra > ia ? vec2(1.0, ia / ra) : vec2(ra / ia, 1.0);
      return (uv - 0.5) * s + 0.5;
    }

    void main() {
      vec2 uv  = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;

      // slow liquid warp — very low amplitude
      vec2 w;
      w.x = noise(uv * 3.0 + vec2(uTime * 0.03, 0.0));
      w.y = noise(uv * 3.0 + vec2(0.0, uTime * 0.025));
      vec2 liquid = (w - 0.5) * 0.010;

      // cursor vapour trails — accumulate warp + glow
      vec2 trailWarp = vec2(0.0);
      float trailGlow = 0.0;
      for (int i = 0; i < ${MAX_TRAIL}; i++) {
        if (i >= uTrailCount) break;
        vec2 d = uv - uTrail[i];
        d.x *= aspect;                       // aspect-correct the falloff
        float dist = length(d);
        float life = uTrailLife[i];
        float g = exp(-dist * dist / 0.010) * life;
        trailGlow += g;
        // heat-haze push, jittered by noise for a vapour feel
        float n = noise(uv * 8.0 + uTime * 0.6 + float(i));
        trailWarp += normalize(d + 0.0001) * g * 0.008 * (0.5 + n);
      }
      trailGlow = min(trailGlow, 1.2);

      // barrel + all displacements, then cover-map into the photo
      vec2 buv = barrel(uv, 0.12) + liquid + trailWarp;
      float edge = step(0.0, buv.x) * step(buv.x, 1.0) *
                   step(0.0, buv.y) * step(buv.y, 1.0);
      vec2 cuv = coverUV(buv, uRes, uImgRes);

      // chromatic aberration — tiny per-channel radial offset
      vec2 dir = buv - 0.5;
      float ca = 0.0022;
      float r = texture2D(uTex, coverUV(buv + dir * ca, uRes, uImgRes)).r;
      float g = texture2D(uTex, cuv).g;
      float b = texture2D(uTex, coverUV(buv - dir * ca, uRes, uImgRes)).b;
      vec3 tex = vec3(r, g, b);

      // night-vision: luminance driven mint tint (#6ee89e)
      vec3 mint = vec3(0.431, 0.910, 0.620);
      float lum = dot(tex, vec3(0.299, 0.587, 0.114));
      vec3 col = mint * lum * 1.15;
      col += mint * 0.02;                    // faint ambient floor

      // vapour trails brighten the surface as they pass
      col += mint * trailGlow * 0.35;

      // scanlines ~8%
      float scan = 0.92 + 0.08 * sin(gl_FragCoord.y * 3.14159);
      col *= scan;

      // vignette — CRT corners
      float vig = smoothstep(1.15, 0.35, length(uv - 0.5));
      col *= vig;

      col *= edge;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ── compile / link ─────────────────────────────────────────────────────

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

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1,
  ]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes        = gl.getUniformLocation(prog, 'uRes');
  const uImgRes     = gl.getUniformLocation(prog, 'uImgRes');
  const uTime       = gl.getUniformLocation(prog, 'uTime');
  const uTex        = gl.getUniformLocation(prog, 'uTex');
  const uTrailCount = gl.getUniformLocation(prog, 'uTrailCount');
  const uTrail      = gl.getUniformLocation(prog, 'uTrail');
  const uTrailLife  = gl.getUniformLocation(prog, 'uTrailLife');

  // ── texture (start with 1×1 black, swap in the photo on load) ───────────

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(uTex, 0);
  gl.uniform2f(uImgRes, 1, 1);

  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.uniform2f(uImgRes, img.naturalWidth, img.naturalHeight);
  };
  img.src = 'assets/Studio%20Still.jpg';

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

  // ── cursor vapour trail ────────────────────────────────────────────────

  const trail = [];           // { x, y, life } in uv space (y flipped for GL)
  const TRAIL_DECAY = 0.9;    // life lost per second
  const MIN_STEP    = 0.012;  // uv distance before dropping a new point

  if (!reducedMotion) {
    window.addEventListener('mousemove', (e) => {
      const x = e.clientX / window.innerWidth;
      const y = 1.0 - e.clientY / window.innerHeight;
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > MIN_STEP) {
        trail.push({ x, y, life: 1.0 });
        if (trail.length > MAX_TRAIL) trail.shift();
      }
    });
  }

  const posBuf  = new Float32Array(MAX_TRAIL * 2);
  const lifeBuf = new Float32Array(MAX_TRAIL);

  function uploadTrail(dt) {
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= TRAIL_DECAY * dt;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
    const n = trail.length;
    for (let i = 0; i < n; i++) {
      posBuf[i * 2]     = trail[i].x;
      posBuf[i * 2 + 1] = trail[i].y;
      lifeBuf[i]        = trail[i].life;
    }
    gl.uniform1i(uTrailCount, n);
    if (n > 0) {
      gl.uniform2fv(uTrail, posBuf.subarray(0, n * 2));
      gl.uniform1fv(uTrailLife, lifeBuf.subarray(0, n));
    }
  }

  // ── render ─────────────────────────────────────────────────────────────

  const start = performance.now();
  let prev = start;

  function frame() {
    const now = performance.now();
    const dt  = (now - prev) / 1000;
    prev = now;
    gl.uniform1f(uTime, (now - start) / 1000);
    uploadTrail(dt);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(frame);
  }

  if (reducedMotion) {
    gl.uniform1f(uTime, 0.0);
    gl.uniform1i(uTrailCount, 0);
    // draw once now, and again after the photo decodes
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    img.addEventListener('load', () => gl.drawArrays(gl.TRIANGLES, 0, 6));
  } else {
    requestAnimationFrame(frame);
  }

})();
