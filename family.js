// ===== Think Nest family: children on parent sign-up, invites, and linking =====
const FAM_GRADES = ['KG1', 'KG2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const FAM_CURR = ['British Curriculum (England / IGCSE)', 'American Curriculum', 'International Baccalaureate (IB)', 'Montessori', 'UAE MOE', 'Other'];
const famEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function famChildFields(i) {
  return `<fieldset class="fam-child" data-i="${i}"><legend>Child ${i + 1}</legend>
    <label>Child’s full name <input type="text" data-k="name" maxlength="120" required></label>
    <div class="two"><label>Grade <select data-k="grade"><option value="">Choose</option>${FAM_GRADES.map(g => `<option>${g}</option>`).join('')}</select></label>
    <label>Curriculum <select data-k="curriculum"><option value="">Choose</option>${FAM_CURR.map(c => `<option>${famEsc(c)}</option>`).join('')}</select></label></div>
    <div class="fam-has"><span>Does this child already have a Think Nest account?</span>
      <label><input type="radio" name="has-${i}" value="no" checked> No</label><label><input type="radio" name="has-${i}" value="yes"> Yes</label></div>
    <label class="fam-email" hidden>Child’s Think Nest email <input type="email" data-k="email" placeholder="The email your child logs in with"></label>
  </fieldset>`;
}
// Parent sign-up: children + joined account
function initFamilySignup() {
  const box = document.getElementById('fam-kids'), count = document.getElementById('fam-count'); if (!box) return;
  const draw = n => { const keep = famCollect(true); box.innerHTML = Array.from({ length: n }, (_, i) => famChildFields(i)).join('');
    keep.slice(0, n).forEach((k, i) => { const fs = box.querySelector(`[data-i="${i}"]`); ['name', 'grade', 'curriculum', 'email'].forEach(x => fs.querySelector(`[data-k=${x}]`).value = k[x] || ''); if (k.email) { fs.querySelector('[value=yes]').checked = true; fs.querySelector('.fam-email').hidden = false; } }); };
  count.addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; count.querySelectorAll('[data-n]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(Number(b.dataset.n)); });
  box.addEventListener('change', e => { if (e.target.name && e.target.name.startsWith('has-')) e.target.closest('.fam-child').querySelector('.fam-email').hidden = e.target.value !== 'yes'; });
}
function famCollect(loose) {
  return [...document.querySelectorAll('#fam-kids .fam-child')].map(fs => {
    const v = k => (fs.querySelector(`[data-k=${k}]`) || {}).value || '';
    const has = (fs.querySelector('input[type=radio]:checked') || {}).value === 'yes';
    return { name: v('name').trim(), grade: v('grade'), curriculum: v('curriculum'), email: has ? v('email').trim() : '' };
  }).filter(k => loose || k.name);
}
function famValidate() {
  const pressed = document.querySelector('#fam-count [aria-pressed=true]');
  if (!pressed) return 'Please choose how many children you would like to enrol.';
  const kids = famCollect(true);
  if (kids.some(k => !k.name)) return 'Please type each child’s full name.';
  if (kids.some(k => !k.grade)) return 'Please choose a grade for each child.';
  if ([...document.querySelectorAll('#fam-kids .fam-child')].some(fs => (fs.querySelector('input[type=radio]:checked') || {}).value === 'yes' && !fs.querySelector('[data-k=email]').value.trim())) return 'Please type the Think Nest email for any child who already has an account.';
  if (!document.querySelector('input[name=family_joined]:checked')) return 'Please choose whether you’d like a joined family account.';
  return '';
}

// Parent dashboard: children who haven't joined yet + add another child
async function familyWaiting(hostId) {
  const host = document.getElementById(hostId); if (!host) return;
  const { data: { session } } = await db.auth.getSession(); if (!session) return;
  const { data: me } = await db.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
  const { data, error } = await db.from('family_children').select('*').eq('parent_id', session.user.id).is('student_id', null).order('id');
  if (error) { host.hidden = true; return; }
  const base = location.origin + location.pathname.replace(/[^/]*$/, '');
  const link = k => base + 'signup.html?' + new URLSearchParams({ name: k.full_name, grade: k.grade || '', curriculum: k.curriculum || '', parent_email: session.user.email, parent_name: (me && me.full_name) || '' }).toString();
  host.hidden = false;
  host.innerHTML = `<h2 class="dash-h">Children waiting to join</h2>
    ${(data || []).length ? `<p class="hint">Send each child their invite link. When they sign up with it, their details are filled in and they’re linked to you automatically. <b>Young child without an email?</b> Use <b>👤 Create a username login</b> instead: you choose the username and password, and they can start straight away.</p><div class="fam-wait">${data.map(k => `<article class="panel fam-card">
      <span class="initials">${famEsc(k.full_name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
      <div><b>${famEsc(k.full_name)}</b><span class="meta">${famEsc([k.grade, k.curriculum].filter(Boolean).join(' · '))} · ⏳ hasn’t signed up yet</span></div>
      <div class="fam-actions"><button type="button" class="pill pill-live" data-copy="${famEsc(link(k))}">🔗 Copy invite link</button>
        <a class="pill pill-soft" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Join me on Think Nest! Sign up here: ' + link(k))}">WhatsApp</a>
        <a class="pill pill-soft" href="${famEsc(link(k))}" target="_blank" rel="noopener">Open sign-up</a>
        <button type="button" class="pill pill-live" data-ulogin="${k.id}" data-name="${famEsc(k.full_name)}">👤 No email? Create a username login</button>
        <button type="button" class="link-btn" data-fdel="${k.id}">Remove</button></div></article>`).join('')}</div>` : '<p class="hint">All your children have joined. 🎉</p>'}
    <details class="panel fam-add"><summary>➕ Enrol another child</summary><div class="auth-form" id="fam-add-form">${famChildFields(0).replace('<legend>Child 1</legend>', '')}<button type="button" class="btn btn-red auth-btn" id="fam-add-btn">Add child</button></div></details>`;
  host.onclick = async e => {
    const c = e.target.closest('[data-copy]');
    if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); say('Invite link copied. Send it to your child.'); } catch (_) { prompt('Copy this link:', c.dataset.copy); } return; }
    const ul = e.target.closest('[data-ulogin]');
    if (ul) return famUsernameDialog(Number(ul.dataset.ulogin), ul.dataset.name, () => familyWaiting(hostId));
    const d = e.target.closest('[data-fdel]');
    if (d && confirm('Remove this child from the list?')) { await db.from('family_children').delete().eq('id', Number(d.dataset.fdel)); return familyWaiting(hostId); }
    if (e.target.id === 'fam-add-btn') {
      const fs = host.querySelector('#fam-add-form .fam-child'); const v = k => fs.querySelector(`[data-k=${k}]`).value.trim();
      if (!v('name')) return say('Type your child’s full name.');
      const has = (fs.querySelector('input[type=radio]:checked') || {}).value === 'yes';
      const { data: r, error: er } = await db.rpc('add_family_child', { cname: v('name'), cgrade: v('grade'), ccurr: v('curriculum'), cemail: has ? v('email') : '' });
      if (er) return say(friendly(er));
      say(r === 'linked' ? 'Linked! Your child is now on your dashboard.' : 'Added. Send them the invite link to sign up.');
      setTimeout(() => location.reload(), 800);
    }
  };
  host.onchange = e => { if (e.target.name && e.target.name.startsWith('has-')) e.target.closest('.fam-child').querySelector('.fam-email').hidden = e.target.value !== 'yes'; };
}

