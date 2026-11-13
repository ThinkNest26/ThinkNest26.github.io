// ===== Think Nest: choose your character (avatar) from Settings, and show it on dashboards =====
// Needs characters.js (tnOpenBuilder, tnPaintAvatars) and app.js (db, say)
(function () {
  const page = location.pathname.split('/').pop() || 'index.html';
  const isSettings = /settings\.html$/.test(page);
  async function start() {
    const { data: { session } } = await db.auth.getSession(); if (!session) return;
    const uid = session.user.id;
    // settings: a "My character" panel at the top
    if (isSettings && !document.getElementById('av-panel')) {
      const main = document.querySelector('main'); if (!main) return;
      const h = main.querySelector('h1, .dash-h');
      const box = document.createElement('section');
      box.className = 'panel'; box.id = 'av-panel';
      box.style.cssText = 'display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 18px';
      box.innerHTML = `<span class="initials big" id="av-preview" data-av="${uid}" style="width:64px;height:64px;font-size:1.6rem"></span>
        <div style="flex:1;min-width:180px"><h2 style="margin:0 0 4px;font-size:1.1rem">🎨 My character</h2><p class="meta" style="margin:0">Choose an animal or a friendly alien. Others see it next to your name in the community and on your profile.</p></div>
        <button type="button" class="btn btn-red" id="av-change">Choose my character</button>`;
      if (h) h.after(box); else main.prepend(box);
      const pv = document.getElementById('av-preview');
      try { const { data: me } = await db.from('profiles').select('full_name').eq('id', uid).maybeSingle(); pv.textContent = String((me && me.full_name) || session.user.email).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); } catch (_) {}
      document.getElementById('av-change').addEventListener('click', () => tnOpenBuilder(() => {
        document.querySelectorAll(`[data-av="${uid}"]`).forEach(el => el.removeAttribute('data-av-done')); tnPaintAvatars();
      }));
    }
    // dashboards and the top bar: show the character instead of initials (once the initials have been filled in)
    let tries = 0;
    const mark = () => {
      const els = ['me-initials', 'me-initials-small'].map(id => document.getElementById(id)).filter(Boolean);
      if (els.some(el => !el.textContent.trim()) && tries++ < 25) return setTimeout(mark, 200);
      els.forEach(el => { el.dataset.av = uid; el.removeAttribute('data-av-done'); });
      tnPaintAvatars();
    };
    mark();
  }
  if (typeof db !== 'undefined' && typeof tnOpenBuilder === 'function') (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start());
})();
