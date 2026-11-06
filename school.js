// ===== Think Nest for Schools =====
const SC_E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SC_ROLES = [['principal', 'Principal'], ['vice_principal', 'Vice principal'], ['assistant_principal', 'Assistant principal'], ['coordinator', 'Coordinator'],
  ['head_of_department', 'Head of department'], ['inclusion_lead', 'Inclusion lead'], ['admin_staff', 'Admin staff'], ['teacher', 'Teacher'], ['student', 'Student']];
const SC_LEADERS = ['principal', 'vice_principal', 'assistant_principal', 'coordinator', 'head_of_department', 'inclusion_lead', 'admin_staff'];
const SC_MANAGERS = ['principal', 'vice_principal', 'assistant_principal', 'admin_staff'];
const SC_ALL_GRADES = ['Pre-K', 'KG1', 'KG2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const SC_SUBJECTS = ['English', 'Maths', 'Science', 'Arabic', 'Islamic Education', 'Social Studies', 'Moral Education', 'Art', 'Music', 'PE', 'ICT', 'French'];
const scRole = k => (SC_ROLES.find(r => r[0] === k) || [k, k])[1];

// ---------- Register your school (School Leader card) ----------
function startSchoolRegister() {
  const f = document.getElementById('sreg-form'), err = document.getElementById('sreg-error');
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    for (const el of f.querySelectorAll('input[required], select[required]')) {
      if (!el.checkValidity()) { el.focus(); return showError(err, el.type === 'password' ? 'Choose a password with at least 8 characters.' : el.type === 'email' ? 'Enter a valid email address.' : 'Please fill in every required box.'); }
    }
    if (f.password.value !== f.password2.value) { f.password2.focus(); return showError(err, 'The two passwords don’t match.'); }
    if (!f.agree_terms.checked) return showError(err, 'Please tick the box to agree to the Terms of use.');
    if (typeof captchaMissing === 'function' && captchaMissing()) return showError(err, CAPTCHA_MSG);
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    const { data: su, error } = await db.auth.signUp({
      email: f.email.value.trim(), password: f.password.value,
      options: { captchaToken: (typeof captchaToken === 'function' ? captchaToken() : undefined), data: {
        role: 'school_leader', full_name: f.full_name.value.trim(), job_title: f.job_title.value, phone: f.phone.value.trim(),
        school_name: f.school_name.value.trim(), school_city: f.city.value, school_curriculum: f.curriculum.value, school_students: f.students.value,
        school_website: f.website.value.trim(), school: f.school_name.value.trim(), agreed_terms: true, lang: (typeof tnLang === 'function' ? tnLang() : 'en') } }
    });
    if (typeof captchaReset === 'function') captchaReset();
    btn.disabled = false; btn.textContent = 'Register my school';
    if (error) return showError(err, friendly(error));
    if (typeof alreadyRegistered === 'function' && alreadyRegistered(su)) return showError(err, typeof ALREADY_MSG !== 'undefined' ? ALREADY_MSG : 'This email already has an account. Please log in instead.');
    if (typeof emailAdmin === 'function') emailAdmin('New school registration waiting for approval', { School: f.school_name.value.trim(), City: f.city.value, Curriculum: f.curriculum.value, Students: f.students.value,
      Leader: f.full_name.value.trim() + ' (' + f.job_title.value + ')', Email: f.email.value.trim(), Phone: f.phone.value.trim(), 'What to do': 'Log in as admin → Accounts → School registrations.' });
    location.href = 'pending.html';
  });
}

