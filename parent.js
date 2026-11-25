// ===== Think Nest parent area =====
// Uses db, say(), friendly(), esc(), when(), relative(), showError() from app.js

const COUNTRIES = ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Egypt', 'Jordan', 'Lebanon', 'Morocco', 'India', 'Pakistan', 'United Kingdom', 'United States', 'Other'];
function fillCountries(sel, value) {
  sel.innerHTML = '<option value="">Select country</option>' + COUNTRIES.map(c => `<option${c === value ? ' selected' : ''}>${c}</option>`).join('');
}
const ini = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

// ---------- Sign up ----------
function startParentSignup() {
  const f = document.getElementById('psignup-form'), err = document.getElementById('psignup-error');
  fillCountries(f.country, 'United Arab Emirates');
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    for (const el of f.querySelectorAll('input[required], select[required]')) {
      if (!el.checkValidity()) { el.focus(); return showError(err, el.type === 'password' ? 'Choose a password with at least 8 characters.' : el.type === 'email' ? 'Enter a valid email address.' : 'Please fill in every required box.'); }
    }
    if (f.password.value !== f.password2.value) { f.password2.focus(); return showError(err, 'The two passwords don’t match.'); }
    if (typeof famValidate === 'function') { const fe = famValidate(); if (fe) return showError(err, fe); }
    if (f.agree_terms && !f.agree_terms.checked) return showError(err, 'Please tick the box to agree to the Terms of use.');
    const kids = typeof famCollect === 'function' ? famCollect() : [];
    const joined = (f.querySelector('input[name=family_joined]:checked') || {}).value !== 'no';
    if (typeof captchaMissing === 'function' && captchaMissing()) return showError(err, CAPTCHA_MSG);
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Creating account…';
    const { data, error } = await db.auth.signUp({
      email: f.email.value.trim(), password: f.password.value,
      options: { captchaToken: (typeof captchaToken === 'function' ? captchaToken() : undefined), data: { role: 'parent', full_name: (f.first.value.trim() + ' ' + f.last.value.trim()).trim(), phone: f.phone.value.trim(), country: f.country.value, children: kids, family_joined: joined, agreed_terms: true, lang: (typeof tnLang === 'function' ? tnLang() : 'en') } }
    });
    if (typeof captchaReset === 'function') captchaReset();
    btn.disabled = false; btn.textContent = 'Continue';
    if (error) return showError(err, friendly(error));
    if (alreadyRegistered(data)) { if (typeof btn !== 'undefined' && btn) { btn.disabled = false; } return showError(err, ALREADY_MSG); }
    emailAdmin('New parent account waiting for approval', { Name: (f.first.value.trim() + ' ' + f.last.value.trim()).trim(), Email: f.email.value.trim(), Account: 'Parent', Children: kids.map(k => k.name + (k.grade ? ' (' + k.grade + ')' : '')).join(', '), 'Joined family account': joined ? 'Yes' : 'No', 'What to do': 'Log in as admin and open Approvals → New accounts.' });
    if (data.session) location.href = 'pending.html';
    else f.innerHTML = '<div class="note big-note"><b>Almost done! 🎉</b><br>Your account has been created. The Think Nest team will check and approve it, usually within one working day. We’ve also sent an email to <b>' + esc(f.email.value.trim()) + '</b> with a link to confirm your address (check spam too).</div><a class="btn btn-red auth-btn" href="parent-login.html">Go to log in</a>';
  });
}

// ---------- Shared: must be a logged-in parent ----------
async function initParent() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'parent-login.html'; throw new Error('not logged in'); }
  const { data: me } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!me || !(['parent', 'admin'].includes(me.role) || (me.also_parent && ['teacher', 'school_leader'].includes(me.role)))) { location.href = me && ['teacher', 'school_leader'].includes(me.role) ? 'teacher-settings.html#also-parent' : 'student-dashboard.html'; throw new Error('not a parent'); }
  gateApproval(me);
  document.body.classList.remove('loading');
  const side = document.getElementById('side'), shade = document.getElementById('side-shade'), st = document.getElementById('side-toggle');
  if (st) {
    st.addEventListener('click', () => { side.classList.add('open'); shade.classList.add('show'); });
    shade.addEventListener('click', () => { side.classList.remove('open'); shade.classList.remove('show'); });
  }
  const lo = document.getElementById('logout');
  if (lo) lo.addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  const s = document.getElementById('me-initials-small'); if (s) s.textContent = ini(me.full_name || session.user.email);
  return { user: session.user, me };
}

