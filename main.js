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

      // Auto-open windows after desktop appears
      setTimeout(() => {
        if (window.AudioWarfareWindows) {
          if (isMobile) {
            ['records', 'about', 'services', 'contact'].forEach(id => AudioWarfareWindows.openWindow(id));
          } else {
            AudioWarfareWindows.openWindow('records');
          }
        }
      }, 2000);

    }, { once: true });
  }

  // ── mobile: open all windows after desktop appears ───────────────────
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    // First window fades in immediately, rest on scroll
    document.querySelectorAll('.window').forEach((win, i) => {
      if (i === 0) {
        setTimeout(() => win.classList.add('in-view'), 2200);
      } else {
        observer.observe(win);
      }
    });
  }

  // ── contact form — Netlify AJAX submit ────────────────────────────────
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new URLSearchParams(new FormData(contactForm));
      try {
        await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: data.toString() });
        contactForm.innerHTML = '<p class="contact-success">Message received. We\'ll be in touch.</p>';
      } catch {
        contactForm.innerHTML = '<p class="contact-success">Something went wrong. Email us directly at audiowarfarestudio@gmail.com</p>';
      }
    });
  }

  // ── services → contact button ─────────────────────────────────────────
  const servicesCta = document.getElementById('services-contact-btn');
  if (servicesCta) {
    servicesCta.addEventListener('click', () => {
      AudioWarfareWindows.closeWindow('services');
      AudioWarfareWindows.openWindow('contact');
    });
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
        if (isMobile) {
          ['records', 'about', 'services', 'contact'].forEach(id => AudioWarfareWindows.openWindow(id));
        } else {
          AudioWarfareWindows.openWindow('records');
        }
      }
    }, 2000);
  }

});
