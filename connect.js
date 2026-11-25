// ===== Think Nest: Coffee, Chats & Connections (Teacher Hub, ready for the Parent Hub too) =====
async function startConnect(sp) {
  const ctx = sp === 'parents' ? await initParent() : await initTeacher();
  const uid = (ctx.user || {}).id || (await db.auth.getSession()).data.session.user.id;
  const box = document.getElementById('cx-page');
  // white buttons on this page: white with dark red writing, so they're easy to read
  if (!document.getElementById('cx-btn-css')) { const st = document.createElement('style'); st.id = 'cx-btn-css';
    st.textContent = '#cx-page .btn-white{background:#fff!important;color:#8A2D3B!important;border:2px solid #8A2D3B!important;box-shadow:none!important}#cx-page .btn-white:hover{background:#FBEFF0!important}';
    document.head.appendChild(st); }
  const hubPage = sp === 'teachers' ? 'teacher-hub.html' : 'parent-hub.html', hubName = sp === 'teachers' ? 'Beyond the Bell' : 'Beyond the School Run';
  const role = ((ctx.profile || ctx.me || {}).role);
  if (role !== 'admin') {
    const { data: ok } = await db.rpc('is_hub_member', { h: sp });
    if (!ok) { box.innerHTML = `<div class="empty-box"><p>☕ Coffee, Chats &amp; Connections is for members of <b>${hubName}</b>. Ask to join the hub, and you’ll be in as soon as Think Nest approves you.</p><a class="btn btn-red" href="${hubPage}">Go to ${hubName}</a></div>`; return; }
  }
  const P0 = sp === 'parents';
  // Parent Connections is opt-in: only parents who choose to join are listed and can be contacted
  if (P0) {
    const { data: me0 } = await db.from('hub_profiles').select('listed, agreed_code, opted_out_at').eq('user_id', uid).eq('hub', sp).maybeSingle();
    if (!me0 || !me0.listed) {
      const said = me0 && me0.opted_out_at;
      box.innerHTML = `<section class="cx-hero"><span class="cx-cup">☕</span><div><span class="hub-kicker">${hubName}</span><h1>Coffee, Chats &amp; Connections</h1><p>An optional space where parents who want to can find each other, pair up, join parent groups and meet up.</p></div></section>
        <section class="panel cx-code"><h2>${said ? '🔒 You’re not in Parent Connections' : 'Would you like to join Parent Connections?'}</h2>
          <p>${said ? 'Other parents can’t see you in the directory or contact you through it. You can join any time.' : 'It’s completely optional. Choose what feels right for you.'}</p>
          <ul><li>✅ <b>Yes, join:</b> you’re listed in the parent directory, and other parents who have joined can ask to message you, pair with you and invite you to groups and meetups.</li>
            <li>🔒 <b>No thanks:</b> you aren’t listed anywhere, and no one can contact you through Parent Connections. The Parent Café and everything else stay the same.</li></ul>
          <div class="btns"><button type="button" class="btn btn-red" id="cx-join">Yes, I welcome other parents to contact me</button>${said ? '' : '<button type="button" class="btn" id="cx-no" style="background:#fff;color:#8A2D3B;border:2px solid #8A2D3B;box-shadow:none">No thanks, I don’t want to join</button>'}</div></section>`;
      box.querySelector('#cx-join').addEventListener('click', async () => {
        const row = { user_id: uid, hub: sp, listed: true, opted_out_at: null, updated_at: new Date().toISOString() };
        const { error } = await db.from('hub_profiles').upsert(row);
        if (error) return say(/listed|column/i.test(error.message || '') ? 'Please run the latest Supabase update (Parent Connections) first.' : friendly(error));
        location.reload();
      });
      const no = box.querySelector('#cx-no');
      if (no) no.addEventListener('click', async () => {
        const { error } = await db.from('hub_profiles').upsert({ user_id: uid, hub: sp, listed: false, roulette: false, opted_out_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        if (error) return say(/opted_out|column/i.test(error.message || '') ? 'Please run the latest Supabase update (Parent Connections) first.' : friendly(error));
        say('Done. You’re not listed, and no one can contact you through Parent Connections.'); location.reload();
      });
      return;
    }
  }
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
  if (P) tab = location.hash === '#meetups' && ON.meetups ? 'meetups' : location.hash === '#groups' ? 'groups' : 'people';
  box.innerHTML = `<section class="cx-hero"><span class="cx-cup">☕</span><div><span class="hub-kicker">${hubName}</span><h1>Coffee, Chats &amp; Connections</h1><p>${P ? 'A friendly, respectful space to swap ideas, learn from other parents and grow together, over a (virtual) cup of coffee.' : 'A professional space to swap ideas, learn from colleagues and grow together, over a (virtual) cup of coffee.'}</p></div></section>
    <div class="cx-tabs" role="tablist">${ON.partners ? `<button role="tab" data-cx="roulette">☕ ${W.partners}</button>` : ''}${ON.meetups ? '<button role="tab" data-cx="meetups">📅 Group meetups</button>' : ''}<button role="tab" data-cx="people">📇 ${W.directory}</button></div>
    <p class="cx-note">🛡️ Keep it professional: no personal invitations or contact details. <a href="#" id="cx-code-link">Code of conduct</a></p>
    <div id="cx-body"></div>`;
  if (P) box.querySelector('.cx-tabs').innerHTML = '<button role="tab" data-cx="people">📇 Parent directory</button>' + (ON.meetups ? '<button role="tab" data-cx="meetups">📅 Group meetups</button>' : '') + '<button role="tab" data-cx="groups">👥 Parent groups</button>';
  const body = document.getElementById('cx-body');
  const cafePage = sp === 'teachers' ? 'teacher-cafe.html' : 'parent-cafe.html';
  const sayHi = (id, name) => `<div class="cx-contact">${ON.messages ? `<a class="btn btn-red cx-hi" href="messages.html?with=${id}">✉️ Message ${E((name || '').split(' ')[0] || 'them')}</a><a class="link-btn" href="${cafePage}?ask=${encodeURIComponent(name || '')}">or say hello in the café</a>` : `<a class="btn btn-red cx-hi" href="${cafePage}?ask=${encodeURIComponent(name || '')}">💬 Say hello in the café</a>`}</div>`;

  async function roulette() {
    const { data: mine } = await db.from('hub_profiles').select('*').eq('user_id', uid).eq('hub', sp).maybeSingle();
    const wk = new Date(); wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7));
    const { data: m } = await db.from('coffee_matches').select('*').eq('hub', sp).gte('week', wk.toISOString().slice(0, 10)).or(`user_a.eq.${uid},user_b.eq.${uid}`).maybeSingle();
    let partner = null;
    let pInt = null;
    if (m) { const pid = m.user_a === uid ? m.user_b : m.user_a; const { data: p } = await db.from('profiles').select('id, full_name, subject, school').eq('id', pid).maybeSingle(); partner = p;
      try { const { data: hp } = await db.from('hub_profiles').select('can_help, want_learn').eq('user_id', pid).eq('hub', sp).maybeSingle(); pInt = hp; } catch (_) {} }
    const hasInt = !!(mine && ((mine.can_help || '').trim() || (mine.want_learn || '').trim()));
    const meBox = `<section class="panel cx-me"><h3>${partner ? 'My interests' : 'Step 1: your interests'}</h3><p class="meta">Used to find you a good ${W.partner} and for the ${W.directory}. Keep it to learning and growth topics, please.</p>
      <label>I can help with <input type="text" id="cx-help" maxlength="200" value="${E(mine && mine.can_help)}" placeholder="${P ? 'For example, healthy lunchboxes, budgeting, Arabic' : 'For example, phonics, Canva, behaviour tips'}"></label>
      <label>I’d love to learn <input type="text" id="cx-learn" maxlength="200" value="${E(mine && mine.want_learn)}" placeholder="${P ? 'For example, photography, yoga, starting a small business' : 'For example, AI tools, public speaking'}"></label>
      <button type="button" class="btn btn-red" id="cx-save">Save my interests</button></section>`;
    body.innerHTML = (partner ? '' : meBox) + `<section class="panel cx-roulette">
      <div class="cx-cups" aria-hidden="true"><span>☕</span><span class="cx-plus">+</span><span>☕</span></div>
      ${partner ? `<h2>🎉 You have been paired with ${E(partner.full_name)}</h2><p class="meta">Your ${W.partner} for this week</p><div class="cx-match"><span class="initials big">${E(ini(partner.full_name))}</span><div><b>${E(partner.full_name)}</b><span class="meta">${E([partner.subject, partner.school].filter(Boolean).join(' · '))}</span>${pInt && pInt.can_help ? `<span class="meta">🤝 Can help with: ${E(pInt.can_help)}</span>` : ''}${pInt && pInt.want_learn ? `<span class="meta">🌱 Would love to learn: ${E(pInt.want_learn)}</span>` : ''}</div></div>
          <p>Swap ideas on a topic you share, for 15 minutes this week: in the café, online, or in the staffroom with colleagues around. ☕</p>${sayHi(partner.id, partner.full_name)}`
        : `<h2>Step 2: swap ideas with a ${W.colleague}</h2><p>${W.partners} pairs you with a ${W.colleague} who shares your interests. Your ${W.partner} appears right here, with a button to message them.</p>
          <button type="button" class="btn btn-red btn-big" id="cx-match" ${hasInt ? '' : 'disabled'}>☕ Find me a ${W.partner}</button>${hasInt ? '' : '<p class="meta">Save your interests in step 1 first.</p>'}`}
      <label class="switch-row cx-opt"><input type="checkbox" id="cx-roul" ${mine && mine.roulette ? 'checked' : ''}> I’m happy to be paired as a ${W.partner}</label>
    </section>` + (partner ? meBox : '');
    return partner;
  }
  async function meetups() {
    const { data: ms } = await db.from('cafe_meetups').select('*').eq('hub', sp).gte('starts_at', new Date(Date.now() - 3 * 3600e3).toISOString()).order('starts_at');
    const ids = (ms || []).map(m => m.id);
    const { data: rs } = ids.length ? await db.from('meetup_rsvps').select('*').in('meetup_id', ids) : { data: [] };
    body.innerHTML = `<div class="cx-head"><h2>Upcoming group meetups</h2><button type="button" class="btn btn-red" id="cx-new">+ Host a group meetup</button></div><p class="meta">⏰ When you say you’re going, you’ll get a reminder about an hour before, in your notifications and by email.</p>
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
            ${ON.messages && m.host_id && m.host_id !== uid ? `<a class="pill pill-soft" href="messages.html?with=${m.host_id}">✉️ Ask the host</a>` : ''}
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
  // ===== Parents: one Directory page (interests, partners, open to pairing, other parents) =====
  async function parentDir() {
    const [{ data: mine }, { data: dir }, { data: ms }, { data: rq }, { data: gs }] = await Promise.all([
      db.from('hub_profiles').select('*').eq('user_id', uid).eq('hub', sp).maybeSingle(),
      db.rpc('cafe_directory', { sp }),
      db.from('coffee_matches').select('user_a, user_b, week').eq('hub', sp).or(`user_a.eq.${uid},user_b.eq.${uid}`),
      db.from('parent_msg_requests').select('*').or(`from_id.eq.${uid},to_id.eq.${uid}`),
      db.from('parent_groups').select('id, name, owner_id')]);
    const people = (dir || []).filter(p => p.id !== uid);
    const partnerIds = new Set((ms || []).map(m => m.user_a === uid ? m.user_b : m.user_a));
    const reqs = rq || [];
    const incoming = reqs.filter(r => r.to_id === uid && r.status === 'pending');
    const status = p => {
      if (!ON.messages) return 'off';
      if (partnerIds.has(p.id) || p.roulette) return 'ok';
      if (reqs.some(r => r.from_id === p.id && r.to_id === uid && r.status === 'approved')) return 'ok';
      const out = reqs.find(r => r.from_id === uid && r.to_id === p.id);
      return out ? (out.status === 'approved' ? 'ok' : out.status) : 'ask';
    };
    const first = n => E((n || '').split(' ')[0] || 'them');
    const btn = p => ({ ok: `<a class="btn btn-red cx-hi" href="messages.html?with=${p.id}">✉️ Message ${first(p.full_name)}</a>`,
      ask: `<button type="button" class="btn btn-white cx-hi" data-pask="${p.id}">✉️ Ask to message ${first(p.full_name)}</button><span class="meta">${first(p.full_name)} will be asked to approve first.</span>`,
      pending: '<span class="tag tag-wait">⏳ Message request sent</span>', declined: '<span class="tag">Not taking messages just now</span>',
      off: `<a class="btn btn-white cx-hi" href="${cafePage}?ask=${encodeURIComponent(p.full_name || '')}">💬 Say hello in the café</a>` })[status(p)];
    const groupsOf = p => (gs || []).filter(g => g.owner_id === p.id);
    const card = p => `<article class="panel cx-person" data-text="${E([p.full_name, p.subject, p.can_help, p.want_learn].join(' ').toLowerCase())}">
        <span class="initials big">${E(ini(p.full_name))}</span><b>${E(p.full_name)}</b>
        ${p.can_help ? `<p class="cx-tag help">🙋 Can help with: ${E(p.can_help)}</p>` : ''}${p.want_learn ? `<p class="cx-tag learn">🌱 Would love to learn: ${E(p.want_learn)}</p>` : ''}
        ${groupsOf(p).length ? `<p class="meta">👥 Groups by ${first(p.full_name)}: ${groupsOf(p).map(g => `<a href="parent-group.html?id=${g.id}">${E(g.name)}</a>`).join(' · ')}</p>` : ''}
        <div class="cx-contact">${btn(p)}</div></article>`;
    const section = (title, sub, list, empty) => `<section class="pd-sec"><h2 class="hub-h">${title} <span class="meta">(${list.length})</span></h2><p class="meta">${sub}</p>
        <div class="cx-people">${list.length ? list.map(card).join('') : `<p class="empty">${empty}</p>`}</div></section>`;
    const partners = people.filter(p => partnerIds.has(p.id)), open = people.filter(p => !partnerIds.has(p.id) && p.roulette), rest = people.filter(p => !partnerIds.has(p.id) && !p.roulette);
    const nameOf = id => ((people.find(p => p.id === id) || {}).full_name) || 'A parent';
    body.innerHTML = (incoming.length ? `<section class="panel pd-inbox"><h3>✉️ Message requests</h3>${incoming.map(r => `<div class="pending-row"><span class="initials">${E(ini(nameOf(r.from_id)))}</span><div><b>${E(nameOf(r.from_id))}</b><span class="meta">would like to send you messages</span></div>
        <span class="req-actions"><button class="pill pill-live" data-pok="${r.id}">Approve</button><button class="pill pill-soft" data-pno="${r.id}">Decline</button></span></div>`).join('')}</section>` : '')
      + `<section class="panel cx-me"><h3>🌱 My interests</h3><p class="meta">Parents with similar interests can find you in the directory. Keep it to parenting, learning and growth topics, please.</p>
        <label>I can help with <input type="text" id="pd-help" maxlength="200" value="${E(mine && mine.can_help)}" placeholder="For example, healthy lunchboxes, budgeting, Arabic"></label>
        <label>I’d love to learn <input type="text" id="pd-learn" maxlength="200" value="${E(mine && mine.want_learn)}" placeholder="For example, photography, yoga, starting a small business"></label>
        <label class="switch-row"><input type="checkbox" id="pd-open" ${mine && mine.roulette ? 'checked' : ''}> I’m open to pairing (other parents can message me without asking first)</label>
        <div class="btns"><button type="button" class="btn btn-red" id="pd-save">Save</button>${ON.partners ? '<button type="button" class="btn btn-white" id="pd-match">☕ Find me a parent partner</button>' : ''}</div><p class="meta" style="margin-top:10px">Don’t want to be contacted any more? <button type="button" class="link-btn" id="pd-leave">Leave Parent Connections</button></p></section>
      <input type="search" id="cx-search" placeholder="Search by name or interest, for example: yoga" class="cx-search pd-search">`
      + section('🤝 ThinkNest Parent Partners', 'Parents you have been paired with.', partners, 'No partners yet. Tick “open to pairing” and tap “Find me a parent partner”.')
      + section('☕ ThinkNest Parents Open to Pairing', 'You can message these parents straight away.', open, 'No one else is open to pairing yet.')
      + section('👪 ThinkNest Parents', 'These parents are asked to approve before you can message them.', rest, 'No other parents yet.');
  }

  // ===== Parents: Parent Groups =====
  async function parentGroups() {
    const [{ data: gs }, { data: mm }] = await Promise.all([
      db.from('parent_groups').select('*').order('created_at', { ascending: false }),
      db.from('parent_group_members').select('group_id, status').eq('user_id', uid)]);
    const st = {}; (mm || []).forEach(m => st[m.group_id] = m.status);
    const all = gs || [], mineG = all.filter(g => st[g.id] === 'active'), other = all.filter(g => st[g.id] !== 'active');
    const tile = g => `<article class="panel cx-person pg-tile" data-text="${E([g.name, g.about, g.owner_name].join(' ').toLowerCase())}"><span class="initials big">${E(ini(g.name))}</span><b>${E(g.name)}</b>
        <span class="meta">Started by ${E(g.owner_name || 'a parent')}</span>${g.about ? `<p>${E(g.about)}</p>` : ''}
        <div class="cx-contact">${st[g.id] === 'active' ? `<a class="btn btn-red" href="parent-group.html?id=${g.id}">Open group →</a>` : st[g.id] === 'pending' ? '<span class="tag tag-wait">⏳ Waiting for the host to approve</span>' : `<button type="button" class="btn btn-white" data-pjoin="${g.id}">Ask to join</button>`}</div></article>`;
    body.innerHTML = `<div class="cx-head"><h2>👥 Parent groups</h2><button type="button" class="btn btn-red" id="pg-new">+ Create a group</button></div>
      <p class="meta">Keep the conversation going after a meetup or workshop, or start a group for parents who share an interest. The person who starts a group approves who joins.</p>
      <form class="panel auth-form" id="pg-form" hidden>
        <label>Group name <input name="name" maxlength="80" required placeholder="For example, Reading together: Year 2 parents"></label>
        <label>What’s it about? (optional) <textarea name="about" rows="2" maxlength="600" placeholder="For example, for parents who came to the Sunday reading workshop"></textarea></label>
        <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" id="pg-cancel">Cancel</button><button class="btn btn-red auth-btn">Create group</button></div></form>
      <h2 class="hub-h">My groups</h2><div class="cx-people">${mineG.length ? mineG.map(tile).join('') : '<p class="empty">You’re not in a group yet.</p>'}</div>
      <h2 class="hub-h">Groups you can join</h2><input type="search" id="cx-search" placeholder="Search groups" class="cx-search pd-search">
      <div class="cx-people">${other.length ? other.map(tile).join('') : '<p class="empty">No other groups yet. Why not start one?</p>'}</div>`;
  }

  if (P) box.addEventListener('click', async e => {
    const t = e.target;
    if (t.id === 'pd-leave') {
      if (!confirm('Leave Parent Connections? You’ll be taken out of the directory, pairing will stop, and other parents won’t be able to contact you through it. You can join again any time.')) return;
      const { error } = await db.from('hub_profiles').upsert({ user_id: uid, hub: sp, listed: false, roulette: false, opted_out_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (error) return say(friendly(error));
      say('You’ve left Parent Connections.'); return location.reload();
    }
    if (t.id === 'pd-save' || t.id === 'pd-match') {
      const help = document.getElementById('pd-help').value.trim(), learn = document.getElementById('pd-learn').value.trim(), open = document.getElementById('pd-open').checked;
      if (!help && !learn) return say('Write at least one thing you can help with or would love to learn.');
      const { error } = await db.from('hub_profiles').upsert({ user_id: uid, hub: sp, can_help: help, want_learn: learn, roulette: open || t.id === 'pd-match', updated_at: new Date().toISOString() });
      if (error) return say(friendly(error));
      if (t.id === 'pd-save') { say('Saved. ☕'); return draw(); }
      t.disabled = true; t.textContent = 'Finding a parent partner…';
      const { data, error: er } = await db.rpc('coffee_match_me', { sp });
      if (er) { t.disabled = false; t.textContent = '☕ Find me a parent partner'; return say(friendly(er)); }
      say((data || []).length ? '🎉 You have a new parent partner! They’re under ThinkNest Parent Partners.' : 'No one is free to pair just now. You’re on the list, so you’ll be paired when another parent joins in. ☕');
      return draw();
    }
    const a = t.closest('[data-pask]');
    if (a) { a.disabled = true; const { error } = await db.from('parent_msg_requests').insert({ to_id: a.dataset.pask }); if (error) { a.disabled = false; return say(/relation|does not exist/i.test(error.message || '') ? 'Please run the latest Supabase update (parent_connections.sql) first.' : friendly(error)); } say('Request sent. You’ll get a notification when they say yes.'); return draw(); }
    const ok = t.closest('[data-pok], [data-pno]');
    if (ok) { const yes = !!ok.dataset.pok; const { error } = await db.from('parent_msg_requests').update({ status: yes ? 'approved' : 'declined' }).eq('id', Number(ok.dataset.pok || ok.dataset.pno)); if (error) return say(friendly(error)); say(yes ? 'Approved. They can message you now.' : 'Request declined.'); return draw(); }
    if (t.id === 'pg-new') { document.getElementById('pg-form').hidden = false; return; }
    if (t.id === 'pg-cancel') { document.getElementById('pg-form').hidden = true; return; }
    const j = t.closest('[data-pjoin]');
    if (j) { j.disabled = true; const { error } = await db.from('parent_group_members').insert({ group_id: Number(j.dataset.pjoin), user_id: uid }); if (error) { j.disabled = false; return say(friendly(error)); } say('Request sent. The host will approve you.'); return draw(); }
  });
  if (P) box.addEventListener('submit', async e => {
    if (e.target.id !== 'pg-form') return; e.preventDefault();
    const f = e.target, name = f.name.value.trim(); if (name.length < 2) return say('Give your group a name.');
    const { data, error } = await db.from('parent_groups').insert({ name, about: f.about.value.trim() || null }).select('id').single();
    if (error) return say(/relation|does not exist/i.test(error.message || '') ? 'Please run the latest Supabase update (parent_connections.sql) first.' : friendly(error));
    location.href = 'parent-group.html?id=' + data.id;
  });
  async function draw() {
    document.querySelectorAll('[data-cx]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.cx === tab)));
    body.innerHTML = '<p class="empty">Loading…</p>';
    await ({ roulette, meetups, people: P ? parentDir : people, groups: parentGroups })[tab]();
  }
  box.addEventListener('click', async e => {
    if (e.target.id === 'cx-code-link') { e.preventDefault(); alert('Code of conduct\n\n• Keep it professional and respectful.\n• No personal, romantic or private invitations, and no comments about appearance.\n• Don’t share personal contact details or social media.\n• Meet in groups, online or in a public place. Never at home.\n• Messages may be reviewed by Think Nest.\n• Report anything that makes you uncomfortable.'); return; }
    const t = e.target.closest('[data-cx]'); if (t) { tab = t.dataset.cx; history.replaceState(null, '', '#' + tab); return draw(); }
    if (e.target.id === 'cx-match') {
      e.target.disabled = true; e.target.textContent = 'Finding a ' + W.partner + '…';
      const { data, error } = await db.rpc('coffee_match_me', { sp });
      if (error) { e.target.disabled = false; e.target.textContent = '☕ Find me a ' + W.partner; return say(friendly(error)); }
      if (!(data || []).length) { say('No one is free to pair just now. You’re on the list, so you’ll be paired when another ' + W.colleague + ' joins in. ☕'); return roulette(); }
      const pr = await roulette(); say(pr ? '☕ You have been paired with ' + pr.full_name + '! Say hello using the message button.' : '☕ Paired! Your ' + W.partner + ' is shown on this page.'); return;
    }
    if (e.target.id === 'cx-save') {
      const help = document.getElementById('cx-help').value.trim(), learn = document.getElementById('cx-learn').value.trim();
      if (!help && !learn) return say('Write at least one thing you can help with or would love to learn.');
      const { error } = await db.from('hub_profiles').upsert({ user_id: uid, hub: sp, can_help: help, want_learn: learn, roulette: document.getElementById('cx-roul').checked, updated_at: new Date().toISOString() });
      if (error) return say(friendly(error));
      say('Interests saved. ☕'); return roulette();
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
