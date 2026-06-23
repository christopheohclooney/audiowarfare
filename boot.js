// boot.js — module 2: boot sequence
// Runs on first visit. Returns a Promise that resolves when the desktop
// should appear. Skips automatically on return visits (localStorage flag).

(function () {

  const LINES = [
    'AUDIO WARFARE SYSTEMS v1.0',
    '> INITIALISING...',
    '> SCANNING HARDWARE...',
    '> LOADING KERNEL MODULES...',
    '> MOUNTING DRIVES...',
    '> ESTABLISHING SECURE CONNECTION...',
    '> ACCESSING AUDIO WARFARE STUDIO...',
    '> READY.'
  ];

  const CHAR_DELAY  = 38;   // ms per character
  const LINE_PAUSE  = 120;  // ms pause after each line finishes
  const SKIP_DELAY  = 1000; // ms before skip button appears
  const CURSOR      = '█';

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

  // ── main export ──────────────────────────────────────────────────────────

  window.AudioWarfareBoot = {

    // Returns true if we should skip the boot sequence
    shouldSkip() {
      return localStorage.getItem('aw_booted') === '1';
    },

    // Run the full boot sequence.
    // Calls onComplete() when the desktop should be shown.
    async run({ bootEl, skipBtn, onComplete }) {
      const linesContainer = bootEl.querySelector('#boot-lines');

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

      // Wait a moment on READY. before fading out
      if (!skipped) await delay(600);

      finish();

      function finish() {
        if (finish.called) return;
        finish.called = true;

        clearTimeout(skipTimer);
        skipBtn.removeEventListener('click', skipHandler);
        document.removeEventListener('keydown', keyHandler);

        localStorage.setItem('aw_booted', '1');
        onComplete();
      }
    }
  };

})();
