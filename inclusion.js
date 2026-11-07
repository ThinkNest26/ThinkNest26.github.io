// ===== Think Nest for Schools: inclusion tracking (private) =====
const IN_E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IN_KIND = { send: ['🧩', 'SEND / Determination'], gt: ['🌟', 'Gifted and talented'], ell: ['🗣️', 'English language learner'], other: ['💛', 'Other support'] };
const IN_CAT = { send: ['Cognition and learning', 'Communication and interaction', 'Social, emotional and mental health', 'Sensory and physical', 'Medical'],
  gt: ['Academic', 'Creative and arts', 'Sport', 'Leadership', 'Other'], ell: ['Beginner', 'Developing', 'Expanding', 'Bridging'], other: ['Wellbeing', 'Family circumstances', 'Attendance', 'Behaviour', 'Other'] };
const IN_PLAN = { iep: 'Individual education plan (IEP)', alp: 'Advanced learning plan (ALP)', ell: 'Language support plan', behaviour: 'Behaviour support plan', other: 'Support plan' };
const IN_TS = { todo: '⚪ Not started', doing: '🟡 In progress', done: '✅ Achieved' };
const IN_PROG = { good: '🟢 Good progress', some: '🟡 Some progress', little: '🔴 Little progress' };
const inDate = d => d ? new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