// ----- A login for a young child who has no email: the parent chooses a username and password -----
function famSuggestUser(name) {
  const p = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const r = crypto.getRandomValues(new Uint32Array(1))[0];
  return ((p[0] || 'student').slice(0, 12) + (p.length > 1 ? '.' + p[p.length - 1][0] : '') + String(10 + r % 90));
}
function famSuggestPw() {
  const A = ['Sunny', 'Happy', 'Brave', 'Lucky', 'Clever', 'Shiny', 'Jolly', 'Swift', 'Bright', 'Calm'], B = ['Panda', 'Tiger', 'Rocket', 'Comet', 'Koala', 'Dolphin', 'Planet', 'Owl', 'Mango', 'Penguin'];
  const r = crypto.getRandomValues(new Uint32Array(3)); return A[r[0] % A.length] + B[r[1] % B.length] + String(r[2] % 100).padStart(2, '0');
}
function famUsernameDialog(fid, name, done) {
  let d = document.getElementById('fam-ulogin');
  if (!d) { d = document.createElement('dialog'); d.id = 'fam-ulogin'; d.className = 'dlg'; document.body.appendChild(d); }
  d.innerHTML = `<form class="auth-form" style="display:grid;gap:12px;min-width:min(460px,88vw)">
    <h2 style="margin:0">👤 A login for ${famEsc(name)}</h2>
    <p class="meta" style="margin:0">No email needed. Your child logs in on <b>Log in → Student</b> with this username and password. You can change the password later from your child’s page.</p>
    <label>Username <input name="u" required minlength="4" maxlength="30" value="${famEsc(famSuggestUser(name))}" autocomplete="off"></label>
    <p class="meta" style="margin:-6px 0 0">Letters, numbers and dots only. Avoid your child’s full name, for privacy.</p>
    <label>Password <input name="p" required minlength="8" maxlength="40" value="${famSuggestPw()}" autocomplete="off"></label>
    <p class="form-error" data-err hidden></p>
    <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-x>Cancel</button><button class="btn btn-red auth-btn">Create the login</button></div></form>`;
  const f = d.querySelector('form'), err = d.querySelector('[data-err]');
  d.querySelector('[data-x]').onclick = () => d.close();
  f.onsubmit = async e => {
    e.preventDefault(); err.hidden = true;
    const u = f.u.value.trim(), p = f.p.value;
    if (!/^[a-zA-Z0-9._]{4,30}$/.test(u)) { err.textContent = 'Use 4–30 letters, numbers or dots for the username (no spaces).'; err.hidden = false; return; }
    if (p.length < 8) { err.textContent = 'Use at least 8 characters for the password.'; err.hidden = false; return; }
    const b = f.querySelector('.btn-red'); b.disabled = true; b.textContent = 'Creating…';
    const { data, error } = await db.rpc('parent_create_child_login', { fid, uname: u, pw: p });
    b.disabled = false; b.textContent = 'Create the login';
    if (error) { const m = error.message || ''; err.textContent = /USERNAME_TAKEN/.test(m) ? 'That username is taken. Try another one.' : /USERNAME_LENGTH/.test(m) ? 'Use 4–30 letters, numbers or dots.' : /PASSWORD_SHORT/.test(m) ? 'Use at least 8 characters for the password.' : /function|schema cache/i.test(m) ? 'Please run the latest Supabase update (child_logins_without_email.sql) first.' : friendly(error); err.hidden = false; return; }
    d.innerHTML = `<div style="display:grid;gap:12px;min-width:min(460px,88vw)"><h2 style="margin:0">🎉 ${famEsc(name)} is ready to learn!</h2>
      <div class="panel" style="padding:14px"><p style="margin:0 0 6px">Username: <b style="font-size:1.15em">${famEsc(data)}</b></p><p style="margin:0">Password: <b style="font-size:1.15em">${famEsc(p)}</b></p></div>
      <p class="meta" style="margin:0">Write these down or print them now. Your child logs in at <b>thinknestonline.com → Log in → Student</b>, and is already linked to your account.</p>
      <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-print>🖨️ Print login card</button><button type="button" class="btn btn-red auth-btn" data-ok>Done</button></div></div>`;
    d.querySelector('[data-ok]').onclick = () => { d.close(); if (done) done(); };
    d.querySelector('[data-print]').onclick = () => { const w = window.open('', '_blank'); if (!w) return say('Please allow pop-ups to print.');
      w.document.write(`<!doctype html><meta charset="utf-8"><title>Login card</title><body style="font-family:Arial;padding:20px"><div style="border:2px dashed #9AA3D6;border-radius:14px;padding:18px;max-width:360px"><b style="color:#3E4B94">🪺 Think Nest</b><h2 style="margin:8px 0">${famEsc(name)}</h2><p>Username: <b>${famEsc(data)}</b></p><p>Password: <b>${famEsc(p)}</b></p><p style="font-size:12px;color:#666">Go to thinknestonline.com → Log in → Student. Keep your password secret! 🤫</p></div><script>setTimeout(function(){print()},300)<\/script>`); w.document.close(); };
  };
  d.showModal();
}

// Student sign-up: fill in details from a parent's invite link
function prefillFromInvite() {
  const q = new URLSearchParams(location.search), f = document.getElementById('signup-form'); if (!f || !q.get('parent_email')) return;
  const set = (n, v) => { if (f[n] && v) f[n].value = v; };
  set('full_name', q.get('name')); set('grade', q.get('grade')); set('curriculum', q.get('curriculum'));
  set('parent_email', q.get('parent_email')); set('parent_name', q.get('parent_name'));
  if (f.parent_consent) f.parent_consent.checked = true;
  const note = document.createElement('p'); note.className = 'note';
  note.innerHTML = '👪 <b>' + famEsc(q.get('parent_name') || 'Your parent') + '</b> invited you to Think Nest. Your details are filled in: just add your email and a password.';
  f.prepend(note);
}
