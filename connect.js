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
  const P0 = sp === 'parents';
  const [{ data: sP }, { data: sM }, { data: sD }, { data: agreed }] = await Promise.all(['partners', 'meetups', 'messages'].map(k => db.rpc('connect_setting', { k })).concat([db.rpc('agreed_code', { sp })]));
  const ON = { partners: sP !== false, meetups: sM !== false, messages: sD !== false };
  if (!agreed) {
    box.innerHTML = `<section class="cx-hero"><span class="cx-cup">☕</span><div><span class="hub-kicker">${hubName}</span><h1>Coffee, Chats &amp; Connections</h1><p>A professional space to swap ideas, learn from each other and grow together.</p></div></section>
      <section class="panel cx-code"><h2>🤝 Our code of conduct</h2><p>Before you start, please read and agree to keep this space professional and comfortable for everyone.</p>
        <ul><li>✅ Keep every conversation <b>professional and respectful</b>, focused on ${P0 ? 'parenting, learning and personal growth' : 'teaching, learning and professional growth'}.</li>
          <li>🚫 <b>No personal, romantic or private invitations</b>, and no comments about anyone’s appearance.</li>
          <li>🔒 <b>Don’t share personal contact details</b> or social media. Keep conversations on Think Nest.</li>
          <li>👥 <b>Meet in groups</b>: online, or in a public place such as a café${P0 ? ', park or community centre' : ' or school'}. Never at home.</li>
          <li>🛡️ Messages may be <b>reviewed by Think Nest</b> to keep everyone safe. Some messages are checked automatically.</li>
          <li>🚩 <b>Report</b> anything that makes you uncomfortable. Breaking these rules can mean losing access to the hub.</li></ul>
        <label class="switch-row"><input type="checkbox" id="cx-agree"> I have read and agree to the code of conduct</label>
        <button type="button" class="btn btn-red" id="cx-agree-btn" disabled>Continue</button></section>`;
    box.querySelector('#cx-agree').addEventListener('change', e => box.querySelector('#cx-agree-btn').disabled = !e.target.checked);
    box.querySelector('#cx-agree-btn').addEventListener('click', async () => {
      const { error } = await db.from('hub_profiles').upsert({ user_id: uid, hub: sp, agreed_code: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (error) return say(friendly(error)); location.reload();
    });
    return;
  }
  const P = sp === 'parents';
  const W = P ? { partners: 'Parent Partners', partner: 'parent partner', colleague: 'parent', colleagues: 'parents', directory: 'Parent directory', topic: 'parenting, learning and personal growth', place: 'A public café, park or community centre, or Online' }
              : { partners: 'Learning Partners', partner: 'learning partner', colleague: 'colleague', colleagues: 'colleagues', directory: 'Colleague directory', topic: 'teaching, learning and professional growth', place: 'A public café or school, or Online' };
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ini = n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const when = d => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  let tab = location.hash === '#meetups' && ON.meetups ? 'meetups' : location.hash === '#people' ? 'people' : ON.partners ? 'roulette' : ON.meetups ? 'meetups' : 'people';
  box.innerHTML = `<section class="cx-hero"><span class="cx-cup">☕</span><div><span class="hub-kicker">${hubName}</span><h1>Coffee, Chats &amp; Connections</h1><p>${P ? 'A friendly, respectful space to swap ideas, learn from other parents and grow together, over a (virtual) cup of coffee.' : 'A professional space to swap ideas, learn from colleagues and grow together, over a (virtual) cup of coffee.'}</p></div></section>
    <div class="cx-tabs" role="tablist">${ON.partners ? `<button role="tab" data-cx="roulette">☕ ${W.partners}</button>` : ''}${ON.meetups ? '<button role="tab" data-cx="meetups">📅 Group meetups</button>' : ''}<button role="tab" data-cx="people">📇 ${W.directory}</button></div>
    <p class="cx-note">🛡️ Keep it professional: no personal invitations or contact details. <a href="#" id="cx-code-link">Code of conduct</a></p>
    <div id="cx-body"></div>`;
  const body = document.getElementById('cx-body');
  const cafePage = sp === 'teachers' ? 'teacher-cafe.html' : 'parent-cafe.html';
  const sayHi = (id, name) => `<div class="cx-contact"><a class="btn btn-red cx-hi" href="${cafePage}?ask=${encodeURIComponent(name || '')}">💬 Ask in the café</a>${ON.messages ? `<a class="link-btn" href="messages.html?with=${id}">Send a professional message</a>` : ''}</div>`;

  async function roulette() {
    const { data: mine } = await db.from('hub_profiles').select('*').eq('user_id', uid).eq('hub', sp).maybeSingle();
    const wk = new Date(); wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7));
    const { data: m } = await db.from('coffee_matches').select('*').eq('hub', sp).gte('week', wk.toISOString().slice(0, 10)).or(`user_a.eq.${uid},user_b.eq.${uid}`).maybeSingle();
    let partner = null;
    if (m) { const pid = m.user_a === uid ? m.user_b : m.user_a; const { data: p } = await db.from('profiles').select('id, full_name, subject, school').eq('id', pid).maybeSingle(); partner = p; }
    body.innerHTML = `<section class="panel cx-roulette">
      <div class="cx-cups" aria-hidden="true"><span>☕</span><span class="cx-plus">+</span><span>☕</span></div>
      ${partner ? `<h2>This week’s ${W.partner}</h2><div class="cx-match"><span class="initials big">${E(ini(partner.full_name))}</span><div><b>${E(partner.full_name)}</b><span class="meta">${E([partner.subject, partner.school].filter(Boolean).join(' · '))}</span></div></div>
          <p>Swap ideas on a topic you share, for 15 minutes this week: in the café, online, or in the staffroom with colleagues around. ☕</p>${sayHi(partner.id, partner.full_name)}`
        : `<h2>Swap ideas with a ${W.colleague}</h2><p>${W.partners} pairs you with a ${W.colleague} who shares your interests, using your “I can help with” and “I’d love to learn” topics. Fill those in below first for the best match.</p>
          <button type="button" class="btn btn-red btn-big" id="cx-match">☕ Find me a ${W.partner}</button>`}
      <label class="switch-row cx-opt"><input type="checkbox" id="cx-roul" ${mine && mine.roulette ? 'checked' : ''}> I’m happy to be paired as a ${W.partner}</label>
    </section>
    <section class="panel cx-me"><h3>My interests</h3><p class="meta">Used for ${W.partners} and the ${W.directory}. Keep it to learning and growth topics, please.</p>
      <label>I can help with <input type="text" id="cx-help" maxlength="200" value="${E(mine && mine.can_help)}" placeholder="${P ? 'For example, healthy lunchboxes, budgeting, Arabic' : 'For example, phonics, Canva, behaviour tips'}"></label>
      <label>I’d love to learn <input type="text" id="cx-learn" maxlength="200" value="${E(mine && mine.want_learn)}" placeholder="${P ? 'For example, photography, yoga, starting a small business' : 'For example, AI tools, public speaking'}"></label>
      <button type="button" class="btn btn-red" id="cx-save">Save my profile</button></section>`;
  }
  async function meetups() {
    const { data: ms } = await db.from('cafe_meetups').select('*').eq('hub', sp).gte('starts_at', new Date(Date.now() - 3 * 3600e3).toISOString()).order('starts_at');
    const ids = (ms || []).map(m => m.id);
    const { data: rs } = ids.length ? await db.from('meetup_rsvps').select('*').in('meetup_id', ids) : { data: [] };
    body.innerHTML = `<div class="cx-head"><h2>Upcoming group meetups</h2><button type="button" class="btn btn-red" id="cx-new">+ Host a group meetup</button></div>
      <form class="panel auth-form cx-form" id="cx-form" hidden>
        <label>What’s the meetup? <input name="title" maxlength="120" required placeholder="For example, Friday coffee and planning swap"></label>
        <div class="two"><label>Date and time <input type="datetime-local" name="when" required></label><label>Places (at least 3) <input type="number" name="cap" min="3" max="200" value="6"></label></div>
        <div class="two"><label>Where? <input name="place" maxlength="160" placeholder="${W.place}"></label><label>Online link (optional) <input type="url" name="link" placeholder="https://meet.google.com/…"></label></div>
        <label>Details (optional) <textarea name="details" rows="2" maxlength="600" placeholder="The professional topic, for example: sharing reading strategies"></textarea></label>
        <label class="switch-row"><input type="checkbox" name="public" required> This is a group meetup, online or in a public place (never a home)</label>
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
    body.innerHTML = `<div class="cx-head"><h2>${W.directory}: who can help with what</h2><input type="search" id="cx-search" placeholder="Search by name, subject or skill" class="cx-search"></div>
      <div class="cx-people">${list.length ? list.map(p => `<article class="panel cx-person" data-text="${E([p.full_name, p.subject, p.school, p.can_help, p.want_learn].join(' ').toLowerCase())}">
        <span class="initials big">${E(ini(p.full_name))}</span><b>${E(p.full_name)}</b><span class="meta">${E([p.subject, p.school].filter(Boolean).join(' · '))}</span>
        ${p.can_help ? `<p class="cx-tag help">🙋 Can help with: ${E(p.can_help)}</p>` : ''}${p.want_learn ? `<p class="cx-tag learn">🌱 Would love to learn: ${E(p.want_learn)}</p>` : ''}
        ${p.roulette ? `<span class="meta">☕ Open to ${W.partners}</span>` : ''}${sayHi(p.id, p.full_name)}</article>`).join('') : `<div class="empty-box"><p>You’re the first one here! Invite other ${W.colleagues} to join the hub. ☕</p></div>`}</div>`;
  }
  async function draw() {
    document.querySelectorAll('[data-cx]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.cx === tab)));
    body.innerHTML = '<p class="empty">Loading…</p>';
    await ({ roulette, meetups, people })[tab]();
  }
  box.addEventListener('click', async e => {
    if (e.target.id === 'cx-code-link') { e.preventDefault(); alert('Code of conduct\n\n• Keep it professional and respectful.\n• No personal, romantic or private invitations, and no comments about appearance.\n• Don’t share personal contact details or social media.\n• Meet in groups, online or in a public place. Never at home.\n• Messages may be reviewed by Think Nest.\n• Report anything that makes you uncomfortable.'); return; }
    const t = e.target.closest('[data-cx]'); if (t) { tab = t.dataset.cx; history.replaceState(null, '', '#' + tab); return draw(); }
    if (e.target.id === 'cx-match') {
      e.target.disabled = true; e.target.textContent = 'Finding a ' + W.partner + '…';
      const { data, error } = await db.rpc('coffee_match_me', { sp });
      if (error) { e.target.disabled = false; e.target.textContent = '☕ Find me a ' + W.partner; return say(friendly(error)); }
      if (!(data || []).length) { say('No one is free to pair just now. You’re on the list, so you’ll be paired when another ' + W.colleague + ' joins in. ☕'); return roulette(); }
      say('☕ Paired! Say hello to your ' + W.partner + ' in the café.'); return roulette();
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
    if (!f.place.value.trim() && !f.link.value.trim()) return say('Add a public place, or an online link.');
    if (!f.cap.value || Number(f.cap.value) < 3) return say('Group meetups need at least 3 places.');
    if (!f.public.checked) return say('Please confirm it’s a group meetup online or in a public place.');
    const { error } = await db.from('cafe_meetups').insert({ hub: sp, title: f.title.value.trim(), starts_at: new Date(f.when.value).toISOString(), place: f.place.value.trim() || null, link: f.link.value.trim() || null, capacity: Number(f.cap.value), details: f.details.value.trim() || null });
    if (error) return say(friendly(error)); say('Meetup posted! ☕'); meetups();
  });
  box.addEventListener('input', e => { if (e.target.id === 'cx-search') { const q = e.target.value.toLowerCase(); document.querySelectorAll('.cx-person').forEach(c => c.hidden = q && !c.dataset.text.includes(q)); } });
  draw();
}
