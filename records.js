// records.js — Records window: grid + docked player

(function () {

  const RECORDS = [
    {
      id:      'splitknuckle-lies',
      band:    'Splitknuckle',
      release: 'Lies They Hide Behind',
      tag:     'Full band recording',
      spotify: 'https://open.spotify.com/embed/album/1BBROSjNjk45FtrWlJQfbZ?theme=0',
      image:   'assets/Splitknuckle - LTHB.jpg',
    },
    {
      id:      'lifeofone-demo1',
      band:    'Life Of One',
      release: 'Demo 1',
      tag:     'Full band recording',
      spotify: 'https://open.spotify.com/embed/album/6GPHk42674tvOtplOCR0xd?theme=0',
      image:   'assets/Life Of One - Demo 1.jpg',
    },
    {
      id:      'lifeofone-demo2',
      band:    'Life Of One',
      release: 'Demo 2',
      tag:     'Full band recording',
      spotify: 'https://open.spotify.com/embed/album/0oPDR2jVKHm20epfjaO3Ud?theme=0',
      image:   'assets/Life Of One - Demo 2.jpg',
    },
    {
      id:      'bigsmoke-nltm',
      band:    'Big Smoke',
      release: 'Nothing Left To Mourn',
      tag:     'Full band recording',
      spotify: 'https://open.spotify.com/embed/album/4xmeSlfYT1fnI4ANANGQMx?theme=0',
      image:   'assets/Big Smoke - Nothing Left To Mourn.jpg',
    },
  ];

  // ── vinyl SVG ────────────────────────────────────────────────────────────
  function vinylSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#111" stroke="#3a7a56" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#1e1e1e" stroke-width="5"/>
      <circle cx="50" cy="50" r="28" fill="none" stroke="#1e1e1e" stroke-width="5"/>
      <circle cx="50" cy="50" r="18" fill="none" stroke="#1e1e1e" stroke-width="5"/>
      <circle cx="50" cy="50" r="8"  fill="#0a0a0a" stroke="#6ee89e" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="3"  fill="#6ee89e"/>
    </svg>`;
  }

  // ── build card HTML ──────────────────────────────────────────────────────
  function thumbHTML(rec, size) {
    if (rec.image) {
      return `<img src="${rec.image}" class="record-card-img" width="${size}" height="${size}" alt="${rec.release} artwork">`;
    }
    return vinylSVG(size);
  }

  function buildCard(rec) {
    const card = document.createElement('button');
    card.className   = 'record-card';
    card.dataset.id  = rec.id;
    card.innerHTML   = `
      <div class="record-card-vinyl">${thumbHTML(rec, 72)}</div>
      <span class="record-card-band">${rec.band}</span>
      <span class="record-card-release">${rec.release}</span>
      <span class="record-card-tag">${rec.tag}</span>
    `;
    return card;
  }

  // ── player ───────────────────────────────────────────────────────────────
  let activeId = null;

  function selectRecord(rec, gridEl, playerEl) {
    // Deselect if clicking the same card
    if (activeId === rec.id) {
      deselect(gridEl, playerEl);
      return;
    }

    activeId = rec.id;

    // Mark active card
    gridEl.querySelectorAll('.record-card').forEach(c => c.classList.remove('is-active'));
    gridEl.querySelector(`[data-id="${rec.id}"]`).classList.add('is-active');

    // Populate player
    const metaEl  = playerEl.querySelector('.player-meta');
    const embedEl = playerEl.querySelector('.player-embed');
    const vinylEl = playerEl.querySelector('.player-vinyl');

    metaEl.innerHTML = `
      <span class="player-band">${rec.band}</span>
      <span class="player-release">${rec.release}</span>
      <span class="player-tag">${rec.tag}</span>
    `;

    embedEl.innerHTML = `<iframe
      src="${rec.spotify}"
      width="100%" height="100%"
      frameborder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy">
    </iframe>`;

    vinylEl.innerHTML = rec.image
      ? `<img src="${rec.image}" class="player-vinyl-img" alt="${rec.release} artwork">`
      : vinylSVG(80);
    vinylEl.classList.add('is-spinning');
    playerEl.classList.add('is-active');
  }

  function deselect(gridEl, playerEl) {
    activeId = null;
    gridEl.querySelectorAll('.record-card').forEach(c => c.classList.remove('is-active'));
    playerEl.querySelector('.player-meta').innerHTML  = '';
    playerEl.querySelector('.player-embed').innerHTML = '';
    playerEl.querySelector('.player-vinyl').classList.remove('is-spinning');
    playerEl.classList.remove('is-active');
  }

  // ── init ─────────────────────────────────────────────────────────────────
  function init() {
    const body = document.querySelector('#window-records .window-body');
    if (!body) return;

    // Grid
    const gridEl = document.createElement('div');
    gridEl.className = 'records-grid';
    RECORDS.forEach(rec => {
      const card = buildCard(rec);
      card.addEventListener('click', () => selectRecord(rec, gridEl, playerEl));
      gridEl.appendChild(card);
    });

    // Player
    const playerEl = document.createElement('div');
    playerEl.className = 'records-player';
    playerEl.innerHTML = `
      <div class="player-content">
        <div class="player-meta"></div>
        <div class="player-embed"></div>
      </div>
      <div class="player-vinyl">${vinylSVG(80)}</div>
    `;

    body.appendChild(gridEl);
    body.appendChild(playerEl);

    // Stop playback when the Records window is closed
    const winEl = document.getElementById('window-records');
    const observer = new MutationObserver(() => {
      if (!winEl.classList.contains('is-open') && !winEl.classList.contains('is-closing')) {
        deselect(gridEl, playerEl);
      }
    });
    observer.observe(winEl, { attributes: true, attributeFilter: ['class'] });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
