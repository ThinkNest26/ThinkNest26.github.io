// ===== Think Nest: Coffee, Chats & Connections (Teacher Hub, ready for the Parent Hub too) =====
async function startConnect(sp) {
  const ctx = sp === 'parents' ? await initParent() : await initTeacher();
  const uid = (ctx.user || {}).id || (await db.auth.getSession()).data.session.user.id;
  const box = document.getElementById('cx-page');
  const hubPage = sp === 'teachers' ? 'teacher-hub.html' : 'parent-hub.html', hubName = sp === 'teachers' ? 'Beyond the Bell' : 'Beyond the School Run';
  const role = ((ctx.profile || ctx.me || {}).role);
  if (role !== 'admin') {
    const { data: ok } = await db.rpc('is_hub_member', { h: sp });
    if (!ok) { box.innerHTML = `<div class="empty-box"><p>☕ Coffee, Chats &amp; Connections is for members of <b>${hubName}</b>. Ask to join the hub, and you’ll be in as soon as Think Nest approves you.</p><a class="btn btn-red" href="${hubPage}">Go to ${hubName}</a></div>`; return; }
  }
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ini = n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const when = d => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  let tab = location.hash === '#meetups' ? 'meetups' : location.hash === '#people' ? 'people' : 'roulette';
  box.innerHTML = `<section class="cx-hero"><span class="cx-cup">☕</span><div><span class="hub-kicker">${hubName}</span><h1>Coffee, Chats &amp; Connections</h1><p>Meet new colleagues, grab a virtual coffee, and find people who can help, or who you can help.</p></div></section>
    <div class="cx-tabs" role="tablist"><button role="tab" data-cx="roulette">☕ Coffee Roulette</button><button role="tab" data-cx="meetups">📅 Coffee meetups</button><button role="tab" data-cx="people">🤝 Find your people</button></div>
    <div id="cx-body"></div>`;
  const body = document.getElementById('cx-body');
  const sayHi = id => `<a class="btn btn-red cx-hi" href="messages.html?with=${id}">👋 Say hi</a>`;

  async function roulette() {
    const { data: mine } = await db.from('hub_profiles').select('*').eq('user_id', uid).eq('hub', sp).maybeSingle();
    const wk = new Date(); wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7));
    const { data: m } = await db.from('coffee_matches').select('*').eq('hub', sp).gte('week', wk.toISOString().slice(0, 10)).or(`user_a.eq.${uid},user_b.eq.${uid}`).maybeSingle();
    let partner = null;
    if (m) { const pid = m.user_a === uid ? m.user_b : m.user_a; const { data: p } = await db.from('profiles').select('id, full_name, subject, school').eq('id', pid).maybeSingle(); partner = p; }
    body.innerHTML = `<section class="panel cx-roulette">
      <div class="cx-cups" aria-hidden="true"><span>☕</span><span class="cx-plus">+</span><span>☕</span></div>
      ${partner ? `<h2>This week’s coffee partner</h2><div class="cx-match"><span class="initials big">${E(ini(partner.full_name))}</span><div><b>${E(partner.full_name)}</b><span class="meta">${E([partner.subject, partner.school].filter(Boolean).join(' · '))}</span></div></div>
          <p>Say hello and find 15 minutes for a coffee chat this week: online or in the staffroom! ☕</p>${sayHi(partner.id)}`
        : `<h2>Meet someone new this week</h2><p>Coffee Roulette pairs you with a random colleague for a relaxed 15-minute chat. No agenda, just coffee and conversation.</p>
          <button type="button" class="btn btn-red btn-big" id="cx-match">☕ Match me for a coffee</button>`}
      <label class="switch-row cx-opt"><input type="checkbox" id="cx-roul" ${mine && mine.roulette ? 'checked' : ''}> I’m happy to be matched by colleagues too</label>
    </section>
    <section class="panel cx-me"><h3>My café profile</h3><p class="meta">Help others find you in “Find your people”.</p>
      <label>I can help with <input type="text" id="cx-help" maxlength="200" value="${E(mine && mine.can_help)}" placeholder="For example, phonics, Canva, behaviour tips"></label>
      <label>I’d love to learn <input type="text" id="cx-learn" maxlength="200" value="${E(mine && mine.want_learn)}" placeholder="For example, AI tools, public speaking"></label>
      <button type="button" class="btn btn-red" id="cx-save">Save my profile</button></section>`;
  }
  async function meetups() {
    const { data: ms } = await db.from('cafe_meetups').select('*').eq('hub', sp).gte('starts_at', new Date(Date.now() - 3 * 3600e3).toISOString()).order('starts_at');
    const ids = (ms || []).map(m => m.id);
    const { data: rs } = ids.length ? await db.from('meetup_rsvps').select('*').in('meetup_id', ids) : { data: [] };
    body.innerHTML = `<div class="cx-head"><h2>Upcoming coffee meetups</h2><button type="button" class="btn btn-red" id="cx-new">+ Host a meetup</button></div>
      <form class="panel auth-form cx-form" id="cx-form" hidden>
        <label>What’s the meetup? <input name="title" maxlength="120" required placeholder="For example, Friday coffee and planning swap"></label>
        <div class="two"><label>Date and time <input type="datetime-local" name="when" required></label><label>Spots (optional) <input type="number" name="cap" min="2" max="200" placeholder="For example, 8"></label></div>
        <div class="two"><label>Where? <input name="place" maxlength="160" placeholder="Café name, or Online"></label><label>Online link (optional) <input type="url" name="link" placeholder="https://meet.google.com/…"></label></div>
        <label>Details (optional) <textarea name="details" rows="2" maxlength="600"></textarea></label>
        <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" id="cx-cancel">Cancel</button><button class="btn btn-red auth-btn">Post meetup</button></div></form>
      <div class="cx-meetups">${(ms || []).length ? ms.map(m => { const go = (rs || []).filter(r => r.meetup_id === m.id), me = go.some(r => r.user_id === uid), full = m.capacity && go.length >= m.capacity;
        const d = new Date(m.starts_at);
        return `<article class="panel cx-meet"><div class="cx-date"><b>${d.toLocaleDateString('en-GB', { day: 'numeric' })}</b><span>${d.toLocaleDateString('en-GB', { month: 'short' })}</span></div>
          <div class="cx-meet-info"><h3>${E(m.title)}</h3><span class="meta">🕒 ${when(m.starts_at)}${m.place ? ' · 📍 ' + E(m.place) : ''}${m.link ? ' · 💻 online' : ''}</span>
            ${m.details ? `<p>${E(m.details)}</p>` : ''}<span class="meta">Hosted by ${E(m.host_name || 'a member')}</span>
            <div class="cx-going">${go.slice(0, 8).map(r => `<span class="initials sm" title="${E(r.user_name)}">${E(ini(r.user_name))}</span>`).join('')}<span class="meta">${go.length} going${m.capacity ? ' · ' + Math.max(0, m.capacity - go.length) + ' spots left' : ''}</span></div></div>
          <div class="cx-meet-btns">${me ? `<button type="button" class="pill pill-soft" data-unrsvp="${m.id}">✓ You’re going · Cancel</button>${m.link ? `<a class="pill pill-live" href="${E(m.link)}" target="_blank" rel="noopener">Join link</a>` : ''}` : full ? '<span class="tag">Full</span>' : `<button type="button" class="btn btn-red" data-rsvp="${m.id}">I’m in! ☕</button>`}
            ${m.host_id === uid || role === 'admin' ? `<button type="button" class="link-btn" data-mdel="${m.id}">Delete</button>` : ''}</div></article>`; }).join('')
        : '<div class="empty-box"><p>No meetups yet. Why not host the first one? ☕</p></div>'}</div>`;
  }
  async function people() {
    const { data } = await db.rpc('cafe_directory', { sp });
    const list = (data || []).filter(p => p.id !== uid);
    body.innerHTML = `<div class="cx-head"><h2>Find your people</h2><input type="search" id="cx-search" placeholder="Search by name, subject or skill" class="cx-search"></div>
      <div class="cx-people">${list.length ? list.map(p => `<article class="panel cx-person" data-text="${E([p.full_name, p.subject, p.school, p.can_help, p.want_learn].join(' ').toLowerCase())}">
        <span class="initials big">${E(ini(p.full_name))}</span><b>${E(p.full_name)}</b><span class="meta">${E([p.subject, p.school].filter(Boolean).join(' · '))}</span>
        ${p.can_help ? `<p class="cx-tag help">🙋 Can help with: ${E(p.can_help)}</p>` : ''}${p.want_learn ? `<p class="cx-tag learn">🌱 Would love to learn: ${E(p.want_learn)}</p>` : ''}
        ${p.roulette ? '<span class="meta">☕ Up for Coffee Roulette</span>' : ''}${sayHi(p.id)}</article>`).join('') : '<div class="empty-box"><p>You’re the first one here! Invite your colleagues to join the hub. ☕</p></div>'}</div>`;
  }
  async function draw() {
    document.querySelectorAll('[data-cx]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.cx === tab)));
    body.innerHTML = '<p class="empty">Loading…</p>';
    await ({ roulette, meetups, people })[tab]();
  }
  box.addEventListener('click', async e => {
    const t = e.target.closest('[data-cx]'); if (t) { tab = t.dataset.cx; history.replaceState(null, '', '#' + tab); return draw(); }
    if (e.target.id === 'cx-match') {
      e.target.disabled = true; e.target.textContent = 'Finding your coffee partner…';
      const { data, error } = await db.rpc('coffee_match_me', { sp });
      if (error) { e.target.disabled = false; e.target.textContent = '☕ Match me for a coffee'; return say(friendly(error)); }
      if (!(data || []).length) { say('No one is free to match just now. You’re on the list, so you’ll be matched when a colleague joins in! ☕'); return roulette(); }
      say('☕ Matched! Say hi to your coffee partner.'); return roulette();
    }
    if (e.target.id === 'cx-save') {
      const { error } = await db.from('hub_profiles').upsert({ user_id: uid, hub: sp, can_help: document.getElementById('cx-help').value.trim(), want_learn: document.getElementById('cx-learn').value.trim(), roulette: document.getElementById('cx-roul').checked, updated_at: new Date().toISOString() });
      return say(error ? friendly(error) : 'Profile saved. ☕');
    }
    if (e.target.id === 'cx-new') { document.getElementById('cx-form').hidden = false; return; }
    if (e.target.id === 'cx-cancel') { document.getElementById('cx-form').hidden = true; return; }
    const r = e.target.closest('[data-rsvp]'); if (r) { const { error } = await db.from('meetup_rsvps').insert({ meetup_id: Number(r.dataset.rsvp) }); if (error) return say(friendly(error)); say('See you there! ☕'); return meetups(); }
    const u = e.target.closest('[data-unrsvp]'); if (u) { await db.from('meetup_rsvps').delete().eq('meetup_id', Number(u.dataset.unrsvp)).eq('user_id', uid); return meetups(); }
    const d = e.target.closest('[data-mdel]'); if (d && confirm('Delete this meetup?')) { await db.from('cafe_meetups').delete().eq('id', Number(d.dataset.mdel)); return meetups(); }
  });
  box.addEventListener('change', async e => {
    if (e.target.id === 'cx-roul') { const { error } = await db.from('hub_profiles').upsert({ user_id: uid, hub: sp, roulette: e.target.checked, updated_at: new Date().toISOString() }); if (error) say(friendly(error)); }
  });
  box.addEventListener('submit', async e => {
    if (e.target.id !== 'cx-form') return; e.preventDefault();
    const f = e.target; if (!f.title.value.trim() || !f.when.value) return say('Add a title, date and time.');
    const { error } = await db.from('cafe_meetups').insert({ hub: sp, title: f.title.value.trim(), starts_at: new Date(f.when.value).toISOString(), place: f.place.value.trim() || null, link: f.link.value.trim() || null, capacity: f.cap.value ? Number(f.cap.value) : null, details: f.details.value.trim() || null });
    if (error) return say(friendly(error)); say('Meetup posted! ☕'); meetups();
  });
  box.addEventListener('input', e => { if (e.target.id === 'cx-search') { const q = e.target.value.toLowerCase(); document.querySelectorAll('.cx-person').forEach(c => c.hidden = q && !c.dataset.text.includes(q)); } });
  draw();
}
