// ===== Think Nest parent area =====
// Uses db, say(), friendly(), esc(), when(), relative(), showError() from app.js

function startParentSignup() {
  const f = document.getElementById('psignup-form'), err = document.getElementById('psignup-error');
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    for (const el of f.querySelectorAll('input[required]')) {
      if (!el.checkValidity()) { el.focus(); return showError(err, el.type === 'password' ? 'Choose a password with at least 8 characters.' : el.type === 'email' ? 'Enter a valid email address.' : 'Please fill in every required box.'); }
    }
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Creating account…';
    const { data, error } = await db.auth.signUp({
      email: f.email.value.trim(), password: f.password.value,
      options: { data: { role: 'parent', full_name: f.full_name.value.trim(), phone: f.phone.value.trim() } }
    });
    btn.disabled = false; btn.textContent = 'Create account';
    if (error) return showError(err, friendly(error));
    location.href = data.session ? 'parent-dashboard.html' : 'parent-login.html';
  });
}

async function startParent() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'parent-login.html'; return; }
  const uid = session.user.id;
  const { data: me } = await db.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (!me || !['parent', 'admin'].includes(me.role)) { location.href = 'student-dashboard.html'; return; }
  document.body.classList.remove('loading');
  const side = document.getElementById('side'), shade = document.getElementById('side-shade');
  document.getElementById('side-toggle').addEventListener('click', () => { side.classList.add('open'); shade.classList.add('show'); });
  shade.addEventListener('click', () => { side.classList.remove('open'); shade.classList.remove('show'); });
  document.getElementById('logout').addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  const ini = n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('me-initials-small').textContent = ini(me.full_name || session.user.email);
  if (me.full_name) document.getElementById('hello').textContent = 'Welcome, ' + me.full_name.split(' ')[0];

  let kids = [], current = null;

  async function loadKids() {
    const { data: links, error } = await db.from('parent_links').select('student_id').eq('parent_id', uid);
    if (error) return say(friendly(error));
    const ids = links.map(l => l.student_id);
    kids = ids.length ? ((await db.from('profiles').select('*').in('id', ids)).data || []) : [];
    const tabs = document.getElementById('kid-tabs');
    tabs.innerHTML = kids.map(k => `<button role="tab" aria-selected="false" data-kid="${k.id}"><span class="initials">${esc(ini(k.full_name))}</span>${esc(k.full_name || 'Student')}</button>`).join('');
    document.getElementById('add-kid').querySelector('h2').textContent = kids.length ? 'Add another child' : 'Add your child';
    if (kids.length) show(current && kids.find(k => k.id === current) ? current : kids[0].id);
    else document.getElementById('kid-view').hidden = true;
  }

  async function show(kidId) {
    current = kidId;
    document.querySelectorAll('[data-kid]').forEach(b => b.setAttribute('aria-selected', b.dataset.kid === kidId));
    const k = kids.find(x => x.id === kidId);
    document.getElementById('kid-view').hidden = false;
    document.getElementById('kid-initials').textContent = ini(k.full_name);
    document.getElementById('kid-name').textContent = k.full_name || 'Student';
    document.getElementById('kid-sub').textContent = [k.grade, k.curriculum, k.school].filter(Boolean).join(' · ') || 'Student';

    const [en, bk, ce] = await Promise.all([
      db.from('enrollments').select('*, courses(id, title, teacher_name, weeks)').eq('user_id', kidId).order('created_at'),
      db.from('bookings').select('*, mentors(name)').eq('user_id', kidId).neq('status', 'cancelled').gte('starts_at', new Date().toISOString()).order('starts_at'),
      db.from('certificates').select('*, courses(title)').eq('user_id', kidId).order('issued_at', { ascending: false })
    ]);
    const enr = en.data || [];
    const courseIds = enr.map(e => e.course_id);
    const ses = courseIds.length ? ((await db.from('sessions').select('*, courses(title)').in('course_id', courseIds).gte('starts_at', new Date(Date.now() - 3600000).toISOString()).order('starts_at').limit(10)).data || []) : [];

    document.getElementById('k-courses').textContent = enr.length;
    document.getElementById('k-avg').textContent = enr.length ? Math.round(enr.reduce((s, e) => s + e.progress, 0) / enr.length) + '%' : '0%';
    document.getElementById('k-certs').textContent = (ce.data || []).length;

    document.getElementById('k-course-list').innerHTML = enr.length ? enr.map(e => `<article class="panel kid-course">
        <div><h4>${esc(e.courses ? e.courses.title : 'Course')}</h4><span class="meta">${e.courses && e.courses.teacher_name ? 'With ' + esc(e.courses.teacher_name) + ' · ' : ''}Joined ${new Date(e.created_at).toLocaleDateString('en-GB')}</span></div>
        <div class="kid-bar"><div class="bar"><i style="width:${e.progress}%"></i></div><b>${e.progress}%</b></div></article>`).join('')
      : '<p class="empty">Not on any courses yet.</p>';

    const events = [
      ...ses.map(s => ({ at: new Date(s.starts_at), title: s.title, sub: s.courses ? s.courses.title : 'Live class', kind: 'class' })),
      ...(bk.data || []).map(b => ({ at: new Date(b.starts_at), title: 'Mentor session with ' + (b.mentors ? b.mentors.name : 'a mentor'), sub: b.note || '', kind: 'book' }))
    ].sort((a, b) => a.at - b.at);
    const week = Date.now() + 7 * 86400000;
    document.getElementById('k-next').textContent = events.filter(e => e.at < week).length;
    document.getElementById('k-events').innerHTML = events.length ? events.map(e => {
      const [rel, live] = relative(e.at);
      return `<article class="event ev-${e.kind}"><div><h4>${esc(e.title)}</h4><span class="meta">${esc(e.sub)}</span><span class="when">${esc(when(e.at))}</span></div><div class="event-actions"><span class="tag ${live ? 'tag-now' : ''}">${rel}</span></div></article>`;
    }).join('') : '<p class="empty">Nothing scheduled.</p>';

    const certs = ce.data || [];
    document.getElementById('k-cert-list').innerHTML = certs.length ? certs.map(c => `<article class="cert panel"><span class="cert-ic" aria-hidden="true">🏅</span><h4>${esc(c.title)}</h4>
        <span class="meta">${esc(c.courses ? c.courses.title : '')}${c.issued_at ? ' · ' + new Date(c.issued_at).toLocaleDateString('en-GB') : ''}</span>
        ${c.file_path ? `<button class="btn btn-red btn-small" data-file="${esc(c.file_path)}">Download</button>` : ''}</article>`).join('')
      : '<p class="empty">No certificates yet.</p>';
  }

  document.getElementById('kid-tabs').addEventListener('click', e => { const b = e.target.closest('[data-kid]'); if (b) show(b.dataset.kid); });
  document.getElementById('k-cert-list').addEventListener('click', async e => {
    const b = e.target.closest('[data-file]'); if (!b) return;
    const { data, error } = await db.storage.from('certificates').createSignedUrl(b.dataset.file, 600);
    if (error) return say(friendly(error));
    window.open(data.signedUrl, '_blank', 'noopener');
  });
  document.getElementById('unlink').addEventListener('click', async () => {
    const k = kids.find(x => x.id === current);
    if (!confirm('Remove ' + (k.full_name || 'this child') + ' from your parent account? You can add them again later with their family code.')) return;
    const { error } = await db.from('parent_links').delete().eq('parent_id', uid).eq('student_id', current);
    if (error) return say(friendly(error));
    current = null; say('Removed.'); loadKids();
  });
  const lf = document.getElementById('link-form'), lerr = document.getElementById('link-error');
  lf.addEventListener('submit', async e => {
    e.preventDefault(); showError(lerr, '');
    const btn = lf.querySelector('button'); btn.disabled = true;
    const { data, error } = await db.rpc('link_child', { code: lf.code.value });
    btn.disabled = false;
    if (error) return showError(lerr, friendly(error));
    lf.reset(); say((data || 'Your child') + ' has been added to your account.'); loadKids();
  });

  // Request by the child's email
  const ef = document.getElementById('email-form'), eerr = document.getElementById('email-error');
  async function loadPending() {
    const { data } = await db.rpc('my_child_requests');
    const box = document.getElementById('pending');
    const rows = data || [];
    box.innerHTML = rows.length ? '<h3>Requests sent</h3>' + rows.map(r => `<div class="pending-row">
        <span class="initials">${esc(ini(r.child_name))}</span>
        <div><b>${esc(r.child_name || 'Your child')}</b><span class="meta">${r.status === 'declined' ? 'Declined. Check with your child, then send again.' : 'Waiting for your child to approve. Sent ' + new Date(r.created_at).toLocaleDateString('en-GB') + '.'}</span></div>
        <span class="tag ${r.status === 'declined' ? '' : 'tag-wait'}">${r.status === 'declined' ? 'Declined' : 'Waiting'}</span></div>`).join('') : '';
  }
  ef.addEventListener('submit', async e => {
    e.preventDefault(); showError(eerr, '');
    if (!ef.email.checkValidity()) return showError(eerr, 'Enter a valid email address.');
    const btn = ef.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending…';
    const { data, error } = await db.rpc('request_child', { child_email: ef.email.value });
    btn.disabled = false; btn.textContent = 'Send request';
    if (error) return showError(eerr, friendly(error));
    ef.reset();
    say(data === 'linked' ? 'This child is already linked to your account.' : 'Request sent. Ask your child to log in and tap Approve.');
    loadPending();
  });
  const auto = await db.rpc('auto_request_children');
  if (auto.data > 0) say('We found ' + auto.data + (auto.data === 1 ? ' child who' : ' children who') + ' listed your email, and sent them a request to approve.');
  loadPending();
  setInterval(() => { loadPending(); if (document.visibilityState === 'visible') loadKids(); }, 60000);

  loadKids();
}
