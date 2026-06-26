// boot.js — module 2: boot sequence
// Runs on first visit. Returns a Promise that resolves when the desktop
// should appear. Skips automatically on return visits (localStorage flag).

(function () {

  const LINES = [
    '> INITIALISING...',
    '> MOUNTING DRIVES...',
    '> WAKE UP LOSER. WE\'RE GOING TO AUDIO WARFARE STUDIO.'
  ];

  const CHAR_DELAY  = 38;   // ms per character
  const LINE_PAUSE  = 120;  // ms pause after each line finishes
  const SKIP_DELAY  = 1000; // ms before skip button appears
  const CURSOR      = '█';

  const NOISE_CHARS = ['█','▓','▒','░','▪','·','+','×','⌗','⌀','#','@'];
  const LOCK_CHAR   = '☢';
  const NOISE_MS    = 40;   // ms per frame during resolve
  const RESOLVE_MS  = 1600; // total time before locking on ☢

  function runGlyphResolver(el) {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += NOISE_MS;
      if (elapsed >= RESOLVE_MS) {
        clearInterval(interval);
        el.textContent = LOCK_CHAR;
      } else {
        // bias toward ☢ in the final quarter
        const bias = elapsed / RESOLVE_MS;
        el.textContent = Math.random() < bias * 0.6
          ? LOCK_CHAR
          : NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
      }
    }, NOISE_MS);
    return interval;
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function typeText(el, text) {
    return new Promise(async resolve => {
      for (let i = 0; i < text.length; i++) {
        el.textContent = text.slice(0, i + 1) + CURSOR;
        await delay(CHAR_DELAY);
      }
      // Hold cursor for a beat, then remove it
      await delay(LINE_PAUSE);
      el.textContent = text;
      resolve();
    });
  }

  // ── main export ────────────────────────────────────────────────────────

  window.AudioWarfareBoot = {

    // Returns true if we should skip the boot sequence
    shouldSkip() {
      return localStorage.getItem('aw_booted') === '1';
    },

    // Run the full boot sequence.
    // Calls onComplete() when the desktop should be shown.
    async run({ bootEl, skipBtn, onComplete }) {
      const linesContainer = bootEl.querySelector('#boot-lines');

      // Glyph resolver — ☢ assembles from noise behind the text
      const glyphEl = document.createElement('div');
      glyphEl.className = 'boot-glyph';
      bootEl.appendChild(glyphEl);
      const glyphInterval = runGlyphResolver(glyphEl);

      // Show skip button after SKIP_DELAY
      const skipTimer = setTimeout(() => {
        skipBtn.hidden = false;
      }, SKIP_DELAY);

      let skipped = false;

      const skipHandler = () => {
        skipped = true;
        finish();
      };

      skipBtn.addEventListener('click', skipHandler);

      // Also allow any key to skip once the button is visible
      const keyHandler = (e) => {
        if (!skipBtn.hidden) {
          skipped = true;
          finish();
        }
      };
      document.addEventListener('keydown', keyHandler, { once: true });

      // Type each line in sequence
      for (let i = 0; i < LINES.length; i++) {
        if (skipped) break;

        const line = document.createElement('div');
        line.className = 'boot-line';
        linesContainer.appendChild(line);

        // Scroll into view inside the container
        line.scrollIntoView({ block: 'nearest' });

        await typeText(line, LINES[i]);

        if (skipped) break;
      }

      // Wait a moment on last line before fading out
      if (!skipped) await delay(600);

      finish();

      function finish() {
        if (finish.called) return;
        finish.called = true;

        clearTimeout(skipTimer);
        clearInterval(glyphInterval);
        skipBtn.removeEventListener('click', skipHandler);
        document.removeEventListener('keydown', keyHandler);

        localStorage.setItem('aw_booted', '1');
        onComplete();
      }
    }
  };

})();