// ---------- The school home (leaders) ----------
async function startSchool() {
  const { user, profile } = await initTeacher();
  const box = document.getElementById('school');
  const { data: schools, error } = await db.rpc('my_schools');
  const mine = (schools || []).filter(s => SC_LEADERS.includes(s.my_role) || profile.role === 'admin');
  if (error || !mine.length) {
    const { data: req } = await db.from('school_requests').select('school_name, status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
    box.innerHTML = req && req.length && req[0].status === 'pending'
      ? `<div class="empty-box"><p>⏳ <b>${SC_E(req[0].school_name)}</b> is waiting for approval by the Think Nest team.</p></div>`
      : '<div class="empty-box"><p>You’re not a leader of a school on Think Nest yet. To bring your school to Think Nest, register it from the <b>School Leader</b> card.</p><a class="btn btn-red" href="school-register.html">Register a school</a></div>';
    return;
  }
  let sid = Number(sessionStorage.getItem('tn_school')) || mine[0].id;
  if (!mine.some(s => s.id === sid)) sid = mine[0].id;
  let S = mine.find(s => s.id === sid);
  const canManage = SC_MANAGERS.includes(S.my_role) || profile.role === 'admin';
  const paint = () => {
    document.documentElement.style.setProperty('--school', S.color_primary || '#3E4B94');
    document.documentElement.style.setProperty('--school2', S.color_accent || '#F27A6F');
  };
  paint();
  const tabs = [['overview', '🏠 Overview'], ['people', '👥 People'], ['settings', '⚙️ School settings']];
  box.innerHTML = `<section class="sc-hero" id="sc-hero"></section>
    ${mine.length > 1 ? `<label class="sc-switch">School <select id="sc-pick">${mine.map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${SC_E(s.name)}</option>`).join('')}</select></label>` : ''}
    <div class="tabs sc-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="false" data-sct="${k}">${l}</button>`).join('')}</div>
    <section id="sc-pane"></section>`;
  const pick = document.getElementById('sc-pick'); if (pick) pick.onchange = () => { sessionStorage.setItem('tn_school', pick.value); location.reload(); };
  const hero = () => {
    document.getElementById('sc-hero').innerHTML = `<div class="sc-logo">${S.logo_url ? `<img src="${SC_E(S.logo_url)}" alt="${SC_E(S.name)} logo">` : `<span>${SC_E(S.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>`}</div>
      <div><p class="sc-kicker">Think Nest for Schools</p><h1>${SC_E(S.name)}</h1><p class="sc-meta">${SC_E(S.academic_year)} · You are <b>${SC_E(scRole(S.my_role) || 'Admin')}</b></p></div>`;
  };
  hero();
  const show = k => {
    document.querySelectorAll('[data-sct]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sct === k)));
    history.replaceState(null, '', '#' + k);
    ({ overview, people, settings })[k]();
  };
  document.querySelector('.sc-tabs').addEventListener('click', e => { const b = e.target.closest('[data-sct]'); if (b) show(b.dataset.sct); });
  const pane = () => document.getElementById('sc-pane');

  // ----- Overview
  async function overview() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const [{ data: ppl }, { data: cls }] = await Promise.all([db.rpc('school_people', { sid }), db.rpc('school_classes', { sid })]);
    const P = ppl || [], n = r => P.filter(p => r.includes(p.role)).length;
    const steps = [[!!S.logo_url, 'Add your school logo and colours', 'settings'], [P.filter(p => SC_LEADERS.includes(p.role)).length > 1, 'Add your leadership team', 'people'],
      [(S.grades || []).length > 0 && S.academic_year, 'Check your academic year, terms and grades', 'settings']];
    pane().innerHTML = `<section class="in-cards sc-cards">
        <div class="in-card"><span>🧭</span><b>${n(SC_LEADERS)}</b><small>Leaders</small></div>
        <div class="in-card"><span>👩‍🏫</span><b>${n(['teacher'])}</b><small>Teachers</small></div>
        <div class="in-card"><span>🎒</span><b>${n(['student'])}</b><small>Students</small></div>
        <div class="in-card"><span>🏫</span><b>${(cls || []).length}</b><small>Classes</small></div></section>
      <section class="panel sc-check"><h2>🚀 Set up your school</h2>
        ${steps.map(([done, t, go]) => `<button type="button" class="sc-step ${done ? 'done' : ''}" data-go="${go}"><span class="sc-tick" aria-hidden="true">${done ? '✓' : ''}</span><b>${t}</b><span class="sc-go">${done ? 'Done' : 'Start →'}</span></button>`).join('')}
        <p class="meta">Next, coming soon: bulk import of staff and students, the whole-school dashboard, report cycles and announcements.</p></section>
      <section class="panel"><h2>🏫 Classes</h2>${(cls || []).length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Class</th><th>Grade</th><th>Teacher</th><th>Students</th></tr></thead><tbody>
        ${cls.map(c => `<tr><td><a href="group.html?id=${c.id}">${SC_E(c.name)}</a></td><td>${SC_E([c.grade, c.section].filter(Boolean).join(' ') || '–')}</td><td>${SC_E(c.teacher || '')}</td><td>${c.students}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="meta">No classes yet. Classes created by your school’s teachers will appear here.</p>'}</section>`;
    pane().querySelectorAll('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));
  }

  // ----- People
  async function people() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const { data, error } = await db.rpc('school_people', { sid });
    if (error) { pane().innerHTML = `<p class="empty">${SC_E(friendly(error))}</p>`; return; }
    const P = data || [];
    const grades = (S.grades || []);
    const row = p => `<tr data-uid="${p.user_id}"><td><b>${SC_E(p.full_name || '–')}</b>${p.title ? `<br><small class="meta">${SC_E(p.title)}</small>` : ''}</td>
      <td><span class="sc-role r-${p.role}">${SC_E(scRole(p.role))}</span></td><td class="meta">${SC_E(p.email || (p.username ? 'Username: ' + p.username : ''))}</td>
      <td class="meta">${SC_E([].concat(p.scope_grades || [], p.scope_subjects || []).join(', ') || (SC_LEADERS.includes(p.role) ? 'Whole school' : ''))}</td>
      <td>${canManage && p.user_id !== user.id ? '<button type="button" class="link-btn" data-rm>Remove</button>' : ''}</td></tr>`;
    const group = (title, list) => list.length ? `<h3 class="sc-h3">${title} <span class="count">${list.length}</span></h3><div class="in-scroll"><table class="ac-table"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Scope</th><th></th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>` : '';
    pane().innerHTML = `${canManage ? `<section class="panel sc-add"><h2>➕ Add a person</h2>
        <p class="meta">Add someone who already has a Think Nest account, using their email. (Bulk import for whole staff and student lists is coming next.)</p>
        <form id="sc-add" class="sc-add-grid">
          <label>Email <input type="email" name="email" required placeholder="name@school.ae"></label>
          <label>Role <select name="role">${SC_ROLES.filter(r => r[0] !== 'student' && (r[0] !== 'principal' || S.my_role === 'principal' || profile.role === 'admin')).map(([k, l]) => `<option value="${k}" ${k === 'teacher' ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>Job title (optional) <input type="text" name="title" maxlength="80" placeholder="e.g. PYP Coordinator"></label>
          <fieldset class="sc-scope" hidden><legend>Limit to grades (optional)</legend>${grades.map(g => `<label><input type="checkbox" name="g" value="${SC_E(g)}"> ${SC_E(g)}</label>`).join('')}</fieldset>
          <fieldset class="sc-scope" hidden><legend>Limit to subjects (optional)</legend>${SC_SUBJECTS.map(g => `<label><input type="checkbox" name="s" value="${g}"> ${g}</label>`).join('')}</fieldset>
          <button class="btn btn-red">Add to school</button></form></section>` : ''}
      <section class="panel"><h2>👥 People in ${SC_E(S.name)}</h2>
        ${group('🧭 Leadership team', P.filter(p => SC_LEADERS.includes(p.role)))}${group('👩‍🏫 Teachers', P.filter(p => p.role === 'teacher'))}${group('🎒 Students', P.filter(p => p.role === 'student'))}
        ${P.length ? '' : '<p class="meta">No one yet.</p>'}</section>`;
    const f = document.getElementById('sc-add');
    if (f) {
      const scope = () => f.querySelectorAll('.sc-scope').forEach(x => { x.hidden = !['coordinator', 'head_of_department'].includes(f.role.value); });
      f.role.onchange = scope; scope();
      f.onsubmit = async e => {
        e.preventDefault();
        if (!f.email.checkValidity()) return say('Enter a valid email address.');
        const b = f.querySelector('button'); b.disabled = true;
        const scoped = ['coordinator', 'head_of_department'].includes(f.role.value);
        const { data: nm, error: er } = await db.rpc('school_add_member', { sid, member_email: f.email.value.trim(), mrole: f.role.value, mtitle: f.title.value.trim(),
          grades: scoped ? [...f.querySelectorAll('input[name=g]:checked')].map(x => x.value) : [], subjects: scoped ? [...f.querySelectorAll('input[name=s]:checked')].map(x => x.value) : [] });
        b.disabled = false;
        if (er) return say(friendly(er));
        say(`✅ ${nm} added as ${scRole(f.role.value)}.`); people();
      };
    }
    pane().querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
      const tr = b.closest('[data-uid]');
      if (!confirm(`Remove ${tr.cells[0].innerText.split('\n')[0]} from ${S.name}?`)) return;
      const { error: er } = await db.rpc('school_remove_member', { sid, uid: tr.dataset.uid });
      if (er) return say(friendly(er)); say('Removed.'); people();
    });
  }

  // ----- Settings (name, logo, colours, year, terms, grades, sections)
  function settings() {
    const ro = !canManage;
    pane().innerHTML = `<form class="panel sc-set" id="sc-set">
      <h2>⚙️ School settings</h2>${ro ? '<p class="note">Only the principal, vice or assistant principal, or admin staff can change these.</p>' : ''}
      <div class="sc-two"><label>School name <input type="text" name="name" maxlength="120" value="${SC_E(S.name)}" required ${ro ? 'disabled' : ''}></label>
        <label>Short name (optional) <input type="text" name="short_name" maxlength="30" value="${SC_E(S.short_name || '')}" placeholder="e.g. AA" ${ro ? 'disabled' : ''}></label></div>
      <h3 class="sc-h3">🎨 Logo and colours</h3>
      <div class="sc-brand">
        <div class="sc-logo big" id="sc-logo-prev">${S.logo_url ? `<img src="${SC_E(S.logo_url)}" alt="">` : '<span>Logo</span>'}</div>
        <div class="sc-brand-in">${ro ? '' : `<label class="pill pill-soft sc-up">📤 Upload logo (PNG or JPG, up to 2 MB)<input type="file" id="sc-logo" accept="image/png,image/jpeg,image/webp" hidden></label>`}
          <div class="sc-colors"><label>Main colour <input type="color" name="color_primary" value="${SC_E(S.color_primary)}" ${ro ? 'disabled' : ''}></label>
            <label>Accent colour <input type="color" name="color_accent" value="${SC_E(S.color_accent)}" ${ro ? 'disabled' : ''}></label></div>
          <p class="meta">Your logo and colours appear on your school pages, report cards and certificates.</p></div></div>
      <h3 class="sc-h3">📅 Academic year</h3>
      <div class="sc-two"><label>Academic year <input type="text" name="academic_year" maxlength="20" value="${SC_E(S.academic_year)}" ${ro ? 'disabled' : ''}></label>
        <label>Terms (separate with commas) <input type="text" name="terms" maxlength="200" value="${SC_E((S.terms || []).join(', '))}" ${ro ? 'disabled' : ''}></label></div>
      <h3 class="sc-h3">🎓 Grades your school teaches</h3>
      <div class="sc-grades">${SC_ALL_GRADES.map(g => `<label class="sc-chip"><input type="checkbox" name="grade" value="${g}" ${(S.grades || []).includes(g) ? 'checked' : ''} ${ro ? 'disabled' : ''}><span>${g}</span></label>`).join('')}</div>
      <label class="sc-sections">Sections (separate with commas) <input type="text" name="sections" maxlength="200" value="${SC_E((S.sections || []).join(', '))}" placeholder="e.g. A, B, C" ${ro ? 'disabled' : ''}></label>
      ${ro ? '' : '<button class="btn btn-red">💾 Save settings</button>'}</form>`;
    const f = document.getElementById('sc-set');
    let logoUrl = S.logo_url;
    const up = document.getElementById('sc-logo');
    if (up) up.onchange = async () => {
      const file = up.files[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) return say('Please choose an image up to 2 MB.');
      const path = `${sid}/logo-${Date.now()}.${(file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z]/g, '')}`;
      const { error: er } = await db.storage.from('school-logos').upload(path, file, { upsert: true, contentType: file.type });
      if (er) return say(friendly(er));
      logoUrl = db.storage.from('school-logos').getPublicUrl(path).data.publicUrl;
      document.getElementById('sc-logo-prev').innerHTML = `<img src="${SC_E(logoUrl)}" alt="">`;
      say('Logo uploaded. Click 💾 Save settings to keep it.');
    };
    f.querySelectorAll('input[type=color]').forEach(c => c.oninput = () => {
      document.documentElement.style.setProperty(c.name === 'color_primary' ? '--school' : '--school2', c.value);
    });
    f.onsubmit = async e => {
      e.preventDefault(); if (ro) return;
      const list = v => v.split(',').map(x => x.trim()).filter(Boolean);
      const row = { name: f.name.value.trim(), short_name: f.short_name.value.trim() || null, logo_url: logoUrl || null, color_primary: f.color_primary.value, color_accent: f.color_accent.value,
        academic_year: f.academic_year.value.trim() || S.academic_year, terms: list(f.terms.value), grades: [...f.querySelectorAll('input[name=grade]:checked')].map(x => x.value), sections: list(f.sections.value) };
      if (row.name.length < 2) return say('Please enter the school name.');
      if (!row.grades.length) return say('Please choose at least one grade.');
      const { error: er } = await db.from('schools').update(row).eq('id', sid);
      if (er) return say(friendly(er));
      Object.assign(S, row); paint(); hero(); say('✅ School settings saved.');
    };
  }
  const start = (location.hash || '').slice(1);
  show(tabs.some(t => t[0] === start) ? start : 'overview');
}

// ---------- Think Nest admin: school registrations and schools ----------
async function adminSchools() {
  const box = document.getElementById('school-requests-box'); if (!box) return;
  const [{ data: reqs, error }, { data: schools }] = await Promise.all([db.rpc('admin_school_requests'), db.rpc('admin_list_schools')]);
  if (error) { box.innerHTML = '<p class="empty">Run database update 55 to see school registrations.</p>'; return; }
  const pend = (reqs || []).filter(r => r.status === 'pending');
  const n = document.getElementById('n-schoolreq'); if (n) n.textContent = pend.length;
  box.innerHTML = (pend.length ? pend.map(r => `<article class="panel person" data-sr="${r.id}"><span class="initials">🏫</span>
      <div class="person-info"><h4>${SC_E(r.school_name)}</h4>
        <span class="meta">${SC_E([r.city, r.curriculum, r.students_estimate ? r.students_estimate + ' students' : ''].filter(Boolean).join(' · '))}</span>
        <span class="meta">Leader: <b>${SC_E(r.leader_name || '')}</b>${r.job_title ? ' (' + SC_E(r.job_title) + ')' : ''} · ${SC_E(r.email || '')}${r.phone ? ' · ' + SC_E(r.phone) : ''}</span>
        ${r.website ? `<span class="meta">${SC_E(r.website)}</span>` : ''}</div>
      <div class="person-acts"><button class="btn btn-red" data-ok="1">Approve school</button><button class="pill pill-soft" data-ok="0">Decline</button></div></article>`).join('')
    : '<p class="empty">No school registrations waiting. 🎉</p>')
    + ((schools || []).length ? `<h3 class="sc-h3">🏫 Schools on Think Nest <span class="count">${schools.length}</span></h3><div class="in-scroll"><table class="ac-table"><thead><tr><th>School</th><th>Principal</th><th>Staff</th><th>Students</th><th>Classes</th></tr></thead><tbody>
        ${schools.map(s => `<tr><td><b>${SC_E(s.name)}</b></td><td>${SC_E(s.principal || '–')}</td><td>${s.staff}</td><td>${s.students}</td><td>${s.classes}</td></tr>`).join('')}</tbody></table></div>` : '');
  box.onclick = async e => {
    const b = e.target.closest('[data-ok]'); if (!b) return;
    const card = b.closest('[data-sr]'), ok = b.dataset.ok === '1';
    if (!confirm(ok ? 'Approve this school? Its leader becomes the principal and can start setting it up.' : 'Decline this school registration?')) return;
    const { error: er } = await db.rpc('decide_school_request', { rid: Number(card.dataset.sr), ok });
    if (er) return say(friendly(er));
    say(ok ? '🏫 School approved. The principal has been told.' : 'Registration declined.'); adminSchools();
  };
}