async function startInclusion() {
  const { user, profile } = await initTeacher();
  const box = document.getElementById('inclusion');
  const { data: scs } = await db.rpc('my_schools');
  const S = (scs || []).find(s => !['student', 'parent'].includes(s.my_role));
  if (!S) { box.innerHTML = '<div class="empty-box"><p>Inclusion tracking is part of Think Nest for Schools, for staff of a school.</p></div>'; return; }
  document.documentElement.style.setProperty('--school', S.color_primary || '#3E4B94'); document.documentElement.style.setProperty('--school2', S.color_accent || '#F27A6F');
  const canManage = ['principal', 'vice_principal', 'it', 'inclusion_lead', 'inclusion_team'].includes(S.my_role) || profile.role === 'admin';
  const canOverview = canManage;
  if (!canOverview) { box.innerHTML = '<div class="empty-box"><p>🔒 Inclusion is for the school’s inclusion team and leaders.</p></div>'; return; }
  let STU = [], NEEDS = [];
  const load = async () => {
    const [{ data: st, error }, { data: nd }] = await Promise.all([db.rpc('inclusion_students', { sid: S.id }), db.from('student_needs').select('*').eq('school_id', S.id).eq('active', true)]);
    if (error) throw error; STU = st || []; NEEDS = nd || [];
  };
  try { await load(); } catch (e) { box.innerHTML = `<p class="empty">${IN_E(/inclusion_students|function/.test(e.message || '') ? 'Run database update 65 to use inclusion tracking.' : friendly(e))}</p>`; return; }
  const canTeam = ['principal', 'vice_principal', 'it', 'inclusion_lead'].includes(S.my_role) || profile.role === 'admin';
  const tabs = (canOverview ? [['overview', '📊 Overview']] : []).concat([['students', canManage || canOverview ? '🧩 Students' : '👩‍🏫 My students with additional needs']]).concat(canTeam ? [['team', '🤝 Inclusion team']] : []);
  box.innerHTML = `<div class="page-head"><h1 class="title">🧩 Inclusion</h1></div>
    <p class="note">🔒 <b>Private.</b> Only senior leaders, the inclusion lead and the inclusion team can see this page’s information.</p>
    <div class="tabs sc-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="false" data-it="${k}">${l}</button>`).join('')}</div><section id="in-pane"></section>`;
  const pane = () => document.getElementById('in-pane');
  const show = (k, arg) => { document.querySelectorAll('[data-it]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.it === k))); ({ overview, students, profile: student, team })[k](arg); };
  document.querySelector('.sc-tabs').addEventListener('click', e => { const b = e.target.closest('[data-it]'); if (b) show(b.dataset.it); });
  const tags = sid => NEEDS.filter(n => n.student_id === sid).map(n => `<span class="in-tag-k k-${n.kind}" title="${IN_E(n.category || '')}">${IN_KIND[n.kind][0]} ${IN_E(n.category || IN_KIND[n.kind][1])}</span>`).join('');
  const nameOf = id => (STU.find(s => s.id === id) || {}).full_name || 'Student';
  const diff = (a, b) => a == null || b == null ? '' : `<small class="${a - b < -4 ? 'in-dn' : a - b > 4 ? 'in-up' : 'meta'}">${a - b > 0 ? '+' : ''}${Math.round(a - b)} vs others</small>`;

  // ----- the inclusion team (LSAs): the inclusion lead adds and removes them
  async function team() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const { data: P } = await db.rpc('school_people', { sid: S.id });
    const lead = (P || []).filter(p => p.role === 'inclusion_lead'), T = (P || []).filter(p => p.role === 'inclusion_team');
    const card = (p, rm) => `<div class="sc-admin" data-uid="${p.user_id}"><span class="initials">${IN_E((p.full_name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
      <div><b>${IN_E(p.full_name || '')}</b><small class="meta">${IN_E(p.title || (p.role === 'inclusion_lead' ? 'Inclusion lead' : 'Learning Support Assistant'))} · ${IN_E(p.email || '')}</small></div>
      ${rm ? `<button type="button" class="link-btn danger" data-rmlsa data-name="${IN_E(p.full_name || '')}">Remove</button>` : ''}</div>`;
    pane().innerHTML = `<section class="panel"><h2>🤝 Inclusion team</h2><p class="meta">The inclusion lead and learning support assistants (LSAs). Team members can see and update students’ support plans, IEPs, notes and wellbeing follow-ups.</p>
        <div class="sc-admin-list">${lead.map(p => card(p, false)).join('')}${T.map(p => card(p, canTeam)).join('') || (lead.length ? '' : '<p class="meta">No inclusion team yet.</p>')}</div></section>
      ${canTeam ? `<section class="panel"><h2>➕ Add an LSA</h2><p class="meta">If they’re new to Think Nest, their account is created with a starting password you can print. They log in through <b>Schools → School Staff → Inclusion team</b>.</p>
        <form id="lsa-add" class="sc-add-grid"><label>Full name <input type="text" name="n" required maxlength="80"></label><label>School email <input type="email" name="e" required placeholder="name@school.ae"></label>
          <label>Job title <input type="text" name="t" maxlength="80" value="Learning Support Assistant"></label><button class="btn btn-red">Add to the team</button></form><div id="lsa-out"></div></section>` : ''}`;
    const f = document.getElementById('lsa-add');
    if (f) f.onsubmit = async e => {
      e.preventDefault(); const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Adding…';
      const { data, error } = await db.functions.invoke('quick-worker', { body: { action: 'school_import', school_id: S.id, kind: 'staff', rows: [{ row: 1, name: f.n.value.trim(), email: f.e.value.trim().toLowerCase(), role: 'inclusion_team', title: f.t.value.trim() || 'Learning Support Assistant', grades: [], subjects: [] }] } });
      b.disabled = false; b.textContent = 'Add to the team';
      let msg = error && error.message; if (error) { try { const j = await error.context.json(); msg = j.error || msg; } catch (_) {} return say(msg); }
      const r = ((data || {}).results || [])[0] || {}; if (r.error) return say(r.error);
      await team();
      const out = document.getElementById('lsa-out');
      out.innerHTML = r.status === 'created' ? `<div class="note sc-added">✅ <b>${IN_E(r.name)}</b> is in the inclusion team, and their account was created.<br>Email: <b>${IN_E(r.email)}</b> · Starting password: <code>${IN_E(r.password)}</code>
          <div class="ca-bar"><span class="meta">🔐 Shown only now. They’ll choose their own password the first time they log in.</span><button type="button" class="btn btn-red" id="lsa-card">🖨️ Print login card</button></div></div>`
        : `<div class="note sc-added">✅ <b>${IN_E(r.name || '')}</b> already had a Think Nest account, and is now in the inclusion team.</div>`;
      const pc = document.getElementById('lsa-card');
      if (pc) pc.onclick = () => { const w = window.open('', '_blank'); if (!w) return say('Please allow pop-ups to print.');
        w.document.write(`<html><head><meta charset="utf-8"><title>Login card</title><style>body{font-family:Arial,sans-serif;margin:20px}.c{border:2px dashed #9AA0B5;border-radius:14px;padding:16px;max-width:420px}.s{color:${S.color_primary};font-weight:800;font-size:12px;text-transform:uppercase}.n{font-size:19px;font-weight:800;margin:6px 0 10px}.r{margin:4px 0}.r b{display:inline-block;width:130px;color:#555}code{font-size:15px;background:#F1F2F8;padding:2px 6px;border-radius:6px}.h{font-size:12px;color:#555;margin-top:8px}</style></head>
          <body><div class="c"><div class="s">${IN_E(S.name)} · Think Nest</div><div class="n">${IN_E(r.name)}</div><div class="r"><b>Website</b>thinknestonline.com → Log in → Schools</div><div class="r"><b>Email</b>${IN_E(r.email)}</div><div class="r"><b>Starting password</b><code>${IN_E(r.password)}</code></div>
          <div class="h">You’ll choose your own password the first time you log in.</div></div></body></html>`); w.document.close(); setTimeout(() => w.print(), 400); };
    };
    pane().querySelectorAll('[data-rmlsa]').forEach(b => b.onclick = async () => {
      if (!confirm(`Remove ${b.dataset.name} from the inclusion team and from ${S.name}? Their account stays, but they lose access to the school.`)) return;
      const { error } = await db.rpc('school_remove_member', { sid: S.id, uid: b.closest('[data-uid]').dataset.uid });
      if (error) return say(friendly(error)); say('Removed.'); team();
    });
  }

  // ----- overview (leaders)
  async function overview() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const { data: d, error } = await db.rpc('inclusion_overview', { sid: S.id });
    if (error) { pane().innerHTML = `<p class="empty">${IN_E(friendly(error))}</p>`; return; }
    const G = d.groups || {}, P = d.plans || {};
    pane().innerHTML = `<section class="in-cards sc-cards">${Object.entries(IN_KIND).map(([k, [ic, l]]) => `<div class="in-card"><span>${ic}</span><b>${(G[k] || {}).count || 0}</b><small>${l}</small></div>`).join('')}</section>
      <div class="sc-two-col"><section class="panel"><h2>📈 How each group is doing</h2><p class="meta">Average score and attendance for each group, compared with the other students in your school.</p>
        <div class="in-scroll"><table class="ac-table in-cmp"><thead><tr><th>Group</th><th>Students</th><th>Average score</th><th>Attendance</th></tr></thead><tbody>
        ${Object.entries(IN_KIND).map(([k, [ic, l]]) => { const g = G[k] || {}; return `<tr><td><b>${ic} ${l}</b></td><td>${g.count || 0}</td>
          <td>${g.avg == null ? '–' : `<b>${g.avg}%</b><br>${diff(g.avg, g.others_avg)}`}</td><td>${g.att == null ? '–' : `<b>${g.att}%</b><br>${diff(g.att, g.others_att)}`}</td></tr>`; }).join('')}
        <tr class="in-all"><td>All students</td><td>${d.students}</td><td>${d.all.avg == null ? '–' : d.all.avg + '%'}</td><td>${d.all.att == null ? '–' : d.all.att + '%'}</td></tr></tbody></table></div></section>
      <section class="panel"><h2>📋 Support plans</h2><div class="sc-prev-sum"><span>📋 ${P.active || 0} active plans</span><span class="good">✅ ${P.targets_done || 0} of ${P.targets_all || 0} targets achieved</span></div>
        <div class="sc-bar big"><i style="width:${P.targets_all ? Math.round(100 * P.targets_done / P.targets_all) : 0}%"></i></div>
        <h3 class="sc-h3">⏰ Reviews due in the next 2 weeks</h3>${(d.due || []).length ? `<div class="in-due">${d.due.map(x => `<button type="button" class="in-due-row" data-stu="${x.student_id}"><b>${IN_E(x.name)}</b><span>${IN_E(x.title)}</span><span class="${x.review_on < new Date().toISOString().slice(0, 10) ? 'sc-low' : ''}">${inDate(x.review_on)}</span></button>`).join('')}</div>` : '<p class="meta">No reviews due. 🎉</p>'}</section></div>`;
    pane().querySelectorAll('[data-stu]').forEach(b => b.onclick = () => show('profile', b.dataset.stu));
  }

  // ----- students with needs (and adding a need)
  function students() {
    let kind = '', q = '';
    const draw = () => {
      const withNeeds = STU.filter(s => NEEDS.some(n => n.student_id === s.id));
      const shown = withNeeds.filter(s => (!kind || NEEDS.some(n => n.student_id === s.id && n.kind === kind)) && (!q || s.full_name.toLowerCase().includes(q.toLowerCase())));
      pane().innerHTML = `${canManage ? `<form class="panel in-add" id="in-add"><h2>➕ Add a student to a group</h2>
          <div class="in-add-grid"><label>Student <input type="text" list="in-stu-list" name="stu" placeholder="Start typing a name…" autocomplete="off"><datalist id="in-stu-list">${STU.map(s => `<option value="${IN_E(s.full_name)}${s.classes ? ' · ' + IN_E(s.classes) : ''}">`).join('')}</datalist></label>
            <label>Group <select name="kind">${Object.entries(IN_KIND).map(([k, [ic, l]]) => `<option value="${k}">${ic} ${l}</option>`).join('')}</select></label>
            <label>Category <select name="cat"></select></label>
            <label class="in-wide">Details (optional) <input type="text" name="details" maxlength="300" placeholder="e.g. Diagnosed dyslexia; uses coloured overlays"></label></div>
          <div class="ca-bar"><span class="meta">Only people who can see this page will see it.</span><button class="btn btn-red">Add</button></div></form>` : ''}
        <section class="panel"><div class="ob-filters"><input type="search" id="in-q" placeholder="🔎 Search a name" value="${IN_E(q)}">
          <div class="feed-filter"><button type="button" class="chip ${kind ? '' : 'on'}" data-k="">All ${withNeeds.length}</button>${Object.entries(IN_KIND).map(([k, [ic, l]]) => `<button type="button" class="chip ${kind === k ? 'on' : ''}" data-k="${k}">${ic} ${l}</button>`).join('')}</div></div>
          ${shown.length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Student</th><th>Class</th><th>Needs</th><th>Average</th><th>Attendance</th><th></th></tr></thead><tbody>
            ${shown.map(s => `<tr><td><b>${IN_E(s.full_name)}</b></td><td>${IN_E(s.classes || s.grade || '')}</td><td>${tags(s.id)}</td><td>${s.avg == null ? '–' : s.avg + '%'}</td><td class="${s.att != null && s.att < 85 ? 'sc-low' : ''}">${s.att == null ? '–' : s.att + '%'}</td>
              <td><button type="button" class="pill pill-soft" data-stu="${s.id}">Open</button></td></tr>`).join('')}</tbody></table></div>`
            : `<p class="meta">${withNeeds.length ? 'No students match.' : canManage ? 'No students in any group yet. Add one above.' : 'None of your students are in an inclusion group.'}</p>`}</section>`;
      const f = document.getElementById('in-add');
      if (f) {
        const cats = () => { f.cat.innerHTML = '<option value="">–</option>' + IN_CAT[f.kind.value].map(c => `<option>${c}</option>`).join(''); };
        f.kind.onchange = cats; cats();
        f.onsubmit = async e => {
          e.preventDefault();
          const txt = f.stu.value.split(' · ')[0].trim(), s = STU.find(x => x.full_name.toLowerCase() === txt.toLowerCase());
          if (!s) return say('Choose a student from the list.');
          const { error } = await db.from('student_needs').insert({ school_id: S.id, student_id: s.id, kind: f.kind.value, category: f.cat.value || null, details: f.details.value.trim() || null, since: new Date().toISOString().slice(0, 10), added_by: user.id });
          if (error) return say(friendly(error)); await load(); say(`✅ ${s.full_name} added.`); draw();
        };
      }
      const qi = document.getElementById('in-q'); qi.oninput = () => { q = qi.value; const pos = qi.selectionStart; draw(); const n = document.getElementById('in-q'); n.focus(); n.setSelectionRange(pos, pos); };
      pane().querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; draw(); });
      pane().querySelectorAll('[data-stu]').forEach(b => b.onclick = () => show('profile', b.dataset.stu));
    };
    draw();
  }

  // ----- one student: needs, plans, reviews
  async function student(sid) {
    document.querySelectorAll('[data-it]').forEach(b => b.setAttribute('aria-selected', 'false'));
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const s = STU.find(x => x.id === sid) || { id: sid, full_name: nameOf(sid) };
    const { data: plans } = await db.from('support_plans').select('*').eq('school_id', S.id).eq('student_id', sid).order('created_at', { ascending: false });
    const P = plans || [], N = NEEDS.filter(n => n.student_id === sid);
    pane().innerHTML = `<section class="panel in-prof"><button type="button" class="link-btn" id="in-back">‹ Back</button>
        <div class="in-prof-head"><span class="initials">${IN_E(s.full_name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span><div><h2>${IN_E(s.full_name)}</h2><p class="meta">${IN_E(s.classes || s.grade || '')}</p></div>
          <div class="sc-prev-sum"><span>🎯 ${s.avg == null ? '–' : s.avg + '%'} average</span><span>📋 ${s.att == null ? '–' : s.att + '%'} attendance</span></div></div>
        <h3 class="sc-h3">Groups</h3><div class="in-needs">${N.map(n => `<div class="in-need k-${n.kind}"><b>${IN_KIND[n.kind][0]} ${IN_KIND[n.kind][1]}${n.category ? ' · ' + IN_E(n.category) : ''}</b>${n.details ? `<p>${IN_E(n.details)}</p>` : ''}<small class="meta">Since ${inDate(n.since || n.created_at.slice(0, 10))}</small>
          ${canManage ? `<button type="button" class="link-btn danger" data-rmneed="${n.id}">Remove</button>` : ''}</div>`).join('') || '<p class="meta">Not in a group.</p>'}</div></section>
      <section class="panel"><div class="in-head"><h2>📋 Support plans</h2>${canManage ? '<button type="button" class="btn btn-red" id="in-newplan">➕ New plan</button>' : ''}</div>
        ${P.length ? P.map(p => `<button type="button" class="in-plan-card ${p.status}" data-plan="${p.id}"><b>${IN_E(p.title)}</b><span class="meta">${IN_PLAN[p.kind] || ''}${p.review_on ? ' · Review ' + inDate(p.review_on) : ''}${p.status === 'closed' ? ' · Closed' : ''}</span>
          <span class="in-tprog">✅ ${(p.targets || []).filter(t => t.status === 'done').length} of ${(p.targets || []).length} targets</span></button>`).join('') : '<p class="meta">No support plan yet.</p>'}
        <div id="in-plan"></div></section>`;
    document.getElementById('in-back').onclick = () => show('students');
    pane().querySelectorAll('[data-rmneed]').forEach(b => b.onclick = async () => { if (!confirm('Remove this group from the student?')) return; const { error } = await db.from('student_needs').update({ active: false }).eq('id', Number(b.dataset.rmneed)); if (error) return say(friendly(error)); await load(); student(sid); });
    const np = document.getElementById('in-newplan');
    if (np) np.onclick = async () => {
      const k = N[0] ? { send: 'iep', gt: 'alp', ell: 'ell', other: 'other' }[N[0].kind] : 'iep';
      const { data, error } = await db.from('support_plans').insert({ school_id: S.id, student_id: sid, kind: k, title: IN_PLAN[k], created_by: user.id,
        review_on: new Date(Date.now() + 42 * 864e5).toISOString().slice(0, 10) }).select('id').single();
      if (error) return say(friendly(error)); await student(sid); openPlan(data.id, sid);
    };
    pane().querySelectorAll('[data-plan]').forEach(b => b.onclick = () => openPlan(Number(b.dataset.plan), sid));
    if (P.length === 1) openPlan(P[0].id, sid);
  }
  async function openPlan(pid, sid) {
    const box2 = document.getElementById('in-plan'); box2.innerHTML = '<p class="empty">Loading…</p>';
    const [{ data: p }, { data: rv }] = await Promise.all([db.from('support_plans').select('*').eq('id', pid).maybeSingle(), db.from('plan_reviews').select('*').eq('plan_id', pid).order('created_at', { ascending: false })]);
    if (!p) { box2.innerHTML = ''; return; }
    const T = (p.targets || []).map(t => Object.assign({ status: 'todo' }, t)), ro = !canManage;
    const txt = (k, label, ph, rows) => `<label class="in-fld">${label}${ro ? `<p class="in-ro">${IN_E(p[k] || '–').replace(/\n/g, '<br>')}</p>` : `<textarea name="${k}" rows="${rows || 3}" maxlength="4000" placeholder="${IN_E(ph)}">${IN_E(p[k] || '')}</textarea>`}</label>`;
    const drawT = () => T.map((t, i) => `<div class="in-target"><span class="in-tn">${i + 1}</span>${ro ? `<div><b>${IN_E(t.text)}</b>${t.measure ? `<small class="meta">Measured by: ${IN_E(t.measure)}</small>` : ''}</div><span class="in-ts">${IN_TS[t.status]}</span>`
      : `<div class="in-t-in"><input type="text" data-tt="${i}" maxlength="300" value="${IN_E(t.text)}" placeholder="SMART target, e.g. Read 30 high-frequency words accurately by March"><input type="text" data-tm="${i}" maxlength="200" value="${IN_E(t.measure || '')}" placeholder="How we’ll measure it"></div>
        <select data-tst="${i}">${Object.entries(IN_TS).map(([k, l]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select><button type="button" class="link-btn danger" data-trm="${i}" aria-label="Remove target">✕</button>`}</div>`).join('');
    box2.innerHTML = `<form class="in-planform" id="in-pf"><div class="in-pf-head">${ro ? `<h3>${IN_E(p.title)}</h3>` : `<input type="text" name="title" class="in-ptitle" maxlength="120" value="${IN_E(p.title)}">`}
        ${ro ? `<span class="meta">${IN_PLAN[p.kind]}</span>` : `<select name="kind">${Object.entries(IN_PLAN).map(([k, l]) => `<option value="${k}" ${p.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`}</div>
      <div class="sc-two">${txt('strengths', '💪 Strengths and interests', 'What the student is good at and enjoys')}${txt('needs_summary', '🧩 Needs', 'A short summary of the student’s needs')}</div>
      <h4 class="sc-h3">🎯 Targets</h4><div id="in-targets">${drawT() || '<p class="meta">No targets yet.</p>'}</div>${ro ? '' : '<button type="button" class="pill pill-soft" id="in-addt">+ Add a target</button>'}
      ${txt('strategies', '🧰 Strategies for teachers', 'e.g. Seat near the front; give instructions one step at a time; check understanding privately', 4)}
      ${txt('accommodations', '📝 Access arrangements', 'e.g. 25% extra time; a reader; a quiet room for assessments', 2)}
      <div class="in-pf-foot"><label class="in-fld">⏰ Next review ${ro ? `<b>${inDate(p.review_on) || '–'}</b>` : `<input type="date" name="review_on" value="${p.review_on || ''}">`}</label>
        ${ro ? '' : `<label class="remember"><input type="checkbox" name="closed" ${p.status === 'closed' ? 'checked' : ''}> Plan closed</label><button class="btn btn-red">💾 Save plan</button>`}</div></form>
      <section class="in-reviews"><h4 class="sc-h3">📝 Reviews and progress notes</h4>
        <form id="in-rf"><select name="progress"><option value="">Progress…</option>${Object.entries(IN_PROG).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
          <textarea name="notes" rows="2" maxlength="4000" placeholder="What progress have you seen? What’s working?"></textarea><button class="pill pill-soft">Add note</button></form>
        ${(rv || []).map(r => `<div class="in-rv"><b>${IN_E(r.author_name || '')}</b> <small class="meta">${inDate(r.created_at.slice(0, 10))}</small>${r.progress ? ` <span class="in-pg">${IN_PROG[r.progress]}</span>` : ''}<p>${IN_E(r.notes).replace(/\n/g, '<br>')}</p></div>`).join('') || '<p class="meta">No notes yet.</p>'}</section>`;
    const f = document.getElementById('in-pf');
    const sync = () => { f.querySelectorAll('[data-tt]').forEach(x => T[x.dataset.tt].text = x.value.trim()); f.querySelectorAll('[data-tm]').forEach(x => T[x.dataset.tm].measure = x.value.trim()); f.querySelectorAll('[data-tst]').forEach(x => T[x.dataset.tst].status = x.value); };
    const redrawT = () => { document.getElementById('in-targets').innerHTML = drawT() || '<p class="meta">No targets yet.</p>'; bindT(); };
    const bindT = () => f.querySelectorAll('[data-trm]').forEach(b => b.onclick = () => { sync(); T.splice(Number(b.dataset.trm), 1); redrawT(); });
    bindT();
    const at = document.getElementById('in-addt'); if (at) at.onclick = () => { sync(); T.push({ text: '', measure: '', status: 'todo' }); redrawT(); const last = f.querySelectorAll('[data-tt]'); if (last.length) last[last.length - 1].focus(); };
    f.onsubmit = async e => {
      e.preventDefault(); if (ro) return; sync();
      const row = { title: f.title.value.trim() || 'Support plan', kind: f.kind.value, strengths: f.strengths.value.trim() || null, needs_summary: f.needs_summary.value.trim() || null,
        targets: T.filter(t => t.text), strategies: f.strategies.value.trim() || null, accommodations: f.accommodations.value.trim() || null, review_on: f.review_on.value || null,
        status: f.closed.checked ? 'closed' : 'active', updated_at: new Date().toISOString() };
      const { error } = await db.from('support_plans').update(row).eq('id', pid);
      if (error) return say(friendly(error)); say('✅ Plan saved.'); await student(sid); openPlan(pid, sid);
    };
    document.getElementById('in-rf').onsubmit = async e => {
      e.preventDefault(); const rf = e.target; if (!rf.notes.value.trim()) return say('Write a short note first.');
      const { error } = await db.from('plan_reviews').insert({ plan_id: pid, progress: rf.progress.value || null, notes: rf.notes.value.trim(), author_id: user.id, author_name: profile.full_name });
      if (error) return say(friendly(error)); say('📝 Note added.'); openPlan(pid, sid);
    };
    box2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const q = new URLSearchParams(location.search).get('s');
  if (q) show('profile', q); else show(canOverview ? 'overview' : 'students');
}
