// ===== PLOT TWIST! (home page): Beyond the Bell + Beyond the School Run =====
// Uses HUBS from hubs.js and db from supabase-config.js
(function () {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MORE = {
    teachers: { twist: 'Plot Twist! You’re not just a teacher.', quip: 'No marking. No lesson plans. Just possibilities.', join: 'teacher-signup.html', login: 'teacher-login.html',
      cafe: { page: 'teacher-cafe.html', name: 'Teacher Café', theme: 'tc',
        chat: [['S', 'Sara', 'Best 2-minute starter you’ve tried this week? ☕'], ['O', 'Omar', 'Mini whiteboards + “show me in 3, 2, 1!” Works every time 🙌'], ['L', 'Layla', '📊 Poll: Friday treat, cake or coffee?']] } },
    parents: { twist: 'Plot Twist! You’re not just Mum or Dad.', quip: 'You’ve signed them up for everything. Now it’s your turn!', join: 'parent-signup.html', login: 'parent-login.html',
      cafe: { page: 'parent-cafe.html', name: 'Parent Café', theme: 'pc',
        chat: [['H', 'Huda', 'Freeze grapes the night before: instant cold lunchbox snack 🍇'], ['R', 'Rana', 'Any tips for a calmer bedtime routine? 🌙'], ['M', 'Maha', '🎉 My son read his first chapter book today!']] } }
  };
  let data = { teachers: [], parents: [] }, session = null;

  function panel(aud) {
    const H = HUBS[aud], M = MORE[aud], list = data[aud];
    const topics = H.cats.filter(c => !['cafe', 'circles'].includes(c[0]));
    const count = k => list.filter(w => w.category === k || w.category === (H.cats.find(c => c[0] === k) || [])[2]).length;
    const topicOf = w => H.cats.find(c => c[0] === w.category || c[2] === w.category) || ['', '✨', ''];
    const cafeHref = session ? M.cafe.page : M.login;
    return `<div class="pt2-hub" style="--c:${H.color}">
      <div class="pt2-intro">
        <span class="pt2-pic"><img src="${H.img}" alt=""></span>
        <div class="pt2-intro-txt"><span class="pt2-kicker">${E(H.kicker)}</span><h3>${E(H.name)}</h3><p class="pt2-twist">${E(M.twist)}</p><p class="pt2-about">${E(H.about)}</p></div>
        <div class="pt2-btns"><a class="pt2-main" href="hub.html?for=${aud}">Explore the hub →</a>${session ? '' : `<a class="pt2-second" href="${M.join}">Join free</a>`}</div>
      </div>
      <div class="pt2-row">
        <section class="pt2-box">
          <h4>✨ Workshops on now</h4>
          ${list.length ? `<div class="pt2-ws">${list.slice(0, 3).map(w => { const t = topicOf(w); return `<a class="pt2-w" href="hub.html?for=${aud}&topic=${encodeURIComponent(t[0])}"><span class="pt2-wic" aria-hidden="true">${t[1]}</span>
              <span><b>${E(w.title)}</b><small>${E([t[2], w.format, w.weeks ? w.weeks + (w.weeks === 1 ? ' week' : ' weeks') : ''].filter(Boolean).join(' · '))}</small></span><i aria-hidden="true">›</i></a>`; }).join('')}</div>
            ${list.length > 3 ? `<a class="pt2-all" href="hub.html?for=${aud}">See all ${list.length} workshops →</a>` : ''}`
            : `<div class="pt2-none"><span aria-hidden="true">🌱</span><p>New workshops are coming soon. Got an idea? <a href="contact.html">Suggest a workshop</a></p></div>`}
        </section>
        <section class="pt2-box pt2-cafe ${M.cafe.theme}">
          <h4>☕ The ${E(M.cafe.name)}</h4>
          <p class="pt2-cafe-sub">A private, friendly space for members: tips, questions, polls and shout-outs.</p>
          <div class="pt2-chat" aria-hidden="true">${M.cafe.chat.map(([i, n, t]) => `<div class="pt2-msg"><span>${i}</span><p><b>${n}</b>${E(t)}</p></div>`).join('')}</div>
          <a class="pt2-cafe-btn" href="${cafeHref}">${session ? 'Open the café →' : 'Log in to open the café →'}</a>
          ${session ? '' : `<p class="pt2-cafe-note">Members only. New here? <a href="${M.join}">Join free</a></p>`}
        </section>
      </div>
      <section class="pt2-topics-box">
        <h4>🧭 Explore topics</h4>
        <div class="pt2-topics">${topics.map(([k, ic, name]) => { const n = count(k); return `<a class="pt2-topic" href="hub.html?for=${aud}&topic=${k}"><span aria-hidden="true">${ic}</span><b>${E(name)}</b>${n ? `<i>${n}</i>` : ''}</a>`; }).join('')}</div>
      </section>
      <p class="pt2-quip">${E(M.quip)}</p>
    </div>`;
  }

  function show(aud) {
    document.querySelectorAll('.pt2-tabs [data-aud]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aud === aud)));
    const p = document.getElementById('pt2-panel');
    p.setAttribute('aria-labelledby', 'pt2-tab-' + aud);
    p.innerHTML = panel(aud);
    try { sessionStorage.setItem('tn_pt2', aud); } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const tabs = document.querySelector('.pt2-tabs'); if (!tabs || typeof HUBS === 'undefined') return;
    let aud = 'teachers'; try { aud = sessionStorage.getItem('tn_pt2') || aud; } catch (_) {}
    if (/[?&]for=parents/.test(location.search)) aud = 'parents';
    show(aud);
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-aud]'); if (b) show(b.dataset.aud); });
    tabs.addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return; const all = [...tabs.querySelectorAll('[data-aud]')]; const n = all[(all.indexOf(document.activeElement) + 1) % all.length]; n.focus(); n.click(); });
    try {
      const [{ data: s }, { data: ws }] = await Promise.all([db.auth.getSession(), db.from('courses').select('id, title, category, format, weeks, audience').in('audience', ['teachers', 'parents']).order('id', { ascending: false })]);
      session = s && s.session;
      (ws || []).forEach(w => data[w.audience] && data[w.audience].push(w));
      show(document.querySelector('.pt2-tabs [aria-selected=true]').dataset.aud);
    } catch (_) {}
  });
})();
