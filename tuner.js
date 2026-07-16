// tuner.js — guitar tuner tool (EADGBE), Web Audio + autocorrelation pitch detection.
// Opens as a draggable window via the shared window machinery. Toggle button
// bottom-left mirrors the clock. Mic auto-stops whenever the window closes.

(function () {

  const STRINGS = [
    { note: 'E2', freq: 82.41 },
    { note: 'A2', freq: 110.00 },
    { note: 'D3', freq: 146.83 },
    { note: 'G3', freq: 196.00 },
    { note: 'B3', freq: 246.94 },
    { note: 'E4', freq: 329.63 },
  ];

  const FLAVOUR = {
    idle:   ['> WAITING FOR INPUT...'],
    off:    ['CRIKEY.', 'SHIT, SON.', 'WHAT IS THAT.', 'ARE YOU OKAY.'],
    close:  ['NEARLY.', 'KEEP GOING.', 'CLOSE ENOUGH FOR PUNK.'],
    intune: ['LE BOSH.', 'SORTED.', 'READY TO ROCK.'],
  };

  const BAR_SLOTS = 21;   // odd — centre slot is dead-on
  const BAR_CENTRE = 10;

  let audioCtx = null, analyser = null, source = null, stream = null;
  let rafId = null, buf = null;
  let active = false;

  let flavourState = 'idle';
  let flavourIdx = 0;
  let flavourTimer = null;

  let el = {};

  // ── pitch detection (autocorrelation) ─────────────────────────────────

  function autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.005) return -1;             // too quiet — no signal

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const trimmed = buf.slice(r1, r2);
    const n = trimmed.length;
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n - i; j++) c[i] += trimmed[j] * trimmed[j + i];
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < n; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }

    let T0 = maxpos;
    if (T0 <= 0 || T0 >= n - 1) return -1;

    // parabolic interpolation for sub-sample accuracy
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    const freq = sampleRate / T0;
    if (!isFinite(freq) || freq < 60 || freq > 400) return -1;  // outside guitar range
    return freq;
  }

  // ── note mapping ──────────────────────────────────────────────────────

  function nearestString(freq) {
    let best = STRINGS[0], bestCents = Infinity;
    for (const s of STRINGS) {
      const cents = Math.abs(1200 * Math.log2(freq / s.freq));
      if (cents < bestCents) { bestCents = cents; best = s; }
    }
    const signed = Math.round(1200 * Math.log2(freq / best.freq));
    return { note: best.note, cents: Math.max(-50, Math.min(50, signed)) };
  }

  function buildBar(cents) {
    // cents -50..+50 → slot 0..20
    const pos = Math.round(((cents + 50) / 100) * (BAR_SLOTS - 1));
    let out = '';
    for (let i = 0; i < BAR_SLOTS; i++) out += (i === pos) ? '|' : '-';
    return '[ ' + out + ' ]';
  }

  // ── flavour text ──────────────────────────────────────────────────────

  function setFlavourState(state) {
    if (state === flavourState) return;
    flavourState = state;
    flavourIdx = 0;
    renderFlavour();
  }

  function renderFlavour() {
    const list = FLAVOUR[flavourState];
    el.flavour.textContent = list[flavourIdx % list.length];
  }

  function startFlavourCycle() {
    stopFlavourCycle();
    flavourTimer = setInterval(() => {
      flavourIdx++;
      renderFlavour();
    }, 1600);
  }

  function stopFlavourCycle() {
    if (flavourTimer) { clearInterval(flavourTimer); flavourTimer = null; }
  }

  // ── render loop ───────────────────────────────────────────────────────

  function loop() {
    if (!active) return;
    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, audioCtx.sampleRate);

    if (freq === -1) {
      el.note.textContent = '—';
      el.note.classList.remove('is-intune');
      el.bar.textContent = '[ ----------|---------- ]';
      el.bar.classList.remove('is-intune');
      el.cents.textContent = '— cents';
      setFlavourState('idle');
    } else {
      const { note, cents } = nearestString(freq);
      const absC = Math.abs(cents);

      el.note.textContent = note;
      el.bar.textContent = buildBar(cents);
      el.cents.textContent = (cents > 0 ? '+' : '') + cents + ' cents';

      const inTune = absC < 5;
      el.note.classList.toggle('is-intune', inTune);
      el.bar.classList.toggle('is-intune', inTune);

      if (absC > 20)      setFlavourState('off');
      else if (absC >= 5) setFlavourState('close');
      else                setFlavourState('intune');
    }

    rafId = requestAnimationFrame(loop);
  }

  // ── activate / stop ───────────────────────────────────────────────────

  async function activate() {
    if (active) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: false, noiseSuppression: false, autoGainControl: false
      } });
    } catch (err) {
      el.idle.querySelector('.tuner-permnote').textContent =
        'Mic access denied. Check your browser permissions and try again.';
      return;
    }

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    buf = new Float32Array(analyser.fftSize);
    source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    active = true;
    el.idle.hidden = true;
    el.live.hidden = false;
    flavourState = 'idle';
    flavourIdx = 0;
    renderFlavour();
    startFlavourCycle();
    loop();
  }

  function stop() {
    active = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    stopFlavourCycle();
    if (source) { try { source.disconnect(); } catch (e) {} source = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    analyser = null; buf = null;

    if (el.live) el.live.hidden = true;
    if (el.idle) {
      el.idle.hidden = false;
      const note = el.idle.querySelector('.tuner-permnote');
      if (note) note.textContent = 'Your browser will ask for microphone access.';
    }
  }

  // ── init ──────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    const winEl = document.getElementById('window-tuner');
    if (!winEl) return;

    el = {
      idle:    document.getElementById('tuner-idle'),
      live:    document.getElementById('tuner-live'),
      note:    document.getElementById('tuner-note'),
      bar:     document.getElementById('tuner-bar'),
      cents:   document.getElementById('tuner-cents'),
      flavour: document.getElementById('tuner-flavour'),
    };

    const toggle = document.getElementById('tuner-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        if (winEl.classList.contains('is-open')) {
          AudioWarfareWindows.closeWindow('tuner');
        } else {
          AudioWarfareWindows.openWindow('tuner');
        }
      });
    }

    const activateBtn = document.getElementById('tuner-activate');
    if (activateBtn) activateBtn.addEventListener('click', activate);

    const stopBtn = document.getElementById('tuner-stop');
    if (stopBtn) stopBtn.addEventListener('click', stop);

    // Whenever the window closes (close button, toggle, anything) — kill the mic.
    const observer = new MutationObserver(() => {
      if (!winEl.classList.contains('is-open') && active) stop();
    });
    observer.observe(winEl, { attributes: true, attributeFilter: ['class'] });
  });

})();
