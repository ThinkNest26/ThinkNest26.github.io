// ===== PLOT TWIST! section: reveal, rotating lines, mood picker, category surprise =====
(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LINES = ['Your comfort zone called. We told it you’re busy.', 'Less to-do. More ta-da!', 'Zero experience required. Curiosity highly recommended.', 'New skills. New friends. New stories.', 'Warning: you might discover a new obsession.'];
  const MOODS = {
    break: { teachers: ['wellbeing'], parents: ['selfcare', 'fitness'], line: 'Deep breath… here’s where to recharge:' },
    unstoppable: { teachers: ['career', 'venture', 'digital', 'confidence'], parents: ['career', 'money'], line: 'Big dreams? Start here:' },
    surprise: { teachers: ['creative', 'languages', 'digital', 'confidence'], parents: ['creative', 'cooking', 'family'], line: 'Ta-da! How about trying…', pickOne: true },
    people: { teachers: ['cafe'], parents: ['circles', 'family'], line: 'Your people are waiting:' }
  };
  const SURPRISES = ['Ooh, good choice! 🎉', 'Someday is today! ✨', 'Talent optional. Enthusiasm encouraged. 🙌', 'Let’s go! 🚀', 'Love that for you! 💛'];

  function init() {
    const sec = document.querySelector('.plot'); if (!sec) return;
    // gentle reveal when the section scrolls into view
    const items = sec.querySelectorAll('.pt-reveal');
    if (reduce || !('IntersectionObserver' in window)) items.forEach(el => el.classList.add('in'));
    else {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
      items.forEach(el => io.observe(el));
      setTimeout(() => items.forEach(el => el.classList.add('in')), 3000);
    }
    // rotating microcopy
    const rot = document.getElementById('plot-rotate'); let i = 0;
    if (rot && !reduce) setInterval(() => {
      rot.classList.add('out');
      setTimeout(() => { i = (i + 1) % LINES.length; rot.textContent = LINES[i]; rot.classList.remove('out'); }, 350);
    }, 4200);
    // mood picker
    const result = document.getElementById('mood-result');
    const tileName = (aud, key) => { const a = sec.querySelector(`[data-aud="${aud}"] [data-cat="${key}"]`); return a ? { name: a.querySelector('b').textContent, ic: a.querySelector('span').textContent, href: a.getAttribute('href') } : null; };
    sec.querySelectorAll('[data-mood]').forEach(btn => btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      sec.querySelectorAll('[data-mood]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      sec.querySelectorAll('.pc-tiles a').forEach(a => a.classList.remove('glow', 'dim'));
      if (!on) { result.hidden = true; return; }
      btn.setAttribute('aria-pressed', 'true');
      const m = MOODS[btn.dataset.mood];
      const pick = (arr) => m.pickOne ? [arr[Math.floor(Math.random() * arr.length)]] : arr;
      const t = pick(m.teachers), p = pick(m.parents);
      sec.querySelectorAll('.pc-tiles a').forEach(a => {
        const aud = a.closest('[data-aud]').dataset.aud, hit = (aud === 'teachers' ? t : p).includes(a.dataset.cat);
        a.classList.add(hit ? 'glow' : 'dim');
      });
      const link = (aud, k) => { const x = tileName(aud, k); return x ? `<a href="${x.href}">${x.ic} ${x.name}</a>` : ''; };
      result.innerHTML = `<p>${m.line}</p><div class="mood-links"><span class="mood-who">Teachers</span>${t.map(k => link('teachers', k)).join('')}<span class="mood-who">Parents</span>${p.map(k => link('parents', k)).join('')}</div>`;
      result.hidden = false;
    }));
    // a small surprise on category click, then off to the hub
    sec.querySelectorAll('.pc-tiles a').forEach(a => a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const pop = document.createElement('span');
      pop.className = 'pc-burst'; pop.textContent = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
      a.appendChild(pop); a.classList.add('picked');
      setTimeout(() => { location.href = a.getAttribute('href'); }, reduce ? 150 : 650);
    }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