async function loadChildren(uid) {
  const { data: links } = await db.from('parent_links').select('student_id').eq('parent_id', uid);
  const ids = (links || []).map(l => l.student_id);
  if (!ids.length) return [];
  const { data } = await db.from('profiles').select('*').in('id', ids);
  return data || [];
}

async function pendingRequests(box) {
  const { data } = await db.rpc('my_child_requests');
  const rows = data || [];
  const kidAsks = rows.filter(r => r.asked_by === 'child' && r.status === 'pending'), mine = rows.filter(r => r.asked_by !== 'child');
  box.id = box.id || 'pending';
  box.innerHTML = (kidAsks.length ? '<h3>👪 Children asking to join your family</h3><p class="meta">They used your family code. Only confirm children you know. Nothing about them is shared with you until you confirm.</p>' + kidAsks.map(r => `<div class="pending-row" data-kreq="${r.id}">
      <span class="initials">${esc(ini(r.child_name))}</span>
      <div><b>${esc(r.child_name || 'A child')}</b><span class="meta">${esc(r.child_info || '')}${r.child_info ? ' · ' : ''}asked ${new Date(r.created_at).toLocaleDateString('en-GB')}</span></div>
      <div class="req-actions"><button class="pill pill-live" data-kok="1">Yes, this is my child</button><button class="pill pill-soft" data-kok="0">No, not my child</button></div></div>`).join('') : '')
    + (mine.length ? '<h3>Requests waiting for your child</h3>' + mine.map(r => `<div class="pending-row">
      <span class="initials">${esc(ini(r.child_name))}</span>
      <div><b>${esc(r.child_name || 'Your child')}</b><span class="meta">${r.status === 'declined' ? 'Declined. Check with your child, then send again.' : 'Waiting for your child to approve. Sent ' + new Date(r.created_at).toLocaleDateString('en-GB') + '.'}</span></div>
      <span class="tag ${r.status === 'declined' ? '' : 'tag-wait'}">${r.status === 'declined' ? 'Declined' : 'Waiting'}</span></div>`).join('') : '');
  box.onclick = async e => {
    const b = e.target.closest('[data-kok]'); if (!b) return;
    const row = b.closest('[data-kreq]'), yes = b.dataset.kok === '1', nm = row.querySelector('b').textContent;
    if (yes && !confirm(`Confirm that ${nm} is your child? They'll be linked to your account and you'll see their courses and progress.`)) return;
    row.querySelectorAll('button').forEach(x => x.disabled = true);
    const { error } = await db.rpc('parent_answer_child', { req: Number(row.dataset.kreq), ok: yes });
    if (error) { row.querySelectorAll('button').forEach(x => x.disabled = false); return say(/function|schema cache/i.test(error.message || '') ? 'Please run the latest Supabase update (family privacy) first.' : friendly(error)); }
    say(yes ? '✅ ' + nm + ' is now linked to your account.' : 'Thanks. ' + nm + ' has been told to check the code.');
    setTimeout(() => location.reload(), 900);
  };
}

