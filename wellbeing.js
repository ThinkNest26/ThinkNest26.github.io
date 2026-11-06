// ===== Think Nest for Schools: wellbeing check-ins =====
const WB_E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WB_MOODS = [[5, '😄', 'Great'], [4, '🙂', 'Good'], [3, '😐', 'OK'], [2, '😟', 'Not great'], [1, '😢', 'Upset']];
const WB_TAGS = [['friends', '👫 Friends'], ['family', '🏠 Family'], ['schoolwork', '📚 Schoolwork'], ['tired', '😴 Tired'], ['unwell', '🤒 Feeling unwell'], ['other', '💭 Something else']];
const wbFace = m => (WB_MOODS.find(x => x[0] === Number(m)) || [0, '·', ''])[1];
const wbDay = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// ----- the student's daily check-in card (student home page, school students only)
async function tnCheckin() {
  for (let i = 0; i < 25 && window.TN_SCHOOL === undefined; i++) await new Promise(r => setTimeout(r, 200));
  const sc = window.TN_SCHOOL; if (!sc || sc.my_role !== 'student') return;
  const main = document.querySelector('main'); if (!main || document.getElementById('wb-card')) return;
  const { data: today } = await db.from('wellbeing_checkins').select('mood').eq('day', wbDay()).maybeSingle();
  main.insertAdjacentHTML('afterbegin', '<section class="panel wb-card" id="wb-card" aria-live="polite"></section>');
  const box = document.getElementById('wb-card');
  const done = (mood, kind) => {
    box.innerHTML = `<div class="wb-done"><span class="wb-big" aria-hidden="true">${wbFace(mood)}</span><div><b>${kind === 'talk' ? 'Thank you for telling us. 💛' : kind === 'low' ? 'Thank you for telling us. It’s OK to have hard days. 💛' : 'Thanks for checking in! 💛'}</b>
      <p>${kind === 'talk' ? 'Your teacher knows you’d like to talk, and will find you soon.' : kind === 'low' ? 'If you’d like to talk to someone, tell your teacher, or tap “I’d like to talk to a teacher” next time.' : 'Have a lovely day of learning.'}</p>
      <small class="meta">If you ever feel unsafe or very upset, tell a teacher or an adult you trust straight away.</small></div>
      <button type="button" class="link-btn" id="wb-change">Change</button></div>`;
    document.getElementById('wb-change').onclick = ask;
  };
  function ask() {
    let mood = 0;
    box.innerHTML = `<h2>💛 How are you feeling today?</h2><div class="wb-moods" role="radiogroup" aria-label="How are you feeling today?">${WB_MOODS.map(([v, f, l]) => `<button type="button" class="wb-m" data-m="${v}" aria-pressed="false"><span>${f}</span><b>${l}</b></button>`).join('')}</div>
      <div class="wb-more" hidden><p class="wb-q">Is it about anything? <small class="meta">(you can skip this)</small></p>
        <div class="wb-tags">${WB_TAGS.map(([k, l]) => `<label class="sc-chip"><input type="checkbox" value="${k}"><span>${l}</span></label>`).join('')}</div>
        <label class="wb-talk"><input type="checkbox" id="wb-talk"> <span>🙋 I’d like to talk to a teacher</span></label>
        <input type="text" id="wb-note" maxlength="300" placeholder="Anything else you want to tell your teacher? (optional)"></div>
      <div class="wb-send" hidden><button type="button" class="btn btn-red" id="wb-go">Send</button></div>`;
    box.querySelectorAll('.wb-m').forEach(b => b.onclick = () => {
      mood = Number(b.dataset.m); box.querySelectorAll('.wb-m').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      box.querySelector('.wb-more').hidden = mood > 3; box.querySelector('.wb-send').hidden = false;
    });
    document.getElementById('wb-go').onclick = async () => {
      if (!mood) return;
      const tags = mood <= 3 ? [...box.querySelectorAll('.wb-tags input:checked')].map(x => x.value) : [];
      const talk = mood <= 3 && document.getElementById('wb-talk').checked, note = mood <= 3 ? document.getElementById('wb-note').value : '';
      if (note && typeof tnBlocked === 'function' && await tnBlocked(note, 'wellbeing note', null)) return;
      const { data, error } = await db.rpc('wellbeing_checkin', { amood: mood, atags: tags, atalk: talk, anote: note });
      if (error) return say(friendly(error));
      done(mood, data);
    };
  }
  if (today) done(today.mood, 'ok'); else ask();
}

