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
      options: { captchaToken: (typeof captchaToken === 'function' ? captchaToken() : undefined), data: { role: 'parent', full_name: (f.first.value.trim() + ' ' + f.last.value.trim()).trim(), phone: f.phone.value.trim(), country: f.country.value, children: kids, family_joined: joined, agreed_terms: true } }
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
  box.innerHTML = rows.length ? '<h3>Requests waiting for your child</h3>' + rows.map(r => `<div class="pending-row">
      <span class="initials">${esc(ini(r.child_name))}</span>
      <div><b>${esc(r.child_name || 'Your child')}</b><span class="meta">${r.status === 'declined' ? 'Declined. Check with your child, then send again.' : 'Waiting for your child to approve. Sent ' + new Date(r.created_at).toLocaleDateString('en-GB') + '.'}</span></div>
      <span class="tag ${r.status === 'declined' ? '' : 'tag-wait'}">${r.status === 'declined' ? 'Declined' : 'Waiting'}</span></div>`).join('') : '';
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
  pendingRequests(document.getElementById('pending'));

  // This week, for all children
  if (!kids.length) return;
  const ids = kids.map(k => k.id);
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
  document.getElementById('k-groups').innerHTML = gs.length ? gs.map(g => `<a class="panel group-card" href="group.html?id=${g.id}"><b>${esc(g.name)}</b><span class="meta">${g.members} member${g.members === 1 ? '' : 's'} · view only</span></a>`).join('') : '<p class="empty">Not in any study groups yet.</p>';
  const cv = await db.rpc('child_conversations', { kid: kidId });
  const chats = cv.data || [];
  document.getElementById('k-chats').innerHTML = chats.length ? chats.map(c => `<a class="pending-row" href="messages.html?c=${c.id}"><span class="initials">${c.kind === 'group' ? '👥' : esc(ini(c.title))}</span><div><b>${c.kind === 'group' ? 'Group chat: ' : 'Chat with '}${esc(c.title || '')}</b><span class="meta">${c.messages} message${c.messages === 1 ? '' : 's'}${c.last_at ? ' · last ' + new Date(c.last_at).toLocaleDateString('en-GB') : ''}</span></div><span class="pill pill-soft">Read</span></a>`).join('') : '<p class="empty">No chats yet.</p>';
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
    const { data, error } = await db.rpc('link_child', { code: lf.code.value });
    btn.disabled = false;
    if (error) return showError(lerr, friendly(error));
    say((data || 'Your child') + ' has been added.'); setTimeout(() => location.href = 'parent-dashboard.html', 1200);
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