// ---------- The parent's own family code (a child types it to join the family) ----------
async function parentFamilyCode(box) {
  if (!box) return;
  const { data: code, error } = await db.rpc('my_parent_family_code', { renew: false });
  if (error) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<div class="panel family" style="margin-top:14px"><h3 style="margin:0 0 6px">👪 Your family code</h3>
      <p class="code" data-fcode>${esc(code)}</p>
      <p class="meta">Give this code to your child. They type it when they <b>sign up</b> (Sign up → Student), or later in <b>Account Settings → Join your parent’s family</b>. You’ll then be asked to confirm it’s your child. Only share it with your own children.</p>
      <button type="button" class="pill pill-soft" data-fnew>Make a new code</button></div>`;
  box.querySelector('[data-fnew]').onclick = async () => {
    if (!confirm('Make a new code? The old code will stop working. Children already linked stay linked.')) return;
    const { data: c2, error: e2 } = await db.rpc('my_parent_family_code', { renew: true });
    if (e2) return say(friendly(e2));
    box.querySelector('[data-fcode]').textContent = c2; say('New family code made.');
  };
}

// ---------- Dashboard: children cards + Add New Child ----------
async function startParentDashboard() {
  const { user, me } = await initParent();
  document.getElementById('me-initials').textContent = ini(me.full_name || user.email);
  document.getElementById('me-name').textContent = 'Welcome, ' + ((me.full_name || '').split(' ')[0] || 'parent');
  document.getElementById('me-sub').textContent = ['Parent', me.country].filter(Boolean).join(' · ');

  const auto = await db.rpc('auto_request_children');
  if (auto.data > 0) say('We found ' + auto.data + (auto.data === 1 ? ' child who' : ' children who') + ' listed your email, and sent them a request to approve.');

  const kids = await loadChildren(user.id);
  const colours = ['kc-pink', 'kc-yellow', 'kc-green', 'kc-blue'];
  document.getElementById('kid-cards').innerHTML = kids.map((k, i) => `<a class="kid-card ${colours[i % colours.length]}" href="child.html?id=${k.id}">
      <span class="initials big2">${esc(ini(k.full_name))}</span>
      <span><b>${esc(k.full_name || 'Student')}</b><span>${esc(k.curriculum || k.grade || 'Student')}</span></span></a>`).join('')
    + `<a class="kid-card kc-add" href="add-child.html"><span class="plus" aria-hidden="true">+</span><span><b>Add New Child</b></span></a>`;
  if (kids.length) document.getElementById('kid-cards').insertAdjacentHTML('afterend', '<p style="margin:10px 0 0"><a class="btn btn-red" href="parent-courses.html">📚 Find classes for my children</a></p>');
  pendingRequests(document.getElementById('pending'));
  parentFamilyCode(document.getElementById('parent-fcode'));

  // This week, for all children
  if (!kids.length) return;
  const ids = kids.map(k => k.id);
  parentAttention(kids);
  const [en, bk] = await Promise.all([
    db.from('enrollments').select('user_id, course_id').in('user_id', ids),
    db.from('bookings').select('*, mentors(name)').in('user_id', ids).neq('status', 'cancelled').gte('starts_at', new Date().toISOString()).order('starts_at').limit(10)
  ]);
  const courseIds = [...new Set((en.data || []).map(e => e.course_id))];
  const ses = courseIds.length ? ((await db.from('sessions').select('*, courses(title)').in('course_id', courseIds).gte('starts_at', new Date(Date.now() - 3600000).toISOString()).order('starts_at').limit(10)).data || []) : [];
  const nameOf = id => (kids.find(k => k.id === id) || {}).full_name || 'Your child';
  const events = [
    ...ses.map(s => ({ at: new Date(s.starts_at), title: s.title, sub: (s.courses ? s.courses.title : 'Live class') + ' · ' + (en.data || []).filter(e => e.course_id === s.course_id).map(e => nameOf(e.user_id).split(' ')[0]).join(', '), kind: 'class' })),
    ...(bk.data || []).map(b => ({ at: new Date(b.starts_at), title: 'Mentor session with ' + (b.mentors ? b.mentors.name : 'a mentor'), sub: nameOf(b.user_id), kind: 'book' }))
  ].sort((a, b) => a.at - b.at).slice(0, 8);
  document.getElementById('family-week').innerHTML = '<h2 class="dash-h">Coming up for your children</h2><section class="event-list">' + (events.length ? events.map(e => {
    const [rel, live] = relative(e.at);
    return `<article class="event ev-${e.kind}"><div><h4>${esc(e.title)}</h4><span class="meta">${esc(e.sub)}</span><span class="when">${esc(when(e.at))}</span></div><div class="event-actions"><span class="tag ${live ? 'tag-now' : ''}">${rel}</span></div></article>`;
  }).join('') : '<p class="empty">Nothing scheduled.</p>') + '</section>';
}

// ---------- One child's profile ----------
async function startChild() {
  const { user } = await initParent();
  const kidId = new URLSearchParams(location.search).get('id');
  const { data: k } = await db.from('profiles').select('*').eq('id', kidId).maybeSingle();
  if (!k) { document.querySelector('main').innerHTML = '<div class="empty-box"><p>This child isn’t linked to your account.</p><a class="btn btn-red" href="parent-dashboard.html">Back to my children</a></div>'; return; }
  const first = (k.full_name || 'Your child').split(' ')[0];
  document.title = k.full_name + ' – Think Nest';
  document.getElementById('kid-initials').textContent = ini(k.full_name);
  document.getElementById('kid-name').textContent = k.full_name || 'Student';
  document.getElementById('kid-badge').textContent = k.curriculum || 'Student';
  document.getElementById('kid-sub').textContent = [k.grade, k.school].filter(Boolean).join(' · ');
  document.getElementById('kid-title').textContent = first + '’s profile';
  document.getElementById('h-certs').textContent = first + '’s achievements';

  const [en, bk, ce] = await Promise.all([
    db.from('enrollments').select('*, courses(id, title, teacher_name, weeks)').eq('user_id', kidId).order('created_at'),
    db.from('bookings').select('*, mentors(name)').eq('user_id', kidId).neq('status', 'cancelled').gte('starts_at', new Date().toISOString()).order('starts_at'),
    db.from('certificates').select('*, courses(title)').eq('user_id', kidId).order('issued_at', { ascending: false })
  ]);
  const enr = en.data || [], books = bk.data || [], certs = ce.data || [];
  const courseIds = enr.map(e => e.course_id);
  const ses = courseIds.length ? ((await db.from('sessions').select('*, courses(title)').in('course_id', courseIds).gte('starts_at', new Date(Date.now() - 3600000).toISOString()).order('starts_at').limit(10)).data || []) : [];

  document.getElementById('k-certs').textContent = certs.length;
  document.getElementById('k-courses').textContent = enr.length;
  document.getElementById('k-mentor').textContent = books.length;
  document.getElementById('k-avg').textContent = enr.length ? Math.round(enr.reduce((s, e) => s + e.progress, 0) / enr.length) + '%' : '0%';

  document.getElementById('k-course-list').innerHTML = enr.length ? enr.map(e => `<article class="panel kid-course">
      <div><h4>${esc(e.courses ? e.courses.title : 'Course')}</h4><span class="meta">${e.courses && e.courses.teacher_name ? 'With ' + esc(e.courses.teacher_name) + ' · ' : ''}Joined ${new Date(e.created_at).toLocaleDateString('en-GB')}</span></div>
      <div class="kid-bar"><div class="bar"><i style="width:${e.progress}%"></i></div><b>${e.progress}%</b></div></article>`).join('')
    : '<p class="empty">Not on any courses yet.</p>';
  // a parent can take their child off a course
  document.getElementById('k-course-list').querySelectorAll('.kid-course').forEach((el, i) => {
    const e = enr[i]; if (!e) return;
    el.insertAdjacentHTML('beforeend', `<button type="button" class="link-btn" data-leave="${e.course_id}">Leave this course</button>`);
  });
  document.getElementById('k-course-list').onclick = async ev => {
    const b = ev.target.closest('[data-leave]'); if (!b) return;
    const why = prompt('Take ' + (k.full_name || 'your child') + ' off this course? Their place will be offered to the next student.\n\nReason (optional, the teacher will see it):', '');
    if (why === null) return;
    const { error } = await db.rpc('leave_course', { cid: Number(b.dataset.leave), kid: kidId, reason: why.trim() || null });
    if (error) return say(friendly(error));
    say('Done. The teacher has been told.'); location.reload();
  };

  const events = [
    ...ses.map(s => ({ at: new Date(s.starts_at), title: s.title, sub: s.courses ? s.courses.title : 'Live class', kind: 'class' })),
    ...books.map(b => ({ at: new Date(b.starts_at), title: 'Mentor session with ' + (b.mentors ? b.mentors.name : 'a mentor'), sub: b.note || '', kind: 'book' }))
  ].sort((a, b) => a.at - b.at);
  document.getElementById('k-events').innerHTML = events.length ? events.map(e => {
    const [rel, live] = relative(e.at);
    return `<article class="event ev-${e.kind}"><div><h4>${esc(e.title)}</h4><span class="meta">${esc(e.sub)}</span><span class="when">${esc(when(e.at))}</span></div><div class="event-actions"><span class="tag ${live ? 'tag-now' : ''}">${rel}</span></div></article>`;
  }).join('') : '<p class="empty">Nothing scheduled.</p>';

  document.getElementById('k-cert-list').innerHTML = certs.length ? certs.map(c => `<article class="cert panel"><span class="cert-ic" aria-hidden="true">🏅</span><h4>${esc(c.title)}</h4>
      <span class="meta">${esc(c.courses ? c.courses.title : '')}${c.issued_at ? ' · ' + new Date(c.issued_at).toLocaleDateString('en-GB') : ''}</span>
      ${c.file_path ? `<button class="pill pill-soft big" data-file="${esc(c.file_path)}">Download ↓</button>` : ''}</article>`).join('')
    : '<p class="empty">No certificates yet.</p>';
  if (typeof childCertificates === 'function') childCertificates(kidId, 'k-cert-list');
  document.getElementById('k-cert-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-file]'); if (!b) return;
    const { data, error } = await db.storage.from('certificates').createSignedUrl(b.dataset.file, 600);
    if (error) return say(friendly(error));
    window.open(data.signedUrl, '_blank', 'noopener');
  });
  if (typeof childActivities === 'function') childActivities(kidId);
  if (typeof attendanceOverviewFor === 'function') attendanceOverviewFor(kidId, 'k-att');
  if (typeof getRewards === 'function') getRewards(kidId).then(s => { const b = document.getElementById('k-rewards'); if (b) b.innerHTML = s ? rewardMiniHtml(s, { link: false }) + `<details class="rw-kid-badges"><summary>Badges (${s.badges.filter(x => x.earned).length})</summary><div class="rw-badges small">${s.badges.filter(x => x.earned).map(x => `<div class="rw-badge on"><span>${x.ic}</span><b>${esc(x.name)}</b></div>`).join('') || '<p class="meta">No badges yet.</p>'}</div></details>` : '<p class="meta">No rewards yet.</p>'; });
  const fr = await db.rpc('child_friends', { kid: kidId });
  const friends = fr.data || [];
  document.getElementById('k-friends').innerHTML = friends.length ? friends.map(f => `<div class="panel friend"><span class="initials">${esc(ini(f.full_name))}</span><div><b>${esc(f.full_name)}</b><span class="meta">${esc([f.grade, f.school].filter(Boolean).join(' · '))}</span><span class="meta">Friends since ${new Date(f.since).toLocaleDateString('en-GB')}</span></div></div>`).join('') : '<p class="empty">No friends added yet.</p>';
  const gr = await db.rpc('child_groups', { kid: kidId });
  const gs = gr.data || [];
  document.getElementById('k-groups').innerHTML = gs.length ? gs.map(g => `<div class="panel group-card"><b>${esc(g.name)}</b><span class="meta">${g.members} member${g.members === 1 ? '' : 's'}</span></div>`).join('') : '<p class="empty">Not in any study groups yet.</p>';
  const cv = await db.rpc('child_conversations', { kid: kidId });
  const chats = cv.data || [];
  document.getElementById('k-chats').innerHTML = (chats.length ? '<p class="meta">To keep every family’s privacy, you see who your child talks to and any messages that were reported, not the messages themselves. If you’re worried, use “Tell a trusted adult” or contact Think Nest.</p>' + chats.map(c => `<div class="pending-row"><span class="initials">${c.kind === 'group' ? '👥' : esc(ini(c.title))}</span><div><b>${c.kind === 'group' ? 'Group chat: ' : 'Chat with '}${esc(c.title || '')}</b><span class="meta">${c.messages} message${c.messages === 1 ? '' : 's'}${c.last_at ? ' · last ' + new Date(c.last_at).toLocaleDateString('en-GB') : ''}</span></div>${c.reported ? `<span class="tag">⚠️ ${c.reported} reported</span>` : '<span class="tag">No reports</span>'}</div>`).join('') : '<p class="empty">No chats yet.</p>');
  // mentor sessions, each with its shared thread (summaries from the mentor appear here)
  if (typeof childSessions === 'function') { let sh = document.getElementById('k-sessions'); if (!sh) { sh = document.createElement('section'); sh.id = 'k-sessions'; const kc = document.getElementById('k-chats'); (kc.closest('section') || kc.parentElement).after(sh); } childSessions(kidId, sh); }
  { const ul = document.getElementById('unlink'); if (ul) { const hb = document.createElement('details'); hb.style.marginTop = '12px'; ul.before(hb);
    db.rpc('my_family_history', { kid: kidId }).then(({ data: hs }) => { if (!(hs || []).length) { hb.remove(); return; }
      hb.innerHTML = '<summary><b>Family history</b></summary><ul class="meta" style="margin:8px 0 0;padding-left:18px">' + hs.map(h => `<li>${new Date(h.at).toLocaleDateString('en-GB')}: ${esc(h.who || 'A parent')} ${h.event === 'linked' ? 'linked' : 'removed'} (by ${esc(h.by_whom)})</li>`).join('') + '</ul>'; }); } }
  document.getElementById('unlink').addEventListener('click', async () => {
    if (!confirm('Remove ' + (k.full_name || 'this child') + ' from your parent account? You can add them again later.')) return;
    const { error } = await db.from('parent_links').delete().eq('parent_id', user.id).eq('student_id', kidId);
    if (error) return say(friendly(error));
    location.href = 'parent-dashboard.html';
  });
}

// ---------- Add New Child ----------
async function startAddChild() {
  await initParent();
  const box = document.getElementById('pending');
  pendingRequests(box);
  parentFamilyCode(document.getElementById('parent-fcode'));
  // a brand-new child: add them to the family, then make their username login
  const nk = document.getElementById('new-kid-form');
  if (nk && typeof FAM_GRADES !== 'undefined') {
    nk.addEventListener('submit', async e => {
      e.preventDefault();
      const name = nk.name.value.trim();
      if (!name) return say('Type your child’s full name.');
      if (!nk.grade.value) return say('Choose your child’s grade.');
      const b = nk.querySelector('button'); b.disabled = true;
      const { error } = await db.rpc('add_family_child', { cname: name, cgrade: nk.grade.value, ccurr: nk.curriculum.value, cemail: '' });
      if (error) { b.disabled = false; return say(friendly(error)); }
      const { data: { session } } = await db.auth.getSession();
      const { data: fc } = await db.from('family_children').select('id').eq('parent_id', session.user.id).eq('full_name', name).is('student_id', null).order('id', { ascending: false }).limit(1).maybeSingle();
      b.disabled = false;
      if (!fc) return say('Added. Open My children to finish your child’s login.');
      nk.reset();
      famUsernameDialog(fc.id, name, () => { location.href = 'parent-courses.html'; });
    });
  }
  const ef = document.getElementById('email-form'), eerr = document.getElementById('email-error');
  ef.addEventListener('submit', async e => {
    e.preventDefault(); showError(eerr, '');
    if (!ef.email.checkValidity()) return showError(eerr, 'Enter a valid email address.');
    const btn = ef.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending…';
    const { data, error } = await db.rpc('request_child', { child_email: ef.email.value });
    btn.disabled = false; btn.textContent = 'Add';
    if (error) return showError(eerr, friendly(error));
    ef.reset();
    say(data === 'linked' ? 'This child is already linked to your account.' : 'Request sent. Ask your child to log in and tap Approve.');
    pendingRequests(box);
  });
  const lf = document.getElementById('link-form'), lerr = document.getElementById('link-error');
  lf.addEventListener('submit', async e => {
    e.preventDefault(); showError(lerr, '');
    const btn = lf.querySelector('button'); btn.disabled = true;
    const { data, error } = await db.rpc('request_child_by_code', { code: lf.code.value.trim() });
    btn.disabled = false;
    if (error) return showError(lerr, /NO_SUCH_CODE/.test(error.message || '') ? 'We couldn’t find that family code. Check it with your child and try again.' : friendly(error));
    lf.reset();
    say(data === 'linked' ? 'This child is already linked to your account.' : 'Request sent. Ask your child to log in and tap Approve.');
    pendingRequests(box);
  });
}

// ---------- Settings ----------
async function startParentSettings() {
  const { user, me } = await initParent();
  const f = document.getElementById('pprofile-form');
  const parts = (me.full_name || '').split(' ');
  f.first.value = parts.shift() || ''; f.last.value = parts.join(' ');
  fillCountries(f.country, me.country || '');
  f.phone.value = me.phone || ''; f.email.value = user.email;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await db.from('profiles').update({ full_name: (f.first.value.trim() + ' ' + f.last.value.trim()).trim(), country: f.country.value || null, phone: f.phone.value.trim() || null }).eq('id', user.id);
    say(error ? friendly(error) : 'Your details are saved.');
  });
  const pf = document.getElementById('pw-form'), err = document.getElementById('pw-error');
  pf.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    if (pf.password.value.length < 8) return showError(err, 'Choose a password with at least 8 characters.');
    if (pf.password.value !== pf.password2.value) return showError(err, 'The two passwords don’t match.');
    const { error } = await db.auth.updateUser({ password: pf.password.value });
    if (error) return showError(err, friendly(error));
    pf.reset(); say('Your password has been changed.');
  });
}


// ---------- Parent: one box for everything that needs a parent's answer ----------
async function parentAttention(kids) {
  const host = document.getElementById('kid-cards'); if (!host) return;
  const ids = kids.map(k => k.id), name = id => ((kids.find(k => k.id === id) || {}).full_name || 'Your child').split(' ')[0];
  const items = [];
  try {
    const { data: rq } = await db.from('course_requests').select('id, student_id, status, parent_token, courses(title)').in('student_id', ids).eq('status', 'parent');
    (rq || []).forEach(r => items.push(`<a class="pending-row" href="parent-approve.html?t=${r.parent_token}"><span>📘</span><div><b>${esc(name(r.student_id))} wants to join “${esc(r.courses ? r.courses.title : 'a course')}”</b><span class="meta">Please agree or say no</span></div><span class="pill pill-live">Answer</span></a>`));
  } catch (_) {}
  try {
    const { data: bk } = await db.from('bookings').select('id, user_id, starts_at, parent_ok, parent_token, mentors(name)').in('user_id', ids).eq('parent_ok', false).neq('status', 'cancelled').gte('starts_at', new Date().toISOString());
    (bk || []).forEach(b => items.push(`<a class="pending-row" href="parent-booking.html?t=${b.parent_token}"><span>🧑‍🏫</span><div><b>${esc(name(b.user_id))} asked for a mentor session with ${esc(b.mentors ? b.mentors.name : 'a mentor')}</b><span class="meta">${esc(when(b.starts_at))}</span></div><span class="pill pill-live">Answer</span></a>`));
  } catch (_) {}
  try {
    const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const { data: at } = await db.from('attendance').select('student_id, status, day, course_id, group_id').in('student_id', ids).in('status', ['absent', 'late']).gte('day', since).order('day', { ascending: false }).limit(10);
    (at || []).forEach(a => items.push(`<a class="pending-row" href="child.html?id=${a.student_id}"><span>${a.status === 'absent' ? '❌' : '⏰'}</span><div><b>${esc(name(a.student_id))} was ${a.status} on ${new Date(a.day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b><span class="meta">See attendance</span></div></a>`));
  } catch (_) {}
  if (!items.length) return;
  host.insertAdjacentHTML('beforebegin', `<section class="panel attention" id="attention"><h2 class="dash-h">👀 Needs your attention <span class="count">${items.length}</span></h2><div class="approve-list">${items.join('')}</div></section>`);
}


// ---------- Classes for my children: the teachers' courses, matched to each child ----------
async function startParentCourses() {
  const { user } = await initParent();
  const kids = await loadChildren(user.id);
  const kbox = document.getElementById('pc-kids'), list = document.getElementById('pc-list'), mineBox = document.getElementById('pc-mine');
  if (!kids.length) { kbox.innerHTML = '<div class="panel"><p>Add your child first, then you can choose classes for them.</p><a class="btn btn-red" href="add-child.html">➕ Add a child</a></div>'; return; }
  const { data: cs, error } = await db.from('courses').select('*').eq('published', true).order('id');
  if (error) { list.innerHTML = '<p class="empty">The classes couldn’t be loaded. Please try again.</p>'; return; }
  const courses = (cs || []).filter(c => (c.audience || 'students') === 'students');
  const ids = kids.map(k => k.id);
  const [{ data: en }, rq] = await Promise.all([
    db.from('enrollments').select('user_id, course_id, time_slot').in('user_id', ids),
    db.from('course_requests').select('student_id, course_id, status').in('student_id', ids).in('status', ['parent', 'teacher'])
  ]);
  const has = (kid, cid) => (en || []).find(e => e.user_id === kid && e.course_id === cid);
  const asked = (kid, cid) => ((rq && rq.data) || []).find(r => r.student_id === kid && r.course_id === cid);
  const curOf = v => /british|igcse|england/i.test(v || '') ? 'british' : /american/i.test(v || '') ? 'american' : /\bib\b|baccalaureate/i.test(v || '') ? 'ib' : null;
  const gradeLabel = (g, cur) => !g || g === 'all' ? 'All grades' : cur === 'british' && typeof tnYearLabel === 'function' ? tnYearLabel(g) : g;
  const fits = (c, k) => (!c.curriculum || c.curriculum === 'all' || /^arabic_/.test(c.curriculum) || c.curriculum === curOf(k.curriculum)) && (!c.grade || c.grade === 'all' || c.grade === k.grade);
  const pick = new URLSearchParams(location.search).get('kid');
  let cur = kids.find(k => k.id === pick) || kids[0];
  const q = document.getElementById('pc-q'), all = document.getElementById('pc-all');
  document.getElementById('pc-filters').hidden = false;
  const first = n => String(n || 'My child').split(' ')[0];
  function draw() {
    kbox.innerHTML = '<p class="meta" style="margin:0 0 6px">Classes for:</p>' + kids.map(k => `<button type="button" class="pill ${k.id === cur.id ? 'pill-live' : 'pill-soft'}" data-k="${k.id}">${esc(first(k.full_name))}${k.grade ? ' · ' + esc(gradeLabel(k.grade, curOf(k.curriculum))) : ''}</button>`).join(' ');
    const mine = courses.filter(c => has(cur.id, c.id) || asked(cur.id, c.id));
    mineBox.innerHTML = mine.length ? `<h2 class="dash-h">${esc(first(cur.full_name))}’s classes</h2><div class="pending">${mine.map(c => { const e = has(cur.id, c.id);
      return `<div class="pending-row"><span class="initials">📚</span><div><b>${esc(c.title)}</b><span class="meta">${esc([c.teacher_name, e && e.time_slot].filter(Boolean).join(' · '))}</span></div><span class="tag ${e ? '' : 'tag-wait'}">${e ? '✅ Has a place' : '⏳ Waiting for the teacher'}</span></div>`; }).join('')}</div>` : '';
    const t = q.value.trim().toLowerCase();
    const shown = courses.filter(c => !mine.includes(c)).filter(c => all.checked || fits(c, cur))
      .filter(c => !t || [c.title, c.description, c.subject, c.teacher_name, c.category].join(' ').toLowerCase().includes(t));
    const noProfile = !cur.grade || !curOf(cur.curriculum);
    list.innerHTML = `<h2 class="dash-h" style="grid-column:1/-1">${all.checked ? 'All classes' : 'Classes that fit ' + esc(first(cur.full_name))}</h2>`
      + (noProfile && !all.checked ? `<p class="meta" style="grid-column:1/-1">We don’t know ${esc(first(cur.full_name))}’s grade or curriculum yet, so some classes may be missing. Tick “Show classes for every grade” to see them all.</p>` : '')
      + (shown.length ? shown.map((c, i) => `<article class="learn"><img src="${c.image_url ? esc(c.image_url) : 'images/' + PHOTOS[(c.id ?? i) % PHOTOS.length] + '.png'}" alt="" loading="lazy">
        <div class="learn-body"><span class="meta">${esc([c.subject || c.category, gradeLabel(c.grade, c.curriculum)].filter(Boolean).join(' · '))}</span><h4>${esc(c.title)}</h4>
        <p class="desc">${esc(c.description || '')}</p>${c.teacher_name ? `<span class="meta">👩‍🏫 ${esc(c.teacher_name)}</span>` : ''}
        <div class="row"><a class="pill pill-live" href="course-details.html?id=${c.id}&kid=${encodeURIComponent(cur.id)}">See class times &amp; ask for a place</a></div></div></article>`).join('')
        : `<p class="empty" style="grid-column:1/-1">No classes ${all.checked ? 'match your search' : 'for this grade yet'}. ${all.checked ? '' : 'Tick “Show classes for every grade” to see the others.'}</p>`);
  }
  kbox.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; cur = kids.find(k => k.id === b.dataset.k); history.replaceState(null, '', '?kid=' + cur.id); draw(); });
  q.addEventListener('input', draw); all.addEventListener('change', draw);
  draw();
}