// ----- the staff page
async function startWellbeing() {
  const { profile } = await initTeacher();
  const box = document.getElementById('wellbeing');
  const { data: scs } = await db.rpc('my_schools');
  const S = (scs || []).find(s => !['student', 'parent'].includes(s.my_role));
  if (!S) { box.innerHTML = '<div class="empty-box"><p>Wellbeing check-ins are part of Think Nest for Schools, for staff of a school.</p></div>'; return; }
  document.documentElement.style.setProperty('--school', S.color_primary || '#3E4B94'); document.documentElement.style.setProperty('--school2', S.color_accent || '#F27A6F');
  let gid = null;
  async function draw() {
    box.innerHTML = '<p class="empty">Loading…</p>';
    const { data: d, error } = await db.rpc('wellbeing_overview', { sid: S.id, gid });
    if (error) { box.innerHTML = `<p class="empty">${WB_E(/wellbeing|function/.test(error.message || '') ? 'Run database update 66 to use wellbeing check-ins.' : friendly(error))}</p>`; return; }
    const T = d.today || {}, A = d.attention || [], C = d.classes || [], D = d.days || [];
    const tagName = k => (WB_TAGS.find(t => t[0] === k) || [k, k])[1];
    // the 4-week line (average mood out of 5)
    const pts = D.map((x, i) => ({ i, v: x.avg == null ? null : Number(x.avg), n: x.n, day: x.day }));
    const W = 1000, H = 200, L = 40, R = 16, Tp = 14, B = 30, X = i => L + i * (W - L - R) / Math.max(1, pts.length - 1), Y = v => Tp + (5 - v) * (H - Tp - B) / 4;
    let path = '', pen = false; pts.forEach(p => { if (p.v == null) { pen = false; return; } path += (pen ? 'L' : 'M') + X(p.i).toFixed(1) + ' ' + Y(p.v).toFixed(1) + ' '; pen = true; });
    const chart = pts.some(p => p.v != null) ? `<svg class="sc-trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average mood over the last 4 weeks">
        ${[1, 2, 3, 4, 5].map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ECEEF6"/><text x="${L - 10}" y="${Y(v) + 5}" text-anchor="end" font-size="16">${wbFace(v)}</text>`).join('')}
        ${pts.filter(p => p.i % 7 === 0 || p.i === pts.length - 1).map(p => `<text x="${X(p.i)}" y="${H - 8}" text-anchor="middle" font-size="13" fill="#8A8FA3">${new Date(p.day + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>`).join('')}
        <path d="${path}" fill="none" stroke="var(--school)" stroke-width="3" stroke-linejoin="round"/>${pts.filter(p => p.v != null).map(p => `<circle cx="${X(p.i)}" cy="${Y(p.v)}" r="4" fill="var(--school)"><title>${p.day}: ${p.v} (${p.n} check-ins)</title></circle>`).join('')}</svg>`
      : '<p class="meta">The trend appears once students start checking in.</p>';
    const total = Object.values(T).reduce((a, b) => a + b, 0);
    box.innerHTML = `<div class="page-head"><h1 class="title">💛 Wellbeing</h1>${C.length > 1 ? `<label class="wb-pick">Class <select id="wb-g"><option value="">All my students</option>${C.map(c => `<option value="${c.id}" ${gid === c.id ? 'selected' : ''}>${WB_E(c.name)}</option>`).join('')}</select></label>` : ''}</div>
      <p class="note">🔒 Private: only each student’s class teachers, the inclusion lead and senior leaders see check-ins.</p>
      <section class="panel"><h2>Today <small class="meta">${d.today_count} of ${d.students} students checked in</small></h2>
        <div class="wb-today">${WB_MOODS.map(([v, f, l]) => `<div class="wb-t m${v}"><span>${f}</span><b>${T[v] || 0}</b><small>${l}</small></div>`).join('')}</div>
        ${total ? `<div class="wb-bar">${WB_MOODS.map(([v]) => T[v] ? `<i class="m${v}" style="flex:${T[v]}"></i>` : '').join('')}</div>` : ''}</section>
      <section class="panel wb-attn"><h2>💛 Students to check in with ${A.length ? `<span class="count">${A.length}</span>` : ''}</h2>
        ${A.length ? A.map(a => `<article class="wb-a" data-c="${a.id}"><span class="wb-big">${wbFace(a.mood)}</span><div><b>${WB_E(a.name)}</b> <small class="meta">${WB_E(a.classes || '')} · ${new Date(a.day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</small>
            <div>${a.talk ? '<span class="wb-flag talk">🙋 Would like to talk</span>' : ''}${a.lows >= 2 ? `<span class="wb-flag low">😟 Low ${a.lows} times this week</span>` : ''}${(a.tags || []).map(t => `<span class="wb-flag">${WB_E(tagName(t))}</span>`).join('')}</div>
            ${a.note ? `<p class="wb-note">“${WB_E(a.note)}”</p>` : ''}</div>
          <div class="wb-f"><input type="text" maxlength="300" placeholder="What did you do? (optional)"><button type="button" class="pill pill-soft" data-f>✓ Followed up</button></div></article>`).join('')
          : '<p class="meta">No one needs a check-in right now. 🌈</p>'}
        ${(d.followed || []).length ? `<details class="wb-done-list"><summary>✓ Followed up in the last 2 weeks (${d.followed.length})</summary>${d.followed.map(f => `<p><b>${WB_E(f.name)}</b> <small class="meta">by ${WB_E(f.by || '')} · ${new Date(f.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small>${f.note ? ` · ${WB_E(f.note)}` : ''}</p>`).join('')}</details>` : ''}</section>
      <section class="panel sc-chart-panel"><h2>📈 The last 4 weeks</h2>${chart}</section>
        <section class="panel wb-classes"><h2>🏫 Classes this week</h2>${C.length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Class</th><th>Average mood</th><th>Check-ins</th></tr></thead><tbody>
          ${C.map(c => `<tr><td>${WB_E(c.name)}</td><td>${c.avg == null ? '–' : `${wbFace(Math.round(c.avg))} ${c.avg}`}</td><td>${c.n}</td></tr>`).join('')}</tbody></table></div>` : '<p class="meta">No classes.</p>'}
          ${Object.keys(d.tags || {}).length ? `<h3 class="sc-h3">When students feel low, it’s mostly about…</h3><div class="wb-tagsum">${Object.entries(d.tags).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="wb-flag">${WB_E(tagName(k))} · ${n}</span>`).join('')}</div>` : ''}</section>`;
    const g = document.getElementById('wb-g'); if (g) g.onchange = () => { gid = g.value ? Number(g.value) : null; draw(); };
    box.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => {
      const art = b.closest('[data-c]');
      const { error: er } = await db.rpc('wellbeing_followup', { cid: Number(art.dataset.c), anote: art.querySelector('input').value });
      if (er) return say(friendly(er)); say('✓ Thank you for checking in with them.'); draw();
    });
  }
  draw();
}
