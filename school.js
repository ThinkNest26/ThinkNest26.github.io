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
  const tabs = [['overview', '🏠 Overview'], ['dashboard', '📊 Dashboard'], ['reports', '📝 Reports'], ['announce', '📣 Announcements'], ['people', '👥 People']].concat(canManage ? [['import', '📥 Import']] : [], [['settings', '⚙️ School settings']]);
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
    ({ overview, dashboard, reports, announce, people, settings, import: importTab })[k]();
  };
  document.querySelector('.sc-tabs').addEventListener('click', e => { const b = e.target.closest('[data-sct]'); if (b) show(b.dataset.sct); });
  const pane = () => document.getElementById('sc-pane');

  // ----- Overview
  async function overview() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const [{ data: ppl }, { data: cls }] = await Promise.all([db.rpc('school_people', { sid }), db.rpc('school_classes', { sid })]);
    const staff = (ppl || []).filter(p => !['student', 'parent'].includes(p.role));
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
      <section class="panel"><h2>🏫 Classes</h2>${(cls || []).length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Class</th><th>Grade</th><th>Class teacher</th><th>Students</th></tr></thead><tbody>
        ${cls.map(c => `<tr data-cls="${c.id}"><td><a href="group.html?id=${c.id}">${SC_E(c.name)}</a></td><td>${SC_E([c.grade, c.section].filter(Boolean).join(' ') || '–')}</td>
          <td>${canManage ? `<select class="sc-teach" aria-label="Class teacher for ${SC_E(c.name)}">${staff.some(p => p.user_id === c.teacher_id) ? '' : `<option value="">${SC_E(c.teacher || 'Choose…')}</option>`}${staff.map(p => `<option value="${p.user_id}" ${p.user_id === c.teacher_id ? 'selected' : ''}>${SC_E(p.full_name)}</option>`).join('')}</select>` : SC_E(c.teacher || '')}</td><td>${c.students}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="meta">No classes yet. Classes created by your school’s teachers will appear here.</p>'}</section>`;
    pane().querySelectorAll('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));
    pane().querySelectorAll('.sc-teach').forEach(sel => sel.onchange = async () => {
      if (!sel.value) return;
      const { error: er } = await db.rpc('school_set_class_teacher', { gid: Number(sel.closest('[data-cls]').dataset.cls), uid: sel.value });
      if (er) return say(friendly(er)); say('✅ Class teacher saved.');
    });
  }


  // ----- Whole-school dashboard
  async function dashboard() {
    pane().innerHTML = '<p class="empty">Gathering the whole-school data…</p>';
    const { data: d, error } = await db.rpc('school_dashboard', { sid });
    if (error) { pane().innerHTML = `<p class="empty">${SC_E(/school_dashboard|function/.test(error.message || '') ? 'Run database update 59 to see the dashboard.' : friendly(error))}</p>`; return; }
    const T = d.totals || {}, C = d.classes || [], O = d.objectives || [], Wt = d.watch || [], Wk = d.weeks || [];
    const pc = v => v == null ? '–' : v + '%';
    const band = v => v == null ? 'none' : v >= 80 ? 'secure' : v >= 60 ? 'dev' : 'gap';
    const scope = [].concat((d.scope || {}).grades || [], (d.scope || {}).subjects || []);
    const steps = [];
    C.filter(c => c.avg != null && c.avg < 60).forEach(c => steps.push(['🔴', `${c.name}: average ${c.avg}%${c.gaps ? ` with ${c.gaps} gap objective${c.gaps === 1 ? '' : 's'}` : ''}`, `Consider a check-in with ${c.teacher || 'the class teacher'} and a short support plan for the ${c.support} student${c.support === 1 ? '' : 's'} below 60%.`]));
    const weak = O.find(o => o.avg < 60);
    if (weak) steps.push(['🎯', `Weakest objective: “${weak.objective}”`, `${weak.avg}% across ${weak.classes} class${weak.classes === 1 ? '' : 'es'}${weak.grade ? ' in ' + weak.grade : ''}. A good focus for planning meetings or teacher development.`]);
    C.filter(c => c.att != null && c.att < 85).forEach(c => steps.push(['📋', `Attendance in ${c.name} is ${c.att}%`, 'Look at the early warning list and contact families where needed.']));
    C.filter(c => c.marking >= 5).forEach(c => steps.push(['✍️', `${c.marking} pieces of work to mark in ${c.name}`, `${c.teacher || 'The class teacher'} may need time or support to catch up.`]));
    if (Wt.length) steps.push(['⚠️', `${Wt.length} student${Wt.length === 1 ? '' : 's'} on the early warning list`, 'Share the list with class teachers and the inclusion lead.']);
    const best = C.filter(c => c.avg != null && c.avg >= 85).sort((a, b) => b.avg - a.avg)[0];
    if (best) steps.push(['🌟', `${best.name} is your strongest class (${best.avg}%)`, `Celebrate it, and invite ${best.teacher || 'its teacher'} to share what works.`]);
    // the weekly trend chart (attendance and average score)
    const chart = () => {
      const pts = Wk.map((w, i) => ({ i, att: w.att, avg: w.avg, label: new Date(w.week + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }));
      if (!pts.some(p => p.att != null || p.avg != null)) return '<p class="meta">Trends appear once registers are taken and work is marked.</p>';
      const W = 1000, H = 260, L = 46, R = 20, Tp = 18, B = 36, x = i => L + i * (W - L - R) / Math.max(1, pts.length - 1), y = v => Tp + (100 - v) * (H - Tp - B) / 100;
      const line = (k, col) => { let dPath = '', pen = false; pts.forEach(p => { if (p[k] == null) { pen = false; return; } dPath += (pen ? 'L' : 'M') + x(p.i).toFixed(1) + ' ' + y(p[k]).toFixed(1) + ' '; pen = true; });
        return `<path d="${dPath}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>` + pts.filter(p => p[k] != null).map(p => `<circle cx="${x(p.i)}" cy="${y(p[k])}" r="4" fill="${col}"><title>${p.label}: ${p[k]}%</title></circle>`).join(''); };
      return `<svg class="sc-trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Attendance and average score over the last 10 weeks">
        ${[0, 25, 50, 75, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ECEEF6"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="13" fill="#8A8FA3">${v}%</text>`).join('')}
        ${pts.map(p => true ? `<text x="${x(p.i)}" y="${H - 10}" text-anchor="middle" font-size="13" fill="#8A8FA3">${p.label}</text>` : '').join('')}
        ${line('att', '#2FA08A')}${line('avg', 'var(--school2)')}</svg>
        <p class="sc-legend"><span><i style="background:#2FA08A"></i>Attendance</span><span><i style="background:var(--school2)"></i>Average score</span></p>`;
    };
    const flags = w => [w.avg != null && w.avg < 60 ? `<span class="sc-flag gap">Scores ${w.avg}%</span>` : '', w.att != null && w.att < 80 ? `<span class="sc-flag att">Attendance ${w.att}%</span>` : '',
      w.done != null && w.done < 50 ? `<span class="sc-flag miss">Work done ${w.done}%</span>` : ''].join('');
    pane().innerHTML = `${scope.length ? `<p class="note">🔎 Showing your area: <b>${SC_E(scope.join(', '))}</b></p>` : ''}
      <section class="in-cards sc-cards sc-cards6">
        <div class="in-card"><span>🎯</span><b>${pc(T.avg)}</b><small>Average score</small></div>
        <div class="in-card"><span>📚</span><b>${pc(T.done)}</b><small>Work completed</small></div>
        <div class="in-card"><span>📋</span><b>${pc(T.att)}</b><small>Attendance</small></div>
        <div class="in-card"><span>🎒</span><b>${T.students || 0}</b><small>Students · ${T.classes || 0} classes</small></div>
        <div class="in-card ${T.support ? 'warn' : ''}"><span>🧡</span><b>${T.support || 0}</b><small>Need support</small></div>
        <div class="in-card"><span>✍️</span><b>${T.marking || 0}</b><small>To mark</small></div></section>
      <section class="panel sc-chart-panel"><h2>📈 The last 10 weeks</h2>${chart()}</section>
      <section class="panel in-steps"><h2>💡 Suggested next steps</h2>${steps.length ? steps.slice(0, 6).map(s => `<article class="in-step"><span class="in-step-ic">${s[0]}</span><div><b>${SC_E(s[1])}</b><p>${SC_E(s[2])}</p></div></article>`).join('')
          : '<p class="meta">Suggestions appear once teachers link courses to their classes and students complete work. 🌱</p>'}</section>
      <section class="panel"><div class="in-head"><h2>🏫 Classes</h2>${C.length ? '<button type="button" class="pill pill-soft" id="sc-csv">⬇ Download CSV</button>' : ''}</div>
        ${C.length ? `<div class="in-scroll"><table class="ac-table sc-dtable"><thead><tr><th>Class</th><th>Teacher</th><th>Students</th><th>Average</th><th>Completed</th><th>Attendance</th><th>Gaps</th><th>Need support</th><th>To mark</th></tr></thead><tbody>
          ${C.map(c => `<tr><td><button type="button" class="link-btn sc-drill" data-gid="${c.id}" data-cid="${c.course_id || ''}" data-name="${SC_E(c.name)}">${SC_E(c.name)}</button>${c.course_id ? '' : '<br><small class="meta">No course linked yet</small>'}</td>
            <td>${SC_E(c.teacher || '–')}</td><td>${c.students}</td><td class="in-c ${band(c.avg)}">${pc(c.avg)}</td><td>${pc(c.done)}</td><td class="${c.att != null && c.att < 85 ? 'sc-low' : ''}">${pc(c.att)}</td>
            <td>${c.gaps || 0}</td><td>${c.support || 0}</td><td>${c.marking || 0}</td></tr>`).join('')}</tbody></table></div>` : '<p class="meta">No classes yet.</p>'}
        <div id="sc-drill"></div></section>
      <div class="sc-two-col">
        <section class="panel"><h2>🎯 Weakest objectives</h2>${O.length ? `<div class="in-objs">${O.slice(0, 8).map(o => `<div class="in-obj ${band(o.avg)}"><div class="in-obj-top"><b>${SC_E(o.objective)}</b><span class="in-tag">${o.avg}%</span></div>
            <div class="in-bar"><i style="width:${o.avg}%"></i></div><span class="meta">${SC_E([o.grade, o.subject].filter(Boolean).join(' · '))} · ${o.results} results · ${o.classes} class${o.classes === 1 ? '' : 'es'}</span></div>`).join('')}</div>`
          : '<p class="meta">Objectives appear once marked work is linked to learning objectives.</p>'}</section>
        <section class="panel"><h2>⚠️ Early warning list</h2>${Wt.length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Student</th><th>Class</th><th>Why</th></tr></thead><tbody>
            ${Wt.map(w => `<tr><td><b>${SC_E(w.name)}</b></td><td>${SC_E(w.class)}</td><td>${flags(w)}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="meta">No students flagged. 🎉</p>'}</section></div>`;
    const csvB = document.getElementById('sc-csv');
    if (csvB) csvB.onclick = () => {
      const rows = [['Class', 'Teacher', 'Students', 'Average %', 'Completed %', 'Attendance %', 'Gap objectives', 'Need support', 'To mark']].concat(C.map(c => [c.name, c.teacher || '', c.students, c.avg ?? '', c.done ?? '', c.att ?? '', c.gaps || 0, c.support || 0, c.marking || 0]));
      const t = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' })); a.download = S.name.replace(/[^\w]+/g, '-').toLowerCase() + '-classes.csv'; document.body.appendChild(a); a.click(); a.remove();
    };
    pane().querySelectorAll('.sc-drill').forEach(b => b.onclick = () => {
      const box = document.getElementById('sc-drill');
      box.innerHTML = `<div class="sc-drill-head"><h3>📊 ${SC_E(b.dataset.name)}</h3><button type="button" class="link-btn" id="sc-drill-x">✕ Close</button></div><div id="sc-drill-in" class="insights"></div>`;
      document.getElementById('sc-drill-x').onclick = () => { box.innerHTML = ''; };
      const inBox = document.getElementById('sc-drill-in');
      if (!b.dataset.cid) inBox.innerHTML = '<p class="meta">This class has no course linked yet, so there’s no work to analyse. Its class teacher can link a course in the class’s 📊 Insights tab.</p>';
      else if (typeof inClassTab === 'function') inClassTab(inBox, Number(b.dataset.gid), Number(b.dataset.cid), b.dataset.name);
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }


  // ----- Report cycles: open, track, review, release
  const canCycle = ['principal', 'vice_principal', 'assistant_principal', 'coordinator'].includes(S.my_role) || profile.role === 'admin';
  let rcSel = null;
  async function reports() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const { data: cys, error } = await db.rpc('school_report_cycles', { sid });
    if (error) { pane().innerHTML = `<p class="empty">${SC_E(/school_report_cycles|function/.test(error.message || '') ? 'Run database update 60 to use report cycles.' : friendly(error))}</p>`; return; }
    const list = cys || [];
    if (!rcSel || !list.some(c => c.id === rcSel)) rcSel = (list.find(c => c.status === 'open') || list[0] || {}).id || null;
    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const term0 = ((S.terms || [])[0] || 'Term 1');
    pane().innerHTML = `<section class="panel sc-cycles"><div class="in-head"><h2>📝 Report cycles</h2>${canCycle ? '<button type="button" class="btn btn-red" id="rc-new-open">➕ Open a report cycle</button>' : ''}</div>
        <form class="sc-cyform" id="rc-form" hidden>
          <label>Title <input type="text" name="title" maxlength="80" required value="${SC_E(term0 + ' Report ' + (S.academic_year || ''))}"></label>
          <label>Deadline for teachers <input type="date" name="deadline"></label>
          <fieldset class="sc-scale"><legend>Attainment scale</legend>
            <label><input type="radio" name="scale" value="levels4" checked> 4 levels (Emerging, Developing, Secure, Exceeding)</label>
            <label><input type="radio" name="scale" value="1-7"> Levels 1–7</label></fieldset>
          <label>Extra comment section (optional) <input type="text" name="extra" maxlength="80" placeholder="e.g. Inquiry and ATL skills"></label>
          <label class="remember"><input type="checkbox" name="approval" checked> Leaders approve reports before they go to families</label>
          <div class="ca-bar"><button type="button" class="link-btn" id="rc-form-x">Cancel</button><button class="btn btn-red">Open cycle and tell teachers</button></div></form>
        ${list.length ? `<div class="sc-cylist">${list.map(c => `<button type="button" class="sc-cy ${c.id === rcSel ? 'on' : ''}" data-cy="${c.id}"><b>${SC_E(c.title)}</b>
            <small>${c.status === 'released' ? '✅ Released ' + fmt((c.released_at || '').slice(0, 10)) : c.deadline ? '⏰ Deadline ' + fmt(c.deadline) : 'Open'}${c.scale === '1-7' ? ' · Levels 1–7' : ''}${c.needs_approval ? ' · Approval' : ''}</small></button>`).join('')}</div>`
          : `<p class="meta">No report cycles yet. ${canCycle ? 'Open one to ask every class teacher to write their reports.' : 'Your principal or a coordinator can open one.'}</p>`}
      </section><section id="rc-cycle"></section>`;
    const f = document.getElementById('rc-form'), nb = document.getElementById('rc-new-open');
    if (nb) nb.onclick = () => { f.hidden = false; nb.hidden = true; f.title.focus(); };
    document.getElementById('rc-form-x').onclick = () => { f.hidden = true; if (nb) nb.hidden = false; };
    f.onsubmit = async e => {
      e.preventDefault(); if (f.title.value.trim().length < 2) return say('Give the report cycle a title.');
      const b = f.querySelector('.btn-red'); b.disabled = true;
      const { data: id, error: er } = await db.rpc('create_report_cycle', { sid, ctitle: f.title.value.trim(), cdeadline: f.deadline.value || null,
        cscale: f.querySelector('input[name=scale]:checked').value, cextra: f.extra.value.trim(), capproval: f.approval.checked });
      b.disabled = false;
      if (er) return say(/duplicate|unique/i.test(er.message || '') ? 'A report cycle with this title already exists.' : friendly(er));
      rcSel = id; say('📝 Report cycle opened. Every class teacher has been told.'); reports();
    };
    pane().querySelectorAll('[data-cy]').forEach(b => b.onclick = () => { rcSel = Number(b.dataset.cy); reports(); });
    if (rcSel) cycleView(list.find(c => c.id === rcSel));
  }
  async function cycleView(cy) {
    const box = document.getElementById('rc-cycle'); box.innerHTML = '<p class="empty">Loading…</p>';
    const { data, error } = await db.rpc('report_cycle_status', { cid: cy.id });
    if (error) { box.innerHTML = `<p class="empty">${SC_E(friendly(error))}</p>`; return; }
    const R = data || [], sum = k => R.reduce((a, r) => a + Number(r[k] || 0), 0);
    const students = sum('students'), sub = sum('submitted'), app = sum('approved'), pub = sum('published'), ret = sum('returned'), dr = sum('draft');
    const releasable = cy.needs_approval ? app : sum('draft');
    box.innerHTML = `<section class="panel"><div class="in-head"><h2>${SC_E(cy.title)}</h2>
        <div class="sc-cy-acts">${cy.status !== 'released' ? '<button type="button" class="pill pill-soft" id="rc-remind">🔔 Remind teachers</button>' : ''}
          ${canCycle && app ? `<button type="button" class="btn btn-red" id="rc-release">📤 Release ${app} approved report${app === 1 ? '' : 's'}</button>` : ''}</div></div>
      <div class="sc-prev-sum"><span>🎒 ${students} students</span><span>✏️ ${dr} draft</span><span class="${sub ? 'warn' : ''}">⏳ ${sub} waiting for approval</span><span>↩ ${ret} returned</span><span class="good">✅ ${app} approved</span><span>📤 ${pub} released</span></div>
      <div class="sc-bar big"><i style="width:${students ? Math.round(100 * (app + pub) / students) : 0}%"></i></div>
      ${R.length ? `<div class="in-scroll"><table class="ac-table sc-dtable"><thead><tr><th>Class</th><th>Teacher</th><th>Students</th><th>Draft</th><th>Waiting</th><th>Returned</th><th>Approved</th><th>Released</th><th></th></tr></thead><tbody>
        ${R.map(r => `<tr data-g="${r.group_id}" data-name="${SC_E(r.class_name)}"><td><b>${SC_E(r.class_name)}</b></td><td>${SC_E(r.teacher || '–')}</td><td>${r.students}</td><td>${r.draft}</td>
          <td class="${r.submitted ? 'sc-low' : ''}">${r.submitted}</td><td>${r.returned}</td><td>${r.approved}</td><td>${r.published}</td>
          <td><div class="sc-row-acts"><button type="button" class="pill pill-soft" data-rv>👀 Review</button>${r.submitted ? '<button type="button" class="link-btn" data-all>✅ Approve all</button>' : ''}</div></td></tr>`).join('')}</tbody></table></div>` : '<p class="meta">No classes in your area yet.</p>'}
      <div id="rc-review"></div></section>`;
    const rem = document.getElementById('rc-remind');
    if (rem) rem.onclick = async () => { const { data: n, error: er } = await db.rpc('remind_report_cycle', { cid: cy.id }); if (er) return say(friendly(er)); say(n ? `🔔 Reminder sent to ${n} teacher${n === 1 ? '' : 's'}.` : 'Every class is finished. 🎉'); };
    const rel = document.getElementById('rc-release');
    if (rel) rel.onclick = async () => {
      if (!confirm(`Release ${app} approved report${app === 1 ? '' : 's'} to students and parents? They’ll get a notification and an email. Released reports can no longer be changed.`)) return;
      rel.disabled = true; const { data: n, error: er } = await db.rpc('release_report_cycle', { cid: cy.id }); rel.disabled = false;
      if (er) return say(friendly(er)); say(`📤 ${n} report${n === 1 ? '' : 's'} released to families.`); reports();
    };
    box.querySelectorAll('[data-all]').forEach(b => b.onclick = async () => {
      const tr = b.closest('[data-g]'); if (!confirm(`Approve every waiting report in ${tr.dataset.name}?`)) return;
      const { data: n, error: er } = await db.rpc('approve_class_reports', { cid: cy.id, gid: Number(tr.dataset.g) });
      if (er) return say(friendly(er)); say(`✅ ${n} report${n === 1 ? '' : 's'} approved.`); cycleView(cy);
    });
    box.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => { const tr = b.closest('[data-g]'); reviewClass(cy, Number(tr.dataset.g), tr.dataset.name); });
  }
  async function reviewClass(cy, gid, cname) {
    const box = document.getElementById('rc-review'); box.innerHTML = '<p class="empty">Loading…</p>';
    const { data, error } = await db.rpc('cycle_reports', { cid: cy.id, gid, only_status: null });
    if (error) { box.innerHTML = `<p class="empty">${SC_E(friendly(error))}</p>`; return; }
    const L = data || [];
    const chip = st => ({ draft: '✏️ Draft', ready: '✅ Ready', submitted: '⏳ Waiting', returned: '↩ Returned', approved: '✅ Approved', published: '📤 Released' })[st] || st;
    box.innerHTML = `<div class="sc-drill-head"><h3>👀 ${SC_E(cname)}</h3><span><button type="button" class="pill pill-soft" id="rc-print-cls">🖨️ Print this class</button> <button type="button" class="link-btn" id="rc-rv-x">✕ Close</button></span></div>
      ${L.length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Student</th><th>Status</th><th></th></tr></thead><tbody>
        ${L.map((r, i) => `<tr data-i="${i}"><td><b>${SC_E(r.student_name)}</b>${r.leader_note ? `<br><small class="rc-note">“${SC_E(r.leader_note)}”</small>` : ''}</td><td>${chip(r.status)}</td>
          <td><div class="sc-row-acts"><button type="button" class="pill pill-soft" data-read>📖 Read</button>${r.status === 'submitted' || r.status === 'ready' ? '<button type="button" class="link-btn" data-ok>✅ Approve</button><button type="button" class="link-btn" data-back>↩ Return</button>' : ''}</div></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="meta">No reports written for this class yet.</p>'}
      <div id="rc-read"></div>`;
    document.getElementById('rc-rv-x').onclick = () => { box.innerHTML = ''; };
    const meta = r => ({ term: r.term, data: r.data, student_name: r.student_name, class_name: r.class_name, teacher_name: r.teacher });
    document.getElementById('rc-print-cls').onclick = () => { if (!L.length) return say('No reports to print yet.'); rcPrint(L.map(meta), cname + ' – ' + cy.title); };
    const act = async (r, ok) => {
      let note = '';
      if (!ok) { note = prompt(`What should the teacher change in ${r.student_name}’s report?`, ''); if (note === null) return; }
      const { error: er } = await db.rpc('review_report', { rid: r.id, ok, note });
      if (er) return say(friendly(er)); say(ok ? '✅ Approved.' : '↩ Returned to the teacher with your note.'); reviewClass(cy, gid, cname); cycleView(cy);
    };
    box.querySelectorAll('[data-i]').forEach(tr => {
      const r = L[Number(tr.dataset.i)];
      const rd = tr.querySelector('[data-read]'); if (rd) rd.onclick = () => {
        const v = document.getElementById('rc-read');
        v.innerHTML = `<div class="sc-read">${rcReportHtml(meta(r))}${r.status === 'submitted' || r.status === 'ready' ? `<div class="ca-bar sc-read-acts"><button type="button" class="btn btn-white outline" data-rback>↩ Return with a note</button><button type="button" class="btn btn-red" data-rok>✅ Approve</button></div>` : ''}</div>`;
        const o = v.querySelector('[data-rok]'); if (o) o.onclick = () => act(r, true);
        const k = v.querySelector('[data-rback]'); if (k) k.onclick = () => act(r, false);
        v.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      const ok = tr.querySelector('[data-ok]'); if (ok) ok.onclick = () => act(r, true);
      const bk = tr.querySelector('[data-back]'); if (bk) bk.onclick = () => act(r, false);
    });
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }


  // ----- Announcements
  async function announce() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const [{ data: sent, error }, { data: cls }] = await Promise.all([db.rpc('school_announcements', { sid }), db.rpc('school_classes', { sid })]);
    if (error) { pane().innerHTML = `<p class="empty">${SC_E(/school_announcements|function/.test(error.message || '') ? 'Run database update 61 to use announcements.' : friendly(error))}</p>`; return; }
    const AUD = [['all', '🏫 Whole school'], ['staff', '👩‍🏫 All staff'], ['parents', '👪 All parents'], ['students', '🎒 All students'], ['grade', '🎓 One grade'], ['class', '🏫 One class']];
    const audLabel = a => a.audience === 'grade' ? '🎓 ' + (a.target || '') : a.audience === 'class' ? '🏫 ' + (((cls || []).find(c => String(c.id) === a.target) || {}).name || 'A class') : (AUD.find(x => x[0] === a.audience) || ['', ''])[1];
    const L = sent || [];
    pane().innerHTML = `<form class="panel sc-an-form" id="an-form"><h2>📣 New announcement</h2>
        <label>Title <input type="text" name="title" maxlength="120" required placeholder="e.g. Sports Day is on Thursday 20 November"></label>
        <label>Message <textarea name="body" rows="6" maxlength="4000" required placeholder="Write your message. You can add links, e.g. to a form or a newsletter."></textarea></label>
        <div class="sc-an-row"><label>Who is it for? <select name="aud">${AUD.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
          <label class="sc-an-t" data-t="grade" hidden>Grade <select name="grade">${(S.grades || []).map(g => `<option>${SC_E(g)}</option>`).join('')}</select></label>
          <label class="sc-an-t" data-t="class" hidden>Class <select name="cls">${(cls || []).map(c => `<option value="${c.id}">${SC_E(c.name)}</option>`).join('')}</select></label>
          <span class="sc-reach" id="an-reach"></span></div>
        <label class="remember"><input type="checkbox" name="pin"> 📌 Pin to the top</label>
        <label class="remember"><input type="checkbox" name="email"> 📧 Also send by email <small class="meta" id="an-email-note"></small></label>
        <div class="ca-bar"><span class="meta">Everyone it’s for gets a 🔔 notification straight away.</span><button class="btn btn-red">📣 Post announcement</button></div></form>
      <section class="panel"><h2>📬 Sent announcements</h2>${L.length ? L.map(a => `<article class="sc-an" data-an="${a.id}">
          <div class="sc-an-head"><div><b>${a.pinned ? '📌 ' : ''}${SC_E(a.title)}</b><span class="meta">${SC_E(audLabel(a))} · ${new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${SC_E(a.author_name || '')}${a.emailed ? ' · 📧 emailed' : ''}</span></div>
            <div class="sc-an-acts"><button type="button" class="link-btn" data-pin>${a.pinned ? 'Unpin' : '📌 Pin'}</button><button type="button" class="link-btn danger" data-del>Delete</button></div></div>
          <p class="sc-an-body">${SC_E(a.body).replace(/\n/g, '<br>')}</p>
          <div class="sc-an-read"><div class="sc-bar"><i style="width:${a.reach ? Math.round(100 * a.reads / a.reach) : 0}%"></i></div><span class="meta">✓ Read by <b>${a.reads}</b> of ${a.reach}</span></div></article>`).join('')
        : '<p class="meta">Nothing sent yet.</p>'}</section>`;
    const f = document.getElementById('an-form');
    const target = () => f.aud.value === 'grade' ? f.grade.value : f.aud.value === 'class' ? f.cls.value : '';
    let reachN = 0;
    const reach = async () => {
      f.querySelectorAll('.sc-an-t').forEach(x => { x.hidden = x.dataset.t !== f.aud.value; });
      const el = document.getElementById('an-reach'); el.textContent = 'Counting…';
      const { data: n, error: er } = await db.rpc('announcement_reach', { sid, aud: f.aud.value, atarget: target() });
      reachN = er ? 0 : (n || 0); el.innerHTML = er ? '' : `👥 Reaches <b>${reachN}</b> ${reachN === 1 ? 'person' : 'people'}`;
      document.getElementById('an-email-note').textContent = reachN > 300 ? `(${reachN} emails: email works best for smaller groups, as the email service sends about 500 a day)` : '';
    };
    f.aud.onchange = reach; f.grade.onchange = reach; f.cls.onchange = reach; reach();
    f.onsubmit = async e => {
      e.preventDefault();
      if (f.title.value.trim().length < 2 || !f.body.value.trim()) return say('Please write a title and a message.');
      if (!confirm(`Post this announcement to ${reachN} ${reachN === 1 ? 'person' : 'people'}${f.email.checked ? ', and email them' : ''}?`)) return;
      const b = f.querySelector('.btn-red'); b.disabled = true;
      const { data: n, error: er } = await db.rpc('post_announcement', { sid, atitle: f.title.value.trim(), abody: f.body.value.trim(), aud: f.aud.value, atarget: target(), apin: f.pin.checked, aemail: f.email.checked });
      b.disabled = false;
      if (er) return say(friendly(er));
      say(`📣 Posted. ${n} ${n === 1 ? 'person has' : 'people have'} been notified.`); announce();
    };
    pane().querySelectorAll('[data-an]').forEach(card => {
      const id = Number(card.dataset.an), a = L.find(x => x.id === id);
      card.querySelector('[data-pin]').onclick = async () => { const { error: er } = await db.rpc('update_announcement', { aid: id, apin: !a.pinned, aremove: false }); if (er) return say(friendly(er)); announce(); };
      card.querySelector('[data-del]').onclick = async () => { if (!confirm('Delete this announcement for everyone?')) return; const { error: er } = await db.rpc('update_announcement', { aid: id, apin: null, aremove: true }); if (er) return say(friendly(er)); say('Deleted.'); announce(); };
    });
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
      const { error: er } = await db.storage.from('school-logos').upload(path, file, { contentType: file.type });
      if (er) { up.value = ''; return say('The logo couldn’t be uploaded: ' + (er.message || friendly(er)) + '. Please send a screenshot of this message to the Think Nest team.'); }
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

  // ----- Import (staff, or students with parents)
  let scExisting = new Set();
  function importTab() {
    db.rpc('school_people', { sid }).then(({ data }) => { scExisting = new Set((data || []).filter(p => p.role === 'student').map(p => (String(p.full_name || '') + '|' + String(p.grade || '')).toLowerCase())); });
    pane().innerHTML = `<section class="sc-imp-cards">
        <article class="panel sc-imp"><span class="sc-imp-ic">👩‍🏫</span><h2>Import staff</h2>
          <p class="meta">Columns: <b>Full name, Email, Role, Job title, Grades, Subjects</b>. Each person logs in with their email.</p>
          <div class="sc-imp-btns"><button type="button" class="pill pill-soft" data-tpl="staff">⬇ Template</button>
            <label class="btn btn-red sc-imp-up">📤 Choose file<input type="file" data-kind="staff" accept=".xlsx,.xls,.csv,.txt" hidden></label></div></article>
        <article class="panel sc-imp"><span class="sc-imp-ic">🎒</span><h2>Import students and parents</h2>
          <p class="meta">Columns: <b>Full name, Grade, Section, Parent name, Parent email</b>. Classes are created for each grade and section.</p>
          <div class="sc-imp-btns"><button type="button" class="pill pill-soft" data-tpl="students">⬇ Template</button>
            <label class="btn btn-red sc-imp-up">📤 Choose file<input type="file" data-kind="students" accept=".xlsx,.xls,.csv,.txt" hidden></label></div></article>
      </section>
      <section id="sc-imp-out"></section>`;
    pane().querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => scTemplate(b.dataset.tpl));
    pane().querySelectorAll('input[type=file][data-kind]').forEach(inp => inp.onchange = async () => {
      const file = inp.files[0]; inp.value = ''; if (!file) return;
      const out = document.getElementById('sc-imp-out'); out.innerHTML = '<p class="empty">Reading the file…</p>';
      try { const sheets = await scReadFile(file); scPreview(out, inp.dataset.kind, sheets, file.name); }
      catch (e) { out.innerHTML = `<p class="note">⚠️ ${SC_E(e.message || 'This file couldn’t be read.')} Please use the template (Excel or CSV).</p>`; }
    });
  }
  function scPreview(out, kind, sheets, fname, pickName) {
    const names = Object.keys(sheets);
    const best = pickName || names.find(n => new RegExp(kind === 'staff' ? '^staff' : '^students?$', 'i').test(n.trim())) || names[0];
    const v = kind === 'staff' ? scCheckStaff(sheets[best]) : scCheckStudents(sheets[best]);
    if (kind === 'students') v.forEach(r => { if (r.name && r.grade && scExisting.has((r.name + '|' + r.grade).toLowerCase())) r.problems.push('Already in the school in this grade (skipped so they aren’t added twice)'); });
    const ok = v.filter(r => !r.problems.length), bad = v.filter(r => r.problems.length);
    const classes = kind === 'students' ? [...new Set(ok.map(r => r.grade + (r.section ? ' ' + r.section : '')))] : [];
    const parents = kind === 'students' ? [...new Set(ok.filter(r => r.parent_email).map(r => r.parent_email))] : [];
    out.innerHTML = `<section class="panel sc-prev"><h2>👀 Check before importing</h2>
      <p class="meta">File: <b>${SC_E(fname)}</b>${names.length > 1 ? ` · Sheet <select id="sc-sheet">${names.map(n => `<option ${n === best ? 'selected' : ''}>${SC_E(n)}</option>`).join('')}</select>` : ''}</p>
      <div class="sc-prev-sum">
        <span class="good">✅ ${ok.length} ${kind === 'staff' ? 'staff' : 'student' + (ok.length === 1 ? '' : 's')} ready</span>
        ${kind === 'students' ? `<span>🏫 ${classes.length} class${classes.length === 1 ? '' : 'es'}: ${SC_E(classes.join(', ') || '–')}</span><span>👪 ${parents.length} parent${parents.length === 1 ? '' : 's'}</span>` : ''}
        ${bad.length ? `<span class="bad">⚠️ ${bad.length} row${bad.length === 1 ? '' : 's'} with problems (they will be skipped)</span>` : ''}</div>
      ${bad.length ? `<div class="in-scroll"><table class="ac-table sc-bad"><thead><tr><th>Row</th><th>Name</th><th>Problem</th></tr></thead><tbody>${bad.map(r => `<tr><td>${r.row}</td><td>${SC_E(r.name || '–')}</td><td>${SC_E(r.problems.join('; '))}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <details class="sc-ok-list"><summary>See the ${ok.length} row${ok.length === 1 ? '' : 's'} that will be imported</summary><div class="in-scroll"><table class="ac-table"><tbody>
        ${ok.map(r => kind === 'staff' ? `<tr><td>${SC_E(r.name)}</td><td>${SC_E(r.email)}</td><td>${SC_E(scRole(r.role))}</td><td class="meta">${SC_E([r.title].concat(r.grades, r.subjects).filter(Boolean).join(' · '))}</td></tr>`
          : `<tr><td>${SC_E(r.name)}</td><td>${SC_E(r.grade + (r.section ? ' ' + r.section : ''))}</td><td class="meta">${SC_E(r.parent_name ? r.parent_name + ' · ' + r.parent_email : '')}</td></tr>`).join('')}</tbody></table></div></details>
      <div class="ca-bar"><span class="meta">${kind === 'staff' ? 'New staff get a welcome email and choose their own password with “Forgot password?”.' : 'Students get usernames and passwords for their login cards. New parents get a welcome email.'}</span>
        <button type="button" class="btn btn-red" id="sc-go" ${ok.length ? '' : 'disabled'}>✅ Confirm and import ${ok.length}</button></div></section>`;
    const sh = document.getElementById('sc-sheet'); if (sh) sh.onchange = () => scPreview(out, kind, sheets, fname, sh.value);
    document.getElementById('sc-go').onclick = () => scRun(out, kind, ok);
  }
  async function scRun(out, kind, rows) {
    if (!confirm(`Import ${rows.length} ${kind === 'staff' ? 'staff' : 'students'} into ${S.name}? This creates accounts${kind === 'students' ? ', classes and parent links' : ''}.`)) return;
    out.innerHTML = `<section class="panel sc-run"><h2>⏳ Importing…</h2><div class="sc-bar"><i id="sc-bar" style="width:0%"></i></div><p class="meta" id="sc-bar-t">Starting…</p>
      <p class="note">Please keep this page open until it finishes.</p></section>`;
    const size = kind === 'staff' ? 8 : 6, all = [];
    for (let i = 0; i < rows.length; i += size) {
      const part = rows.slice(i, i + size);
      try {
        const { data, error } = await db.functions.invoke(CA_FN_SCHOOL, { body: { action: 'school_import', school_id: sid, kind, rows: part } });
        if (error) { let m = error.message; try { const j = await error.context.json(); m = j.error || m; } catch (_) {} throw new Error(m); }
        if (data && data.error) throw new Error(data.error);
        all.push(...(data.results || []));
      } catch (e) { part.forEach(r => all.push({ row: r.row, name: r.name, error: e.message })); }
      const done = Math.min(i + size, rows.length);
      document.getElementById('sc-bar').style.width = Math.round(100 * done / rows.length) + '%';
      document.getElementById('sc-bar-t').textContent = `${done} of ${rows.length} done`;
    }
    scResults(out, kind, all);
  }
  function scResults(out, kind, res) {
    const ok = res.filter(r => !r.error), bad = res.filter(r => r.error);
    const csv = (name, rows) => { const t = rows.map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
    const parents = kind === 'students' ? ok.filter(r => r.parent && !r.parent.error) : [];
    const newParents = [...new Map(parents.filter(r => r.parent.status === 'created').map(r => [r.parent.email, r.parent])).values()];
    out.innerHTML = `<section class="panel sc-done"><h2>🎉 Import finished</h2>
      <div class="sc-prev-sum"><span class="good">✅ ${ok.length} imported</span>${kind === 'staff' ? `<span>🆕 ${ok.filter(r => r.status === 'created').length} new accounts</span><span>➕ ${ok.filter(r => r.status === 'added').length} existing accounts added</span>`
        : `<span>👪 ${newParents.length} new parent accounts</span>`}${bad.length ? `<span class="bad">⚠️ ${bad.length} not imported</span>` : ''}</div>
      <p class="note">🔐 <b>Passwords are shown only now.</b> Download the lists before leaving this page, and keep them safe.</p>
      <div class="ca-bar">${kind === 'staff' ? '<button type="button" class="btn btn-red" data-dl="staff">⬇ Staff logins (CSV)</button>'
        : '<button type="button" class="btn btn-red" data-dl="cards">🖨️ Student login cards</button><button type="button" class="btn btn-white outline" data-dl="students">⬇ Student logins (CSV)</button>' + (newParents.length ? '<button type="button" class="btn btn-white outline" data-dl="parents">⬇ Parent logins (CSV)</button>' : '')}
        <button type="button" class="link-btn" data-dl="again">📥 Import another file</button></div>
      ${bad.length ? `<div class="in-scroll"><table class="ac-table sc-bad"><thead><tr><th>Row</th><th>Name</th><th>Why it wasn’t imported</th></tr></thead><tbody>${bad.map(r => `<tr><td>${r.row || ''}</td><td>${SC_E(r.name || '')}</td><td>${SC_E(r.error)}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>`;
    out.querySelector('.ca-bar').onclick = e => {
      const b = e.target.closest('[data-dl]'); if (!b) return;
      if (b.dataset.dl === 'again') return importTab();
      if (b.dataset.dl === 'staff') return csv('staff-logins.csv', [['Name', 'Email', 'Role', 'Status', 'Starting password', 'Website']].concat(ok.map(r => [r.name, r.email, scRole(r.role), r.status === 'created' ? 'New account' : 'Existing account added', r.password || '(their own password)', 'thinknestonline.com'])));
      if (b.dataset.dl === 'students') return csv('student-logins.csv', [['Name', 'Class', 'Username', 'Password', 'Website']].concat(ok.map(r => [r.name, r.grade + (r.section ? ' ' + r.section : ''), r.username, r.password, 'thinknestonline.com'])));
      if (b.dataset.dl === 'parents') return csv('parent-logins.csv', [['Parent', 'Email', 'Starting password', 'Children', 'Website']].concat(newParents.map(p => [p.name, p.email, p.password, parents.filter(r => r.parent.email === p.email).map(r => r.name).join(', '), 'thinknestonline.com'])));
      if (b.dataset.dl === 'cards') {
        const byClass = {}; ok.forEach(r => { const k = r.grade + (r.section ? ' ' + r.section : ''); (byClass[k] = byClass[k] || []).push(r); });
        const list = Object.keys(byClass).sort().flatMap(k => byClass[k].map(r => ({ name: r.name, username: r.username, password: r.password, cls: k })));
        if (typeof caPrint === 'function') return caPrint(list.map(r => ({ ...r, name: r.name + ' · ' + r.cls })), S.name);
      }
    };
  }

  const start = (location.hash || '').slice(1);
  show(tabs.some(t => t[0] === start) ? start : 'overview');
}


// ---------- Import helpers (read Excel/CSV, check rows, templates) ----------
const CA_FN_SCHOOL = 'quick-worker';   // the Edge Function "create-students"
function scLoadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    sc.onload = () => ok(window.XLSX); sc.onerror = () => no(new Error('The Excel reader couldn’t load. Check your internet connection, or save the file as CSV.')); document.head.appendChild(sc); });
}
function scParseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',' || c === ';' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}
async function scReadFile(file) {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const X = await scLoadXlsx(), wb = X.read(await file.arrayBuffer(), { type: 'array' }), out = {};
    wb.SheetNames.forEach(n => { out[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false }).filter(r => r.some(x => String(x).trim())); });
    return out;
  }
  return { Sheet1: scParseCsv((await file.text()).replace(/^\ufeff/, '')) };
}
function scTable(rows) {
  if (!rows || !rows.length) return [];
  const head = rows[0].map(h => String(h).trim().toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' '));
  return rows.slice(1).map((r, i) => { const o = { row: i + 2 }; head.forEach((h, j) => { o[h] = String(r[j] == null ? '' : r[j]).trim(); }); return o; });
}
const scCol = (o, ...names) => { for (const n of names) if (o[n] != null && o[n] !== '') return o[n]; return ''; };
const scList = v => String(v || '').split(/[,;]/).map(x => x.trim()).filter(Boolean);
const scEmailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
function scGrade(g) { const t = String(g || '').trim().toLowerCase().replace(/\s+/g, ' '); return SC_ALL_GRADES.find(x => x.toLowerCase() === t || x.toLowerCase().replace(' ', '') === t.replace(' ', '')) || null; }
function scCheckStaff(rows) {
  const seen = new Set();
  return scTable(rows).map(o => {
    const r = { row: o.row, name: scCol(o, 'full name', 'name'), email: scCol(o, 'email', 'work email').toLowerCase(), title: scCol(o, 'job title', 'title'),
      grades: scList(scCol(o, 'grades', 'grade')), subjects: scList(scCol(o, 'subjects', 'subject')), problems: [] };
    const roleTxt = scCol(o, 'role').toLowerCase();
    const role = SC_ROLES.find(([k, l]) => l.toLowerCase() === roleTxt || k === roleTxt.replace(/\s+/g, '_'));
    r.role = role ? role[0] : '';
    if (r.name.length < 2) r.problems.push('No name');
    if (!scEmailOk(r.email)) r.problems.push('Email is missing or not valid');
    else if (seen.has(r.email)) r.problems.push('Same email appears twice'); else seen.add(r.email);
    if (!role || ['student', 'parent'].includes(r.role)) r.problems.push('Role should be Teacher, Coordinator, Head of department, Inclusion lead, Admin staff, or Vice/Assistant principal');
    const badG = r.grades.filter(g => !scGrade(g)); if (badG.length) r.problems.push('Unknown grade: ' + badG.join(', '));
    r.grades = r.grades.map(scGrade).filter(Boolean);
    return r;
  }).filter(r => r.name || r.email);
}
function scCheckStudents(rows) {
  const seen = new Set();
  return scTable(rows).map(o => {
    const gtxt = scCol(o, 'grade', 'year');
    const r = { row: o.row, name: scCol(o, 'full name', 'name', 'student name'), grade: scGrade(gtxt), section: scCol(o, 'section', 'class').toUpperCase().slice(0, 5),
      parent_name: scCol(o, 'parent name', 'parent'), parent_email: scCol(o, 'parent email').toLowerCase(), problems: [] };
    if (r.name.length < 2) r.problems.push('No student name');
    if (!gtxt) r.problems.push('No grade'); else if (!r.grade) r.problems.push(`Grade “${gtxt}” doesn’t exist (use KG1, KG2, Grade 1 … Grade 12)`);
    if (r.parent_email && !scEmailOk(r.parent_email)) r.problems.push('Parent email is not valid');
    const key = (r.name + '|' + r.grade + '|' + r.section).toLowerCase();
    if (r.name && r.grade) { if (seen.has(key)) r.problems.push('Same student appears twice in the same class'); else seen.add(key); }
    return r;
  }).filter(r => r.name || r.grade || r.parent_email);
}
function scTemplate(kind) {
  const rows = kind === 'staff'
    ? [['Full name', 'Email', 'Role', 'Job title', 'Grades', 'Subjects'], ['Sarah Thompson', 'sarah@yourschool.ae', 'Teacher', 'KG2 Homeroom Teacher', 'KG2', 'English, Maths']]
    : [['Full name', 'Grade', 'Section', 'Parent name', 'Parent email'], ['Ahmed Al Hashimi', 'KG2', 'A', 'Fatima Al Hashimi', 'fatima@example.com']];
  const t = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' })); a.download = kind === 'staff' ? 'staff-template.csv' : 'students-template.csv';
  document.body.appendChild(a); a.click(); a.remove();
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
