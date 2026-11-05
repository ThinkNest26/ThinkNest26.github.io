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
    ${(data || []).length ? `<p class="hint">Send each child their invite link. When they sign up with it, their details are filled in and they’re linked to you automatically.</p><div class="fam-wait">${data.map(k => `<article class="panel fam-card">
      <span class="initials">${famEsc(k.full_name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
      <div><b>${famEsc(k.full_name)}</b><span class="meta">${famEsc([k.grade, k.curriculum].filter(Boolean).join(' · '))} · ⏳ hasn’t signed up yet</span></div>
      <div class="fam-actions"><button type="button" class="pill pill-live" data-copy="${famEsc(link(k))}">🔗 Copy invite link</button>
        <a class="pill pill-soft" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('Join me on Think Nest! Sign up here: ' + link(k))}">WhatsApp</a>
        <a class="pill pill-soft" href="${famEsc(link(k))}" target="_blank" rel="noopener">Open sign-up</a>
        <button type="button" class="link-btn" data-fdel="${k.id}">Remove</button></div></article>`).join('')}</div>` : '<p class="hint">All your children have joined. 🎉</p>'}
    <details class="panel fam-add"><summary>➕ Enrol another child</summary><div class="auth-form" id="fam-add-form">${famChildFields(0).replace('<legend>Child 1</legend>', '')}<button type="button" class="btn btn-red auth-btn" id="fam-add-btn">Add child</button></div></details>`;
  host.onclick = async e => {
    const c = e.target.closest('[data-copy]');
    if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); say('Invite link copied. Send it to your child.'); } catch (_) { prompt('Copy this link:', c.dataset.copy); } return; }
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
