// ===== Think Nest for Schools: collaborative unit planner =====
const PL_E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PL_TEMPLATES = {
  pyp: { name: 'IB PYP unit of inquiry', sections: [
    { key: 'theme', label: 'Transdisciplinary theme', type: 'select', options: ['Who we are', 'Where we are in place and time', 'How we express ourselves', 'How the world works', 'How we organize ourselves', 'Sharing the planet'] },
    { key: 'central_idea', label: 'Central idea', type: 'text', rows: 2 },
    { key: 'lines', label: 'Lines of inquiry', type: 'list', hint: 'One line of inquiry per line' },
    { key: 'concepts', label: 'Key concepts', type: 'chips', options: ['Form', 'Function', 'Causation', 'Change', 'Connection', 'Perspective', 'Responsibility'] },
    { key: 'related', label: 'Related concepts', type: 'text', rows: 2 },
    { key: 'atl', label: 'Approaches to learning (ATL) skills', type: 'chips', options: ['Thinking skills', 'Research skills', 'Communication skills', 'Social skills', 'Self-management skills'] },
    { key: 'profile', label: 'Learner profile attributes', type: 'chips', options: ['Inquirers', 'Knowledgeable', 'Thinkers', 'Communicators', 'Principled', 'Open-minded', 'Caring', 'Risk-takers', 'Balanced', 'Reflective'] },
    { key: 'provocation', label: 'Tuning in and provocations', type: 'text', rows: 3 },
    { key: 'sat', label: 'Summative assessment task', type: 'text', rows: 4 },
    { key: 'rubric', label: 'Assessment criteria and rubric', type: 'text', rows: 4 },
    { key: 'formative', label: 'Formative assessment', type: 'text', rows: 3 },
    { key: 'objectives', label: 'Subject objectives', type: 'objectives' },
    { key: 'experiences', label: 'Learning experiences (week by week)', type: 'text', rows: 8 },
    { key: 'action', label: 'Student action', type: 'text', rows: 3 },
    { key: 'resources', label: 'Resources', type: 'text', rows: 3 },
    { key: 'reflection', label: 'Reflection (after the unit)', type: 'text', rows: 4 }] },
  subject: { name: 'Subject unit', sections: [
    { key: 'overview', label: 'Unit overview', type: 'text', rows: 3 },
    { key: 'objectives', label: 'Learning objectives', type: 'objectives' },
    { key: 'success', label: 'Success criteria', type: 'list', hint: 'One success criterion per line' },
    { key: 'vocab', label: 'Key vocabulary', type: 'text', rows: 2 },
    { key: 'assessment', label: 'Assessment', type: 'text', rows: 4 },
    { key: 'sequence', label: 'Lesson sequence (week by week)', type: 'text', rows: 8 },
    { key: 'differentiation', label: 'Differentiation and inclusion', type: 'text', rows: 4 },
    { key: 'resources', label: 'Resources', type: 'text', rows: 3 },
    { key: 'reflection', label: 'Reflection (after the unit)', type: 'text', rows: 4 }] }
};
const PL_STATUS = { draft: ['draft', '✏️ Draft'], review: ['rev', '⏳ In review'], returned: ['ret', '↩ Returned'], approved: ['ok', '✅ Approved'] };
const plWhen = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

async function startPlanner() {
  const { user, profile } = await initTeacher();
  let box = document.getElementById('planner');
  const { data: scs } = await db.rpc('my_schools');
  const S = (scs || []).find(s => !['student', 'parent'].includes(s.my_role));
  if (!S) { box.innerHTML = '<div class="empty-box"><p>The unit planner is part of Think Nest for Schools. It’s for teachers and leaders of a school.</p></div>'; return; }
  document.documentElement.style.setProperty('--school', S.color_primary || '#3E4B94'); document.documentElement.style.setProperty('--school2', S.color_accent || '#F27A6F');
  const LEAD = ['principal', 'vice_principal', 'assistant_principal', 'it', 'inclusion_lead', 'coordinator', 'head_of_department'];
  const isLeader = LEAD.includes(S.my_role) || profile.role === 'admin';
  const canCustomise = ['principal', 'vice_principal', 'assistant_principal', 'it', 'inclusion_lead'].includes(S.my_role) || profile.role === 'admin';
  const coversGrade = g => isLeader && (!(S.scope_grades || []).length || S.scope_grades.includes(g));
  const { data: srow } = await db.from('schools').select('planner_sections, curriculum_map').eq('id', S.id).maybeSingle();
  let custom = (srow && srow.planner_sections) || {};
  const subjects = Object.keys((srow && srow.curriculum_map) || { English: 1, Maths: 1, Science: 1 }).filter(k => ((srow && srow.curriculum_map) || {})[k] !== 'none');
  const sections = tpl => PL_TEMPLATES[tpl].sections.map(sec => Object.assign({}, sec, { label: ((custom[tpl] || {})[sec.key] || {}).label || sec.label, hidden: !!((custom[tpl] || {})[sec.key] || {}).hidden }));
  let gradeFilter = sessionStorage.getItem('tn_pl_grade') || '', myGrades = null;
  // two modes: unit plans and weekly plans
  box.innerHTML = '<div class="tabs sc-tabs pl-mode" role="tablist"><button role="tab" data-pm="units">🗂️ Unit plans</button><button role="tab" data-pm="weeks">📅 Weekly plans</button><button role="tab" data-pm="subject">📑 Subject plans</button></div><div id="pl-main"></div>';
  box = document.getElementById('pl-main');
  const setMode = m => { document.querySelectorAll('[data-pm]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pm === m))); sessionStorage.setItem('tn_pl_mode', m); };
  document.querySelector('.pl-mode').onclick = e => { const b = e.target.closest('[data-pm]'); if (!b) return; history.replaceState(null, '', 'planner.html?mode=' + b.dataset.pm); if (b.dataset.pm === 'weeks') weeks(); else if (b.dataset.pm === 'subject') subjectPlans(); else list(); };

  // ----- the list of units
  async function list() {
    setMode('units');
    box.innerHTML = '<p class="empty">Loading…</p>';
    const { data, error } = await db.from('unit_plans').select('id, template, grade, subject, title, term, starts_on, ends_on, status, updated_at, edits, created_by').eq('school_id', S.id).order('starts_on', { ascending: true, nullsFirst: false });
    if (error) { box.innerHTML = `<p class="empty">${PL_E(/unit_plans/.test(error.message || '') ? 'Run database update 63 to use the unit planner.' : friendly(error))}</p>`; return; }
    const L = (data || []).filter(p => !gradeFilter || p.grade === gradeFilter);
    if (!myGrades) { const { data: mg, error: ge } = await db.rpc('my_planning_grades', { sid: S.id }); myGrades = ge ? (S.grades || []) : (mg || []); }
    const allowed = isLeader && !(S.scope_grades || []).length ? (S.grades || []) : (S.grades || []).filter(g => myGrades.includes(g));
    if (gradeFilter && !allowed.includes(gradeFilter)) gradeFilter = '';
    const grades = allowed.filter(g => !gradeFilter || g === gradeFilter);
    const lastBy = p => { const e = Object.values(p.edits || {}).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]; return e ? `Last edited by ${e.by} · ${plWhen(e.at)}` : 'Not started'; };
    box.innerHTML = `<div class="page-head"><h1 class="title">📘 Unit planner</h1><div class="pl-head-acts">${canCustomise ? '<button type="button" class="link-btn" id="pl-custom">⚙️ Customise the template</button>' : ''}<button type="button" class="btn btn-red" id="pl-new">➕ New unit</button></div></div>
      <p class="hint">Plan units together as a team. Everyone in your grade team can edit the same plan, and it saves as you type.</p>
      <div class="feed-filter pl-grades"><button type="button" class="chip ${gradeFilter ? '' : 'on'}" data-gf="">${isLeader ? 'All grades' : 'All my grades'}</button>${allowed.map(g => `<button type="button" class="chip ${gradeFilter === g ? 'on' : ''}" data-gf="${PL_E(g)}">${PL_E(g)}</button>`).join('')}</div>
      <section id="pl-form-box"></section>
      ${grades.map(g => { const U = L.filter(p => p.grade === g); return `<section class="pl-grade"><h2 class="sc-h3">${PL_E(g)} <span class="count">${U.length}</span></h2>
        ${U.length ? `<div class="pl-cards">${U.map(p => { const st = PL_STATUS[p.status] || PL_STATUS.draft; return `<button type="button" class="pl-card" data-plan="${p.id}">
          <span class="pl-tpl">${p.template === 'pyp' ? '🌍 PYP unit' : '📘 ' + PL_E(p.subject || 'Subject') + ' unit'}</span><b>${PL_E(p.title)}</b>
          <small>${PL_E([p.term, p.starts_on && new Date(p.starts_on + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · '))}</small>
          <span class="rc-st ${st[0]}">${st[1]}</span><small class="meta">${PL_E(lastBy(p))}</small></button>`; }).join('')}</div>` : '<p class="meta">No units yet.</p>'}</section>`; }).join('')}`;
    box.querySelectorAll('[data-gf]').forEach(b => b.onclick = () => { gradeFilter = b.dataset.gf; sessionStorage.setItem('tn_pl_grade', gradeFilter); list(); });
    box.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => openPlan(Number(b.dataset.plan)));
    document.getElementById('pl-new').onclick = newForm;
    const cu = document.getElementById('pl-custom'); if (cu) cu.onclick = customise;
  }

  function newForm() {
    const fb = document.getElementById('pl-form-box');
    fb.innerHTML = `<form class="panel pl-form" id="pl-form"><h2>➕ New unit</h2>
      <div class="pl-tpl-pick">${Object.entries(PL_TEMPLATES).map(([k, t], i) => `<label class="pl-tpl-opt"><input type="radio" name="tpl" value="${k}" ${i ? '' : 'checked'}><span><b>${k === 'pyp' ? '🌍' : '📘'} ${t.name}</b><small>${k === 'pyp' ? 'Central idea, lines of inquiry, concepts, ATL skills, summative assessment…' : 'Objectives, success criteria, assessment, lesson sequence…'}</small></span></label>`).join('')}</div>
      <div class="sc-two"><label>Title <input type="text" name="title" maxlength="140" required placeholder="e.g. How we express ourselves: Stories that shape us"></label>
        <label>Grade <select name="grade">${(isLeader && !(S.scope_grades || []).length ? (S.grades || []) : (S.grades || []).filter(g => (myGrades || []).includes(g))).map(g => `<option ${g === gradeFilter ? 'selected' : ''}>${PL_E(g)}</option>`).join('')}</select></label></div>
      <div class="sc-two"><label class="pl-subj" hidden>Subject <select name="subject">${subjects.map(s => `<option>${PL_E(s)}</option>`).join('')}</select></label>
        <label>Term <select name="term"><option value="">–</option>${(S.terms || []).map(t => `<option>${PL_E(t)}</option>`).join('')}</select></label></div>
      <div class="sc-two"><label>Starts <input type="date" name="starts_on"></label><label>Ends <input type="date" name="ends_on"></label></div>
      <div class="ca-bar"><button type="button" class="link-btn" id="pl-form-x">Cancel</button><button class="btn btn-red">Create unit</button></div></form>`;
    const f = document.getElementById('pl-form');
    const tplC = () => { f.querySelector('.pl-subj').hidden = f.querySelector('input[name=tpl]:checked').value !== 'subject'; };
    f.querySelectorAll('input[name=tpl]').forEach(r => r.onchange = tplC); tplC();
    document.getElementById('pl-form-x').onclick = () => { fb.innerHTML = ''; };
    f.onsubmit = async e => {
      e.preventDefault(); if (f.title.value.trim().length < 2) return say('Give the unit a title.');
      const tpl = f.querySelector('input[name=tpl]:checked').value;
      const { data, error } = await db.from('unit_plans').insert({ school_id: S.id, template: tpl, grade: f.grade.value, subject: tpl === 'subject' ? f.subject.value : null, title: f.title.value.trim(),
        term: f.term.value || null, starts_on: f.starts_on.value || null, ends_on: f.ends_on.value || null, created_by: user.id }).select('id').single();
      if (error) return say(friendly(error));
      history.replaceState(null, '', '?plan=' + data.id); openPlan(data.id);
    };
    f.title.focus();
  }

  // ----- one unit: the collaborative editor
  async function openPlan(pid) {
    setMode('units');
    box.innerHTML = '<p class="empty">Loading…</p>';
    const [{ data: P, error }, { data: C }] = await Promise.all([db.from('unit_plans').select('*').eq('id', pid).maybeSingle(), db.from('unit_plan_comments').select('*').eq('plan_id', pid).order('created_at')]);
    if (error || !P) { box.innerHTML = '<p class="empty">This unit plan couldn’t be found.</p>'; return; }
    history.replaceState(null, '', '?plan=' + pid);
    const SEC = sections(P.template).filter(s => !s.hidden), D = P.data || {};
    const subjList = P.template === 'subject' ? [P.subject] : subjects;
    let objs = {}, picked = new Set(P.objective_ids || []), objSubj = subjList[0];
    const loadObjs = async sj => { if (objs[sj]) return objs[sj]; const { data } = await db.rpc('planner_objectives', { sid: S.id, sgrade: P.grade, ssubject: sj }); return (objs[sj] = data || []); };
    const st = PL_STATUS[P.status] || PL_STATUS.draft;
    const field = sec => {
      const v = D[sec.key], e = (P.edits || {})[sec.key];
      const by = `<small class="pl-by" data-by="${sec.key}">${e ? 'Edited by ' + PL_E(e.by) + ' · ' + plWhen(e.at) : ''}</small>`;
      if (sec.type === 'select') return `<select data-f="${sec.key}"><option value="">Choose…</option>${sec.options.map(o => `<option ${v === o ? 'selected' : ''}>${PL_E(o)}</option>`).join('')}</select>${by}`;
      if (sec.type === 'chips') { const on = Array.isArray(v) ? v : []; return `<div class="pl-chips" data-chips="${sec.key}">${sec.options.concat(on.filter(x => !sec.options.includes(x))).map(o => `<label class="sc-chip"><input type="checkbox" value="${PL_E(o)}" ${on.includes(o) ? 'checked' : ''}><span>${PL_E(o)}</span></label>`).join('')}</div>${by}`; }
      if (sec.type === 'objectives') return `<div class="pl-objs" id="pl-objs"><p class="meta">Loading objectives…</p></div>`;
      return `<textarea data-f="${sec.key}" rows="${sec.rows || 4}" maxlength="8000" placeholder="${PL_E(sec.hint || '')}">${PL_E(Array.isArray(v) ? v.join('\n') : (v || ''))}</textarea>${by}`;
    };
    box.innerHTML = `<div class="pl-top"><button type="button" class="link-btn" id="pl-back">‹ All units</button>
        <div class="pl-top-acts"><button type="button" class="pill pill-soft" id="pl-word">⬇ Word</button><button type="button" class="pill pill-soft" id="pl-print">🖨️ Print</button><button type="button" class="link-btn" id="pl-refresh">🔄 Refresh</button></div></div>
      <section class="panel pl-meta"><span class="pl-tpl">${P.template === 'pyp' ? '🌍 PYP unit of inquiry' : '📘 ' + PL_E(P.subject || '') + ' unit'}</span>
        <input class="pl-title" id="pl-title" maxlength="140" value="${PL_E(P.title)}" aria-label="Unit title">
        <div class="pl-meta-row"><span>${PL_E(P.grade)}</span>${P.term ? `<span>${PL_E(P.term)}</span>` : ''}
          <label>Starts <input type="date" id="pl-start" value="${P.starts_on || ''}"></label><label>Ends <input type="date" id="pl-end" value="${P.ends_on || ''}"></label>
          <span class="rc-st ${st[0]}">${st[1]}</span></div>
        ${P.status === 'returned' && P.leader_note ? `<p class="note">↩ <b>Returned:</b> ${PL_E(P.leader_note)}</p>` : ''}
        <div class="ca-bar pl-flow">${P.status === 'draft' || P.status === 'returned' ? '<button type="button" class="btn btn-red" data-flow="submit">📤 Submit for review</button>' : ''}
          ${P.status === 'review' && coversGrade(P.grade) ? '<button type="button" class="btn btn-white outline" data-flow="return">↩ Return with a note</button><button type="button" class="btn btn-red" data-flow="approve">✅ Approve</button>' : ''}
          ${P.status === 'approved' || P.status === 'review' ? '<button type="button" class="link-btn" data-flow="reopen">✏️ Reopen for editing</button>' : ''}
          ${P.created_by === user.id || isLeader ? '<button type="button" class="link-btn danger" id="pl-del">Delete unit</button>' : ''}</div></section>
      <div class="pl-layout"><div class="pl-secs">${SEC.map(sec => `<section class="panel pl-sec" id="sec-${sec.key}"><h3>${PL_E(sec.label)}</h3>${field(sec)}</section>`).join('')}</div>
        <aside class="panel pl-comments"><h3>💬 Comments</h3><div id="pl-clist">${(C || []).map(c => `<div class="pl-c"><b>${PL_E(c.author_name || '')}</b>${c.section ? ` <small class="meta">on ${PL_E((SEC.find(s => s.key === c.section) || {}).label || c.section)}</small>` : ''}<p>${PL_E(c.body)}</p><small class="meta">${plWhen(c.created_at)}</small></div>`).join('') || '<p class="meta">No comments yet.</p>'}</div>
          <form id="pl-cform"><select id="pl-csec"><option value="">Whole unit</option>${SEC.map(s => `<option value="${s.key}">${PL_E(s.label)}</option>`).join('')}</select>
            <textarea id="pl-cbody" rows="3" maxlength="2000" placeholder="Add a comment for your team…"></textarea><button class="pill pill-soft">Post comment</button></form></aside></div>`;
    // saving, section by section
    const saved = (key, txt) => { const b = box.querySelector(`[data-by="${key}"]`); if (b) b.textContent = txt; };
    const save = async (key, val) => {
      saved(key, 'Saving…');
      const { error: er } = await db.rpc('set_unit_field', { pid, fkey: key, fval: val });
      if (er) { saved(key, '⚠️ Not saved'); return say(friendly(er)); }
      D[key] = val; saved(key, '✓ Saved just now by you');
    };
    box.querySelectorAll('textarea[data-f]').forEach(t => { let last = t.value; t.onblur = () => { if (t.value === last) return; last = t.value; const sec = SEC.find(s => s.key === t.dataset.f);
      save(t.dataset.f, sec && sec.type === 'list' ? t.value.split('\n').map(x => x.trim()).filter(Boolean) : t.value); }; });
    box.querySelectorAll('select[data-f]').forEach(t => t.onchange = () => save(t.dataset.f, t.value));
    box.querySelectorAll('[data-chips]').forEach(w => w.onchange = () => save(w.dataset.chips, [...w.querySelectorAll('input:checked')].map(x => x.value)));
    const upd = async row => { const { error: er } = await db.from('unit_plans').update(row).eq('id', pid); if (er) say(friendly(er)); else say('✓ Saved'); };
    const ti = document.getElementById('pl-title'); let lastT = ti.value; ti.onblur = () => { const v = ti.value.trim(); if (v.length < 2 || v === lastT) return; lastT = v; upd({ title: v }); };
    document.getElementById('pl-start').onchange = e => upd({ starts_on: e.target.value || null });
    document.getElementById('pl-end').onchange = e => upd({ ends_on: e.target.value || null });
    // objectives chooser
    const drawObjs = async () => {
      const ob = document.getElementById('pl-objs'); if (!ob) return;
      const L = await loadObjs(objSubj), topics = [...new Set(L.map(o => o.topic))];
      const count = sj => (objs[sj] || []).filter(o => picked.has(o.id)).length;
      ob.innerHTML = `${subjList.length > 1 ? `<div class="feed-filter">${subjList.map(sj => `<button type="button" class="chip ${sj === objSubj ? 'on' : ''}" data-os="${PL_E(sj)}">${PL_E(sj)}${count(sj) ? ' · ' + count(sj) : ''}</button>`).join('')}</div>` : ''}
        <p class="meta">Tick the ${PL_E(objSubj)} objectives this unit will cover (${PL_E(P.grade)}). They show as 🔵 Planned on the curriculum coverage map.</p>
        ${L.length ? topics.map(tp => `<details class="pl-topic" ${L.filter(o => o.topic === tp).some(o => picked.has(o.id)) ? 'open' : ''}><summary>${PL_E(tp)} <small class="meta">${L.filter(o => o.topic === tp && picked.has(o.id)).length}/${L.filter(o => o.topic === tp).length}</small></summary>
          ${L.filter(o => o.topic === tp).map(o => `<label class="pl-obj"><input type="checkbox" value="${o.id}" ${picked.has(o.id) ? 'checked' : ''}><span>${PL_E(o.text)}</span></label>`).join('')}</details>`).join('')
          : `<p class="meta">No ${PL_E(objSubj)} objectives for ${PL_E(P.grade)} in your school’s curriculum yet.</p>`}`;
      ob.querySelectorAll('[data-os]').forEach(b => b.onclick = async () => { objSubj = b.dataset.os; await drawObjs(); });
      ob.onchange = async e => { const cb = e.target.closest('input[type=checkbox]'); if (!cb) return; const id = Number(cb.value); cb.checked ? picked.add(id) : picked.delete(id);
        const { error: er } = await db.from('unit_plans').update({ objective_ids: [...picked] }).eq('id', pid); if (er) say(friendly(er)); };
    };
    drawObjs();
    // comments
    document.getElementById('pl-cform').onsubmit = async e => {
      e.preventDefault(); const body = document.getElementById('pl-cbody').value.trim(); if (!body) return;
      const { error: er } = await db.from('unit_plan_comments').insert({ plan_id: pid, author_id: user.id, author_name: profile.full_name, section: document.getElementById('pl-csec').value || null, body });
      if (er) return say(friendly(er)); openPlan(pid);
    };
    // review flow
    box.querySelectorAll('[data-flow]').forEach(b => b.onclick = async () => {
      const a = b.dataset.flow; let note = '';
      if (a === 'return') { note = prompt('What should the team change?', ''); if (note === null) return; }
      if (a === 'submit' && !confirm('Submit this unit plan for review by your school leaders?')) return;
      const { error: er } = await db.rpc('review_unit_plan', { pid, action: a, note });
      if (er) return say(friendly(er));
      say({ submit: '📤 Submitted for review.', approve: '✅ Approved.', return: '↩ Returned with your note.', reopen: '✏️ Open for editing again.' }[a]); openPlan(pid);
    });
    const del = document.getElementById('pl-del');
    if (del) del.onclick = async () => { if (!confirm('Delete this unit plan for everyone? This can’t be undone.')) return; const { error: er } = await db.from('unit_plans').delete().eq('id', pid); if (er) return say(friendly(er)); history.replaceState(null, '', 'planner.html'); list(); };
    document.getElementById('pl-back').onclick = () => { history.replaceState(null, '', 'planner.html'); list(); };
    document.getElementById('pl-refresh').onclick = () => openPlan(pid);
    // export: Word (editable) and print
    const exportHtml = async () => {
      for (const sj of subjList) await loadObjs(sj);
      const val = sec => { const v = D[sec.key];
        if (sec.type === 'objectives') { const rows = subjList.map(sj => { const L = (objs[sj] || []).filter(o => picked.has(o.id)); return L.length ? `<p><b>${PL_E(sj)}</b></p><ul>${L.map(o => `<li>${PL_E(o.text)}</li>`).join('')}</ul>` : ''; }).join(''); return rows || '<p>–</p>'; }
        if (Array.isArray(v)) return sec.type === 'chips' ? `<p>${PL_E(v.join(', ')) || '–'}</p>` : `<ul>${v.map(x => `<li>${PL_E(x)}</li>`).join('')}</ul>`;
        return `<p>${PL_E(v || '–').replace(/\n/g, '<br>')}</p>`; };
      return `<html><head><meta charset="utf-8"><title>${PL_E(P.title)}</title><style>body{font-family:Arial,sans-serif;color:#1D2026;margin:32px}h1{color:${S.color_primary};margin:0 0 4px}h2{font-size:14pt;color:${S.color_primary};border-bottom:2px solid ${S.color_accent};padding-bottom:3px;margin:18px 0 6px}.meta{color:#555}ul{margin:4px 0 4px 20px}p{margin:4px 0;line-height:1.5}</style></head>
        <body><p class="meta">${PL_E(S.name)} · ${P.template === 'pyp' ? 'PYP unit of inquiry' : PL_E(P.subject || '') + ' unit'}</p><h1>${PL_E(P.title)}</h1>
        <p class="meta">${PL_E([P.grade, P.term, P.starts_on && P.ends_on ? P.starts_on + ' to ' + P.ends_on : ''].filter(Boolean).join(' · '))} · ${PL_E((PL_STATUS[P.status] || PL_STATUS.draft)[1].replace(/^\S+\s/, ''))}</p>
        ${SEC.map(sec => `<h2>${PL_E(sec.label)}</h2>${val(sec)}`).join('')}</body></html>`;
    };
    document.getElementById('pl-word').onclick = async () => {
      const html = await exportHtml(), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/msword' })); a.download = (P.grade + ' ' + P.title).replace(/[^\w\u0600-\u06FF]+/g, '-').slice(0, 80) + '.doc';
      document.body.appendChild(a); a.click(); a.remove();
    };
    document.getElementById('pl-print').onclick = async () => { const w = window.open('', '_blank'); if (!w) return say('Please allow pop-ups to print.'); w.document.write(await exportHtml()); w.document.close(); setTimeout(() => w.print(), 400); };
    box.scrollIntoView({ block: 'start' });
  }


  // ===== Weekly plans (one per class per week) =====
  const STAGES_DEF = ['Tuning in', 'Finding out', 'Sorting out', 'Going further', 'Making conclusions', 'Taking action'];
  const stages = () => ((custom.weekly || {}).stages || []).length ? custom.weekly.stages : STAGES_DEF;
  const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday']];
  const isoLocal = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const mondayOf = d => { const x = new Date(d); x.setHours(12); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return isoLocal(x); };
  const addDays = (iso, n) => { const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + n); return isoLocal(x); };
  const wkLabel = iso => `${new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(addDays(iso, 4) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  let wk = sessionStorage.getItem('tn_pl_week') || mondayOf(new Date()), CLS = null, onlyMine = new URLSearchParams(location.search).get('all') !== '1';
  async function weeks() {
    setMode('weeks'); box.innerHTML = '<p class="empty">Loading…</p>';
    if (!CLS) { const { data, error } = await db.rpc('planning_classes', { sid: S.id }); if (error) { box.innerHTML = `<p class="empty">${PL_E(/planning_classes|function/.test(error.message || '') ? 'Run database update 68 to use weekly plans.' : friendly(error))}</p>`; return; } CLS = data || []; }
    const { data: W } = await db.from('weekly_plans').select('id, group_id, stage, status, edits, feedback').eq('school_id', S.id).eq('week_start', wk);
    if (onlyMine && isLeader && !CLS.some(c => c.mine)) onlyMine = false;
    const full = ['principal', 'vice_principal', 'assistant_principal', 'it', 'inclusion_lead'].includes(S.my_role) || profile.role === 'admin';
    const L0 = CLS.filter(c => onlyMine ? c.mine : !c.mine), byG = id => (W || []).find(p => p.group_id === id);
    const gList = [...new Set(L0.map(c => c.grade || 'Other'))].sort((a, b) => (S.grades || []).indexOf(a) - (S.grades || []).indexOf(b));
    let wkGrade = sessionStorage.getItem('tn_wk_grade') || ''; if (wkGrade && !gList.includes(wkGrade)) wkGrade = '';
    const L = L0.filter(c => onlyMine || !wkGrade || (c.grade || 'Other') === wkGrade);
    const lastBy = p => { const e = Object.values((p && p.edits) || {}).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]; return e ? `${e.by} · ${plWhen(e.at)}` : ''; };
    const done = L.filter(c => byG(c.id)).length;
    const row = c => { const p = byG(c.id), st = p ? PL_STATUS[p.status] || PL_STATUS.draft : null; return `<tr><td><b>${PL_E(c.name)}</b></td><td>${PL_E(c.teacher || '')}</td><td>${p && p.stage ? `<span class="wk-stage">${PL_E(p.stage)}</span>` : '–'}</td>
          <td>${st ? `<span class="rc-st ${st[0]}">${st[1]}</span>` : '<span class="meta">Not started</span>'}</td><td class="meta">${PL_E(lastBy(p))}</td>
          <td>${p ? `<button type="button" class="pill pill-soft" data-wp="${p.id}">Open</button>` : c.mine ? `<button type="button" class="pill pill-soft" data-new="${c.id}">➕ Start plan</button>` : ''}</td></tr>`; };
    const head = '<thead><tr><th>Class</th><th>Teacher</th><th>Inquiry stage</th><th>Status</th><th>Last edited</th><th></th></tr></thead>';
    box.innerHTML = `<div class="page-head"><h1 class="title">${onlyMine ? '📅 My weekly plans' : full ? '📅 Weekly lesson plans: all grades' : '✅ Weekly plans to review'}</h1></div>
      <p class="hint">${onlyMine ? 'Plans for the classes you teach.' : full ? 'Every class’s weekly plan, grade by grade. Open any plan to read it, approve it or give feedback.' : 'Weekly plans from the classes you look after. Open one to approve it or give feedback.'}</p>
      ${!onlyMine && gList.length > 1 ? `<div class="wk-gchips"><button type="button" class="chip ${wkGrade ? '' : 'on'}" data-wg="">All grades</button>${gList.map(g => { const n = L0.filter(c => (c.grade || 'Other') === g), rv = n.filter(c => (byG(c.id) || {}).status === 'review').length;
        return `<button type="button" class="chip ${wkGrade === g ? 'on' : ''}" data-wg="${PL_E(g)}">${PL_E(g)}${rv ? ` <i class="wk-rv">${rv}</i>` : ''}</button>`; }).join('')}</div>` : ''}
      <div class="wk-bar"><button type="button" class="pill pill-soft" data-wk="-7" aria-label="Previous week">‹</button><b>Week of ${wkLabel(wk)}</b><button type="button" class="pill pill-soft" data-wk="7" aria-label="Next week">›</button>
        ${wk !== mondayOf(new Date()) ? '<button type="button" class="link-btn" data-wk="0">This week</button>' : ''}
        ${isLeader && CLS.some(c => c.mine) ? `<a class="link-btn" href="planner.html?mode=weeks${onlyMine ? '&all=1' : ''}">${onlyMine ? '✅ Plans to review →' : '📅 My weekly plans →'}</a>` : ''}<span class="meta">${done} of ${L.length} plans started</span></div>
      ${!L.length ? `<div class="empty-box"><p>${onlyMine ? 'You don’t have any classes to plan for yet.' : 'No classes here yet.'}</p></div>`
        : onlyMine ? `<div class="in-scroll"><table class="ac-table">${head}<tbody>${L.map(row).join('')}</tbody></table></div>`
        : gList.filter(g => !wkGrade || g === wkGrade).map(g => { const G = L.filter(c => (c.grade || 'Other') === g), s2 = G.filter(c => byG(c.id)).length;
            return `<section class="panel wk-gsec"><div class="in-head"><h2>${PL_E(g)}</h2><span class="meta">${s2} of ${G.length} started</span></div><div class="in-scroll"><table class="ac-table">${head}<tbody>${G.map(row).join('')}</tbody></table></div></section>`; }).join('')}`;
    box.querySelectorAll('[data-wg]').forEach(b => b.onclick = () => { sessionStorage.setItem('tn_wk_grade', b.dataset.wg); weeks(); });
    box.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => { const n = Number(b.dataset.wk); wk = n ? addDays(wk, n) : mondayOf(new Date()); sessionStorage.setItem('tn_pl_week', wk); weeks(); });

    box.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => openWeek(Number(b.dataset.wp)));
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = async () => {
      const { data, error } = await db.from('weekly_plans').insert({ school_id: S.id, group_id: Number(b.dataset.new), week_start: wk, created_by: user.id }).select('id').single();
      if (error) return say(friendly(error)); openWeek(data.id);
    });
  }
  // common choices for weekly plans (leaders can change every list in ⚙️ Customise the template)
  const WK_LISTS_DEF = {
    stage0: ['Provocation (object, image or video)', 'See-think-wonder', 'KWL chart', 'Question wall', 'Picture prompt', 'Story or real-life scenario', 'Mind map of what we already know', 'Think-pair-share'],
    stage1: ['Research with books', 'Research with iPads', 'Hands-on investigation', 'Experiment', 'Field trip or learning walk', 'Guest speaker', 'Interview or survey', 'Watch and take notes', 'Guided reading', 'Teacher modelling'],
    stage2: ['Graphic organiser', 'Sort and classify', 'Compare and contrast (Venn diagram)', 'Discuss findings in groups', 'Concept map', 'Table or graph of data', 'Retell or summarise', 'Model it with resources'],
    stage3: ['Open-ended question', 'New inquiry question', 'Explore another perspective', 'Apply to a new context', 'Extension task', 'Deeper research', 'Problem-solving challenge', 'Debate'],
    stage4: ['Connect to the central idea', 'Answer the big question', 'Summarise key learning', 'Share findings with the class', 'I used to think… now I think…', 'Exit ticket', 'Self-assessment against success criteria'],
    stage5: ['Share learning with others', 'Set a personal goal', 'Create a product or poster', 'Apply learning at home', 'Help others or the community', 'Plan next steps', 'Present to families'],
    support: ['Visual prompts', 'Word bank', 'Sentence starters', 'Concrete resources', 'Adult support (TA)', 'Pre-teach vocabulary', 'Instructions in small steps', 'Peer buddy', 'Scaffolded worksheet', 'Extra time'],
    challenge: ['Open-ended questions', 'Extension task', 'Explain to a partner', 'Create your own question', 'Higher-level text', 'Leadership role in the group', 'Independent research', 'Apply to a new context'],
    assessment: ['Exit ticket', 'Teacher observation', 'Questioning', 'Quiz', 'Mini whiteboards', 'Self-assessment', 'Peer assessment', 'Work scrutiny'],
    resources: ['Textbook', 'Worksheets', 'iPads', 'Interactive whiteboard', 'Concrete resources', 'Library books', 'Videos', 'Art materials'],
    atl: ['Thinking skills', 'Research skills', 'Communication skills', 'Social skills', 'Self-management skills'],
    profile: ['Inquirers', 'Knowledgeable', 'Thinkers', 'Communicators', 'Principled', 'Open-minded', 'Caring', 'Risk-takers', 'Balanced', 'Reflective']
  };
  const wkListNames = () => Object.assign({}, ...[0, 1, 2, 3, 4, 5].map(k => ({ ['stage' + k]: `${k + 1}. ${stages()[k] || 'Stage ' + (k + 1)}: activities` })),
    { support: '🧩 Support strategies', challenge: '🚀 Challenge strategies', assessment: '📝 Assessment', resources: '📚 Resources', atl: '🧠 ATL skills', profile: '🌟 Learner profile' });
  const wkList = k => (((custom.weekly || {}).lists || {})[k] || []).length ? custom.weekly.lists[k] : WK_LISTS_DEF[k];
  const WK_SUBJECTS = () => subjects.concat(['Unit of inquiry (PYP)', 'Arabic', 'Islamic Education', 'Social Studies', 'Moral Education', 'PE', 'Art', 'Music', 'ICT', 'Library', 'French', 'Other']).filter((x, j, a) => a.indexOf(x) === j);
  const blankLesson = day => ({ day: day || '', focus: '', stages: [0, 1, 2, 3, 4, 5].map(() => ({ a: '', t: '' })) });
  const blankSubject = sj => ({ subject: sj || '', obj_note: '', success: '', lessons: [blankLesson('mon')], support: [], support_note: '', challenge: [], challenge_note: '', assessment: [], assessment_note: '', resources: [], resources_note: '' });
  // plans written in an earlier layout are converted to this one
  const upgrade = D => {
    if (Array.isArray(D.subjects)) {
      D.subjects.forEach(sb => { sb.lessons = sb.lessons || []; sb.lessons.forEach(l => {
        if (!Array.isArray(l.stages)) { l.stages = [0, 1, 2, 3, 4, 5].map(() => ({ a: '', t: '' })); l.stages[0].t = [l.starter, l.starter_note].filter(Boolean).join(' – '); l.stages[1].t = [l.main, l.main_note].filter(Boolean).join(' – '); l.stages[4].t = [l.plenary, l.plenary_note].filter(Boolean).join(' – '); }
        l.stages = l.stages.concat([0, 1, 2, 3, 4, 5].map(() => ({ a: '', t: '' }))).slice(0, 6); });
        ['support', 'challenge', 'assessment', 'resources'].forEach(k => { if (!Array.isArray(sb[k])) sb[k] = sb[k] ? [].concat(sb[k]) : []; }); });
      return D;
    }
    const out = [];
    DAYS.forEach(([dk]) => ((D.days || {})[dk] || []).forEach(l => {
      let sb = out.find(x => x.subject === (l.subject || '')); if (!sb) { sb = blankSubject(l.subject || ''); sb.lessons = []; out.push(sb); }
      const nl = blankLesson(dk); nl.focus = l.focus || ''; nl.stages[0].t = l.starter || ''; nl.stages[1].t = l.main || ''; nl.stages[4].t = l.plenary || ''; sb.lessons.push(nl);
    }));
    if (out.length) { out[0].success = Array.isArray(D.success) ? D.success.join('\n') : (D.success || ''); out[0].support_note = D.support || ''; out[0].challenge_note = D.challenge || ''; out[0].assessment_note = D.assessment || ''; out[0].resources_note = D.resources || ''; }
    D.subjects = out; return D;
  };

  async function openWeek(pid) {
    setMode('weeks'); box.innerHTML = '<p class="empty">Loading…</p>';
    const { data: P } = await db.from('weekly_plans').select('*').eq('id', pid).maybeSingle();
    if (!P) { box.innerHTML = '<p class="empty">This weekly plan couldn’t be found.</p>'; return; }
    history.replaceState(null, '', '?week=' + pid);
    if (!CLS) { const { data } = await db.rpc('planning_classes', { sid: S.id }); CLS = data || []; }
    const C = CLS.find(c => c.id === P.group_id) || { name: 'Class', grade: '' }, D = upgrade(JSON.parse(JSON.stringify(P.data || {})));
    const canEdit = !!CLS.find(c => c.id === P.group_id), ro = canEdit ? '' : 'disabled';
    let canReview = false; { const { data: ap, error: ae } = await db.rpc('can_approve_weekly', { gid: P.group_id }); canReview = ae ? coversGrade(C.grade) : !!ap; }
    const { data: units } = await db.from('unit_plans').select('id, title').eq('school_id', S.id).eq('grade', C.grade).order('starts_on', { ascending: true });
    const picked = new Set(P.objective_ids || []), objs = {}, closedLes = new Set(), showAction = new Set();
    let active = 0, pickOpen = false;
    const noBank = sj => !sj || sj === 'Unit of inquiry (PYP)' || sj === 'Other';
    const loadObjs = async sj => { if (noBank(sj)) return []; if (objs[sj]) return objs[sj]; const { data } = await db.rpc('planner_objectives', { sid: S.id, sgrade: C.grade, ssubject: sj }); return (objs[sj] = data || []); };
    const st = PL_STATUS[P.status] || PL_STATUS.draft, STG = stages().slice(0, 6);
    const by = k => { const e = (P.edits || {})[k]; return `<small class="pl-by" data-by="${k}">${e ? 'Saved · ' + PL_E(e.by) + ' · ' + plWhen(e.at) : ''}</small>`; };
    const dayName = dk => (DAYS.find(d => d[0] === dk) || ['', ''])[1];
    // a tidy tag picker: chosen items as tags, the rest in a drop-down
    const tags = (key, list, on, scope) => { on = on || []; const rest = list.filter(x => !on.includes(x));
      return `<div class="wk-tags" data-tags="${key}" data-scope="${scope}">${on.map((x, i) => `<span class="wk-tag">${PL_E(x)}${canEdit ? `<button type="button" data-tagrm="${i}" aria-label="Remove ${PL_E(x)}">✕</button>` : ''}</span>`).join('')}
        ${canEdit ? `<select class="wk-tag-add" data-tagadd aria-label="Add"><option value="">+ Add…</option>${rest.map(x => `<option>${PL_E(x)}</option>`).join('')}<option value="__other">Other… (type your own)</option></select>` : (on.length ? '' : '<span class="meta">–</span>')}</div>`; };
    const glance = () => `<table class="wk-glance"><thead><tr>${DAYS.map(([, dn], i) => `<th>${dn}<small>${new Date(addDays(P.week_start, i) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></th>`).join('')}</tr></thead>
      <tbody><tr>${DAYS.map(([dk]) => `<td>${D.subjects.flatMap((sb, si) => (sb.lessons || []).filter(l => l.day === dk).map(l => `<button type="button" class="wk-g" data-goto="${si}"><b>${PL_E(sb.subject || 'Subject')}</b>${l.focus ? `<span>${PL_E(l.focus)}</span>` : ''}</button>`)).join('') || '<span class="meta">–</span>'}</td>`).join('')}</tr></tbody></table>`;
    const stageRow = (k, nm, l, optional) => `<tr class="${optional ? 'opt' : ''}"><th><span class="wk-s6-n">${k + 1}</span>${PL_E(nm)}${optional ? ' <small>optional</small>' : ''}</th>
      <td><input type="text" list="dl-stage${k}" data-lf="a" data-st="${k}" value="${PL_E((l.stages[k] || {}).a || '')}" placeholder="Choose or type an activity…" ${ro}></td>
      <td><textarea data-lf="t" data-st="${k}" rows="1" maxlength="1500" placeholder="Details" ${ro}>${PL_E((l.stages[k] || {}).t || '')}</textarea></td></tr>`;
    const lessonHtml = (si, li, l) => { const key = si + ':' + li, open = !closedLes.has(key), filled = (l.stages || []).slice(0, 5).filter(x => x.a || x.t).length;
      const act = l.stages[5] && (l.stages[5].a || l.stages[5].t), showAct = act || showAction.has(key);
      return `<article class="wk-les ${open ? 'open' : ''}" data-li="${li}"><header class="wk-les-top">
        <span class="wk-les-n">Lesson ${li + 1}</span>
        <select data-lf="day" ${ro} aria-label="Day"><option value="">Day…</option>${DAYS.map(([dk, dn]) => `<option value="${dk}" ${l.day === dk ? 'selected' : ''}>${dn}</option>`).join('')}</select>
        <input type="text" data-lf="focus" maxlength="200" value="${PL_E(l.focus || '')}" placeholder="Lesson focus" ${ro}>
        <span class="wk-prog ${filled === 5 ? 'full' : ''}">${filled}/5${act ? ' · ✓ action' : ''}</span>
        <button type="button" class="wk-icon" data-tog-les aria-label="${open ? 'Fold' : 'Open'}">${open ? '▴' : '▾'}</button>${canEdit ? '<button type="button" class="wk-icon danger" data-rm-les aria-label="Remove lesson">✕</button>' : ''}</header>
        ${open ? `<table class="wk-stage-t"><tbody>${STG.slice(0, 5).map((nm, k) => stageRow(k, nm, l, false)).join('')}${showAct ? stageRow(5, STG[5] || 'Taking action', l, true) : ''}</tbody></table>
          ${!showAct && canEdit ? `<button type="button" class="wk-add-act" data-add-act>+ Add ${PL_E(STG[5] || 'Taking action')} <small>(optional)</small></button>` : ''}` : ''}</article>`; };
    const subjectPanel = si => { const sb = D.subjects[si]; if (!sb) return '';
      const nObj = (objs[sb.subject] || []).filter(o => picked.has(o.id)).length;
      return `<section class="wk-panel" data-si="${si}">
        <div class="wk-panel-head"><h3>${PL_E(sb.subject || 'Subject')}</h3><span class="meta">${(sb.lessons || []).length} lesson${(sb.lessons || []).length === 1 ? '' : 's'} this week</span>
          ${canEdit ? `<select data-sf="subject" class="wk-chg" aria-label="Change subject"><option value="">Change subject…</option>${WK_SUBJECTS().map(x => `<option ${sb.subject === x ? 'selected' : ''}>${PL_E(x)}</option>`).join('')}</select><button type="button" class="link-btn danger" data-rm-subj>Remove subject</button>` : ''}</div>
        <div class="wk-part"><h4><span>1</span> Objectives and success criteria</h4><div class="wk-two">
          <div><label class="wk-l">🎯 Learning objectives</label>
            ${noBank(sb.subject) ? '' : `<button type="button" class="wk-pickbtn" data-tog-obj>${pickOpen ? '▴ Hide the curriculum' : '▾ Choose from the curriculum'}${nObj ? ` <b>${nObj} chosen</b>` : ''}</button><div class="wk-objpick" data-objbox></div>`}
            <div class="wk-objchosen" data-objchosen></div>
            <textarea data-sf="obj_note" rows="2" maxlength="1500" placeholder="Objectives in your own words (optional)" ${ro}>${PL_E(sb.obj_note || '')}</textarea></div>
          <div><label class="wk-l">✅ Success criteria</label><textarea data-sf="success" rows="5" maxlength="2000" placeholder="One per line, e.g. I can explain my thinking using a diagram" ${ro}>${PL_E(sb.success || '')}</textarea></div></div></div>
        <div class="wk-part"><h4><span>2</span> Lessons, through the inquiry cycle</h4><div class="wk-lesl">${(sb.lessons || []).map((l, li) => lessonHtml(si, li, l)).join('') || '<p class="meta">No lessons yet.</p>'}</div>
          ${canEdit ? '<button type="button" class="wk-add-les" data-add-les>+ Add a lesson</button>' : ''}</div>
        <div class="wk-part"><h4><span>3</span> Differentiation, assessment and resources</h4><div class="wk-four">
          ${[['support', '🧩 Support'], ['challenge', '🚀 Challenge'], ['assessment', '📝 Assessment'], ['resources', '📚 Resources']].map(([k, lab]) => `<div><label class="wk-l">${lab}</label>${tags(k, wkList(k), sb[k], 'subject')}
            <input type="text" data-sf="${k}_note" maxlength="500" value="${PL_E(sb[k + '_note'] || '')}" placeholder="Notes (optional)" ${ro}></div>`).join('')}</div></div></section>`; };
    const tabsHtml = () => `<div class="wk-tabs" role="tablist">${D.subjects.map((sb, si) => `<button type="button" role="tab" class="wk-tab ${si === active ? 'on' : ''}" data-tab="${si}" aria-selected="${si === active}"><b>${PL_E(sb.subject || 'Subject')}</b><small>${(sb.lessons || []).length} lesson${(sb.lessons || []).length === 1 ? '' : 's'}</small></button>`).join('')}
      ${canEdit ? `<select id="wk-new-subj" class="wk-tab-add" aria-label="Add a subject"><option value="">➕ Add subject</option>${WK_SUBJECTS().filter(x => !D.subjects.some(sb => sb.subject === x)).map(x => `<option>${PL_E(x)}</option>`).join('')}</select>` : ''}</div>`;
    const empty = !D.subjects.length && !P.stage;
    box.innerHTML = `<div class="wk-root">${[0, 1, 2, 3, 4, 5].map(k => `<datalist id="dl-stage${k}">${wkList('stage' + k).map(x => `<option value="${PL_E(x)}">`).join('')}</datalist>`).join('')}
      <div class="wk-bar2"><button type="button" class="link-btn" id="wk-back">‹ All classes</button>
        <div class="wk-bar2-t"><b>${PL_E(C.name)}</b><span>Week of ${wkLabel(P.week_start)}</span></div><span class="rc-st ${st[0]}">${st[1]}</span>${by('subjects')}
        <div class="wk-bar2-a">${canEdit && empty ? '<button type="button" class="pill pill-soft" id="wk-copy">📋 Copy last week</button>' : ''}
          ${canEdit && (P.status === 'draft' || P.status === 'returned') ? '<button type="button" class="btn btn-red" data-flow="submit">📤 Submit for review</button>' : ''}
          ${P.status === 'review' && canReview ? '<button type="button" class="btn btn-white outline" data-flow="return">↩ Return</button><button type="button" class="btn btn-red" data-flow="approve">✅ Approve</button>' : ''}
          ${P.status === 'approved' && canReview ? '<button type="button" class="btn btn-white outline" data-flow="return">💬 Feedback</button>' : ''}
          <details class="wk-more"><summary class="pill pill-soft" aria-label="More">⋯</summary><div class="wk-more-m">
            <button type="button" id="wk-word">⬇ Download Word</button><button type="button" id="wk-print">🖨️ Print</button><button type="button" id="wk-refresh">🔄 Refresh</button>
            ${canEdit && (P.status === 'approved' || P.status === 'review') ? '<button type="button" data-flow="reopen">✏️ Reopen for editing</button>' : ''}${canEdit ? '<button type="button" class="danger" id="wk-del">🗑 Delete plan</button>' : ''}</div></details></div></div>
      ${P.feedback ? `<p class="note wk-fb">${P.status === 'returned' ? '↩' : '💬'} <b>Feedback from your school leader:</b> ${PL_E(P.feedback)}</p>` : ''}
      <section class="panel wk-over"><h3>📋 Week overview</h3><div class="wk-over-g">
        <div><label class="wk-l">📘 Unit</label><select id="wk-unit" ${ro}><option value="">–</option>${(units || []).map(u => `<option value="${u.id}" ${P.unit_plan_id === u.id ? 'selected' : ''}>${PL_E(u.title)}</option>`).join('')}</select>
          <label class="wk-l">🔄 Main inquiry focus (optional)</label><select id="wk-stage" ${ro}><option value="">–</option>${STG.map(x => `<option ${P.stage === x ? 'selected' : ''}>${PL_E(x)}</option>`).join('')}</select></div>
        <div><label class="wk-l">🧠 ATL skills</label>${tags('atl', wkList('atl'), D.atl, 'week')}<label class="wk-l">🌟 Learner profile</label>${tags('profile', wkList('profile'), D.profile, 'week')}</div></div></section>
      <details class="panel wk-glance-box" open><summary><h3>🗓️ Week at a glance</h3></summary><div class="in-scroll" id="wk-glance">${glance()}</div></details>
      <section class="wk-subjects-box"><div id="wk-tabs"></div><div id="wk-subjects"></div></section>
      <section class="panel pl-sec"><h3>💭 Reflection (after the week)</h3><textarea data-f="reflection" rows="3" maxlength="4000" placeholder="What worked well? What will you change next week?" ${canEdit ? '' : 'readonly'}>${PL_E(D.reflection || '')}</textarea>${by('reflection')}</section></div>`;
    const root = box.querySelector('.wk-root');
    const subBox = document.getElementById('wk-subjects'), tabBox = document.getElementById('wk-tabs');
    const drawChosen = async () => { const el = subBox.querySelector('[data-objchosen]'); if (!el) return; const sb = D.subjects[active]; const L = await loadObjs(sb.subject), ch = L.filter(o => picked.has(o.id));
      el.innerHTML = ch.length ? `<ul class="wk-objlist">${ch.map(o => `<li>${PL_E(o.text)}</li>`).join('')}</ul>` : ''; };
    const drawPicker = async () => {
      const sec = subBox.querySelector('[data-objbox]'); if (!sec || !pickOpen) { if (sec) sec.innerHTML = ''; return; }
      sec.innerHTML = '<p class="meta">Loading…</p>';
      const sb = D.subjects[active], L = await loadObjs(sb.subject), topics = [...new Set(L.map(o => o.topic))];
      sec.innerHTML = L.length ? topics.map(tp => `<details class="pl-topic" ${L.filter(o => o.topic === tp).some(o => picked.has(o.id)) ? 'open' : ''}><summary>${PL_E(tp)} <small class="meta">${L.filter(o => o.topic === tp && picked.has(o.id)).length}/${L.filter(o => o.topic === tp).length}</small></summary>
        ${L.filter(o => o.topic === tp).map(o => `<label class="pl-obj"><input type="checkbox" data-obj value="${o.id}" ${picked.has(o.id) ? 'checked' : ''} ${ro}><span>${PL_E(o.text)}</span></label>`).join('')}</details>`).join('') : `<p class="meta">No ${PL_E(sb.subject)} objectives for ${PL_E(C.grade)} in your school’s curriculum yet.</p>`;
    };
    const draw = () => { if (active >= D.subjects.length) active = Math.max(0, D.subjects.length - 1);
      tabBox.innerHTML = tabsHtml();
      subBox.innerHTML = D.subjects.length ? subjectPanel(active) : '<div class="empty-box"><p>Start by adding the subjects you’re teaching this week (➕ Add subject), or copy last week’s plan.</p></div>';
      drawPicker(); drawChosen(); subBox.querySelectorAll('textarea[data-lf="t"]').forEach(autoGrow); };
    const autoGrow = t => { t.style.height = 'auto'; t.style.height = Math.max(38, t.scrollHeight + 2) + 'px'; };
    // saving
    const saved = (k, t) => { const b = box.querySelector(`[data-by="${k}"]`); if (b) b.textContent = t; };
    const save = async (k, v) => { saved(k, 'Saving…'); const { error } = await db.rpc('set_weekly_field', { pid, fkey: k, fval: v }); if (error) { saved(k, '⚠️ Not saved'); return say(friendly(error)); } saved(k, '✓ Saved'); };
    let sTimer; const saveSubjects = () => { clearTimeout(sTimer); saved('subjects', 'Saving…'); sTimer = setTimeout(() => { save('subjects', D.subjects); document.getElementById('wk-glance').innerHTML = glance(); }, 700); };
    const upd = async row => { const { error } = await db.from('weekly_plans').update(row).eq('id', pid); if (error) say(friendly(error)); else saved('subjects', '✓ Saved'); };
    draw();
    // tags (subject or week)
    const tagTarget = el => { const w = el.closest('[data-tags]'); return w && (w.dataset.scope === 'week' ? D : D.subjects[active]); };
    const tagsChanged = w => { if (w.dataset.scope === 'week') save(w.dataset.tags, D[w.dataset.tags]); else saveSubjects(); };
    const onTagAdd = (sel) => { const w = sel.closest('[data-tags]'), obj = tagTarget(sel), k = w.dataset.tags; let v = sel.value; if (!v) return;
      if (v === '__other') { v = (prompt('Type your own:', '') || '').trim(); if (!v) { sel.value = ''; return; } }
      obj[k] = (obj[k] || []).concat(v).filter((x, i, a) => a.indexOf(x) === i); tagsChanged(w); w.outerHTML = tags(k, wkList(k), obj[k], w.dataset.scope); };
    const onTagRm = (b) => { const w = b.closest('[data-tags]'), obj = tagTarget(b), k = w.dataset.tags; obj[k].splice(Number(b.dataset.tagrm), 1); tagsChanged(w); w.outerHTML = tags(k, wkList(k), obj[k], w.dataset.scope); };
    root.addEventListener('change', e => { if (e.target.matches('[data-tagadd]') && canEdit) onTagAdd(e.target); });
    root.addEventListener('click', e => { const b = e.target.closest('[data-tagrm]'); if (b && canEdit) onTagRm(b); const g = e.target.closest('[data-goto]'); if (g) { active = Number(g.dataset.goto); pickOpen = false; draw(); tabBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    // subject fields and lessons
    const field = e => { const el = e.target, sec = el.closest('[data-si]'); if (!sec || !canEdit || el.matches('[data-tagadd]')) return; const sb = D.subjects[active];
      if (el.dataset.sf) { if (el.dataset.sf === 'subject') { if (e.type !== 'change' || !el.value) return; sb.subject = el.value; pickOpen = false; draw(); saveSubjects(); return; } sb[el.dataset.sf] = el.value; saveSubjects(); return; }
      if (el.hasAttribute('data-obj')) { if (e.type !== 'change') return; const id = Number(el.value); el.checked ? picked.add(id) : picked.delete(id); upd({ objective_ids: [...picked] }); drawChosen();
        const pb = subBox.querySelector('[data-tog-obj]'); if (pb) { const n = (objs[sb.subject] || []).filter(o => picked.has(o.id)).length; pb.innerHTML = `▴ Hide the curriculum${n ? ` <b>${n} chosen</b>` : ''}`; } return; }
      const les = el.closest('[data-li]'); if (les && el.dataset.lf) { const l = sb.lessons[Number(les.dataset.li)];
        if (el.dataset.st !== undefined) l.stages[Number(el.dataset.st)][el.dataset.lf] = el.value; else l[el.dataset.lf] = el.value;
        if (el.tagName === 'TEXTAREA') autoGrow(el);
        const pg = les.querySelector('.wk-prog'), f = l.stages.slice(0, 5).filter(x => x.a || x.t).length, act = l.stages[5] && (l.stages[5].a || l.stages[5].t);
        if (pg) { pg.textContent = `${f}/5${act ? ' · ✓ action' : ''}`; pg.classList.toggle('full', f === 5); }
        if (el.dataset.lf === 'day' && e.type === 'change') { document.getElementById('wk-glance').innerHTML = glance(); }
        saveSubjects(); } };
    subBox.addEventListener('change', field);
    subBox.addEventListener('input', e => { if (e.target.matches('textarea, input[type=text]')) field(e); });
    subBox.addEventListener('click', e => {
      const sec = e.target.closest('[data-si]'); if (!sec) return; const sb = D.subjects[active];
      if (e.target.closest('[data-tog-obj]')) { pickOpen = !pickOpen; draw(); return; }
      if (e.target.closest('[data-rm-subj]')) { if (!confirm(`Remove ${sb.subject || 'this subject'} from this week’s plan?`)) return; D.subjects.splice(active, 1); closedLes.clear(); showAction.clear(); active = Math.max(0, active - 1); draw(); saveSubjects(); return; }
      if (e.target.closest('[data-add-les]')) { const used = (sb.lessons || []).map(l => l.day), next = (DAYS.find(([dk]) => !used.includes(dk)) || DAYS[0])[0]; sb.lessons.push(blankLesson(next)); draw(); saveSubjects(); return; }
      const les = e.target.closest('[data-li]'); if (!les) return; const li = Number(les.dataset.li), key = active + ':' + li;
      if (e.target.closest('[data-tog-les]')) { closedLes.has(key) ? closedLes.delete(key) : closedLes.add(key); draw(); return; }
      if (e.target.closest('[data-add-act]')) { showAction.add(key); draw(); const inp = subBox.querySelector(`.wk-les[data-li="${li}"] [data-st="5"][data-lf="a"]`); if (inp) inp.focus(); return; }
      if (e.target.closest('[data-rm-les]')) { if (!confirm('Remove this lesson?')) return; sb.lessons.splice(li, 1); closedLes.clear(); showAction.clear(); draw(); saveSubjects(); }
    });
    tabBox.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (!t) return; active = Number(t.dataset.tab); pickOpen = false; draw(); });
    tabBox.addEventListener('change', e => { if (e.target.id !== 'wk-new-subj' || !e.target.value) return; D.subjects.push(blankSubject(e.target.value)); active = D.subjects.length - 1; pickOpen = false; draw(); saveSubjects(); });
    const rf = box.querySelector('textarea[data-f="reflection"]'); let lastR = rf.value; rf.onblur = () => { if (!canEdit || rf.value === lastR) return; lastR = rf.value; save('reflection', rf.value); };
    document.getElementById('wk-unit').onchange = e => upd({ unit_plan_id: e.target.value ? Number(e.target.value) : null });
    document.getElementById('wk-stage').onchange = e => upd({ stage: e.target.value || null });
    // review flow
    box.querySelectorAll('[data-flow]').forEach(b => b.onclick = async () => {
      const a = b.dataset.flow; let note = '';
      if (a === 'return') { note = prompt(P.status === 'approved' ? 'Your feedback for the teacher:' : 'What should the teacher change?', P.feedback || ''); if (note === null) return; }
      if (a === 'submit' && !confirm('Submit this weekly plan for review by your school leaders?')) return;
      const action = a === 'return' && P.status === 'approved' ? 'approve' : a;
      const { error } = await db.rpc('review_weekly_plan', { pid, action, note });
      if (error) return say(friendly(error));
      say(action === 'approve' && a === 'return' ? '💬 Feedback sent.' : { submit: '📤 Submitted for review.', approve: '✅ Approved.', return: '↩ Returned with your feedback.', reopen: '✏️ Open for editing again.' }[action]); openWeek(pid);
    });
    const del = document.getElementById('wk-del'); if (del) del.onclick = async () => { if (!confirm('Delete this weekly plan? This can’t be undone.')) return; const { error } = await db.from('weekly_plans').delete().eq('id', pid); if (error) return say(friendly(error)); history.replaceState(null, '', 'planner.html'); weeks(); };
    document.getElementById('wk-back').onclick = () => { onlyMine = canEdit; history.replaceState(null, '', 'planner.html?mode=weeks' + (canEdit ? '' : '&all=1')); wk = P.week_start; weeks(); };
    document.getElementById('wk-refresh').onclick = () => openWeek(pid);
    const cp = document.getElementById('wk-copy');
    if (cp) cp.onclick = async () => {
      const { data: prev } = await db.from('weekly_plans').select('*').eq('group_id', P.group_id).lt('week_start', P.week_start).order('week_start', { ascending: false }).limit(1).maybeSingle();
      if (!prev) return say('There’s no earlier weekly plan for this class to copy.');
      if (!confirm(`Copy the plan from the week of ${wkLabel(prev.week_start)}? You can then change anything.`)) return;
      const pd = upgrade(JSON.parse(JSON.stringify(prev.data || {})));
      await db.rpc('set_weekly_field', { pid, fkey: 'subjects', fval: pd.subjects || [] });
      for (const k of ['atl', 'profile']) if (pd[k]) await db.rpc('set_weekly_field', { pid, fkey: k, fval: pd[k] });
      await upd({ unit_plan_id: prev.unit_plan_id, stage: prev.stage, objective_ids: prev.objective_ids });
      say('📋 Copied. Now adjust it for this week.'); openWeek(pid);
    };
    // Word and print
    const exportHtml = async () => {
      for (const sb of D.subjects) await loadObjs(sb.subject);
      const E = PL_E, list = (arr, note) => E([].concat(arr || [], note ? [note] : []).join(', ') || '–');
      const unit = (units || []).find(u => u.id === P.unit_plan_id);
      return `<html><head><meta charset="utf-8"><title>${E(C.name)} weekly plan</title><style>body{font-family:Arial,sans-serif;color:#1D2026;margin:24px;font-size:10pt}h1{color:${S.color_primary};margin:0 0 4px;font-size:17pt}
        h2{font-size:12.5pt;color:#fff;background:${S.color_primary};padding:5px 8px;margin:18px 0 6px}h3{font-size:10.5pt;color:${S.color_primary};margin:10px 0 4px}table{border-collapse:collapse;width:100%;margin:4px 0}td,th{border:1px solid #ccc;padding:4px 6px;vertical-align:top;font-size:9pt;text-align:left}
        th{background:#EEF0FB}.meta{color:#555}ul{margin:2px 0 2px 18px}p{margin:3px 0}</style></head><body>
        <p class="meta">${E(S.name)} · Weekly plan</p><h1>${E(C.name)} · Week of ${wkLabel(P.week_start)}</h1>
        <p class="meta">${unit ? 'Unit: ' + E(unit.title) + ' · ' : ''}${P.stage ? 'Main inquiry focus: ' + E(P.stage) + ' · ' : ''}${(D.atl || []).length ? 'ATL skills: ' + E(D.atl.join(', ')) + ' · ' : ''}${(D.profile || []).length ? 'Learner profile: ' + E(D.profile.join(', ')) : ''}</p>
        <h3>Week at a glance</h3><table><tr>${DAYS.map(([, dn]) => `<th>${dn}</th>`).join('')}</tr><tr>${DAYS.map(([dk]) => `<td>${D.subjects.flatMap(sb => (sb.lessons || []).filter(l => l.day === dk).map(l => `<b>${E(sb.subject)}</b>${l.focus ? ': ' + E(l.focus) : ''}`)).join('<br>') || '–'}</td>`).join('')}</tr></table>
        ${D.subjects.map(sb => { const ob = (objs[sb.subject] || []).filter(o => picked.has(o.id));
          return `<h2>${E(sb.subject || 'Subject')}</h2><table><tr><th style="width:50%">Learning objectives</th><th>Success criteria</th></tr><tr><td>${ob.length ? `<ul>${ob.map(o => `<li>${E(o.text)}</li>`).join('')}</ul>` : ''}${sb.obj_note ? `<p>${E(sb.obj_note).replace(/\n/g, '<br>')}</p>` : ''}${!ob.length && !sb.obj_note ? '–' : ''}</td><td>${E(sb.success || '–').replace(/\n/g, '<br>')}</td></tr></table>
            ${(sb.lessons || []).map((l, li) => `<h3>Lesson ${li + 1} · ${E(dayName(l.day) || '')}${l.focus ? ': ' + E(l.focus) : ''}</h3><table><tr><th style="width:24%">Inquiry stage</th><th style="width:30%">Activity</th><th>Details</th></tr>
              ${STG.map((nm, k) => k === 5 && !((l.stages[5] || {}).a || (l.stages[5] || {}).t) ? '' : `<tr><td><b>${k + 1}. ${E(nm)}</b>${k === 5 ? ' <i>(optional)</i>' : ''}</td><td>${E((l.stages[k] || {}).a || '')}</td><td>${E((l.stages[k] || {}).t || '').replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`).join('')}
            <table><tr><th>Support</th><th>Challenge</th><th>Assessment</th><th>Resources</th></tr><tr><td>${list(sb.support, sb.support_note)}</td><td>${list(sb.challenge, sb.challenge_note)}</td><td>${list(sb.assessment, sb.assessment_note)}</td><td>${list(sb.resources, sb.resources_note)}</td></tr></table>`; }).join('')}
        <h2>Reflection</h2><p>${E(D.reflection || '–').replace(/\n/g, '<br>')}</p></body></html>`;
    };
    document.getElementById('wk-word').onclick = async () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + await exportHtml()], { type: 'application/msword' }));
      a.download = (C.name + ' weekly plan ' + P.week_start).replace(/[^\w\u0600-\u06FF-]+/g, '-') + '.doc'; document.body.appendChild(a); a.click(); a.remove(); };
    document.getElementById('wk-print').onclick = async () => { const w = window.open('', '_blank'); if (!w) return say('Please allow pop-ups to print.'); w.document.write(await exportHtml()); w.document.close(); setTimeout(() => w.print(), 400); };
    box.scrollIntoView({ block: 'start' });
  }

  // ----- leaders: rename or hide sections of the templates
  function customise() {
    const fb = document.getElementById('pl-form-box');
    fb.innerHTML = `<section class="panel pl-form"><h2>⚙️ Customise the template</h2><p class="meta">Rename sections to match your school’s language (for example “Key concepts” → “Specified concepts”), or hide sections you don’t use. Changes apply to every unit.</p>
      ${Object.entries(PL_TEMPLATES).map(([k, t]) => `<h3 class="sc-h3">${k === 'pyp' ? '🌍' : '📘'} ${t.name}</h3><div class="pl-cust">${t.sections.map(sec => { const c = (custom[k] || {})[sec.key] || {};
        return `<div class="pl-cust-row" data-t="${k}" data-k="${sec.key}"><span class="meta">${PL_E(sec.label)}</span><input type="text" maxlength="80" value="${PL_E(c.label || '')}" placeholder="${PL_E(sec.label)}" aria-label="New name for ${PL_E(sec.label)}"><label class="remember"><input type="checkbox" ${c.hidden ? 'checked' : ''}> Hide</label></div>`; }).join('')}</div>`).join('')}
      <h3 class="sc-h3">📅 Weekly plans: inquiry cycle stages</h3><p class="meta">The six stages every lesson follows, one per line, in order. For example, change “Making conclusions” to “Making connections”.</p>
      <textarea id="pl-stages" rows="6" class="pl-stages">${PL_E(stages().join('\n'))}</textarea>
      <h3 class="sc-h3">📅 Weekly plans: drop-down choices</h3><p class="meta">One choice per line. Teachers pick from these, and can still type their own.</p>
      <div class="pl-lists">${Object.entries(wkListNames()).map(([k, n]) => `<label>${n}<textarea data-wl="${k}" rows="5" class="pl-stages">${PL_E(wkList(k).join('\n'))}</textarea></label>`).join('')}</div>
      <div class="ca-bar"><button type="button" class="link-btn" id="pl-cu-x">Cancel</button><button type="button" class="btn btn-red" id="pl-cu-save">💾 Save template</button></div></section>`;
    document.getElementById('pl-cu-x').onclick = () => { fb.innerHTML = ''; };
    document.getElementById('pl-cu-save').onclick = async () => {
      const next = {};
      fb.querySelectorAll('.pl-cust-row').forEach(r => { const lab = r.querySelector('input[type=text]').value.trim(), hid = r.querySelector('input[type=checkbox]').checked;
        if (lab || hid) { (next[r.dataset.t] = next[r.dataset.t] || {})[r.dataset.k] = Object.assign({}, lab ? { label: lab } : {}, hid ? { hidden: true } : {}); } });
      const stl = document.getElementById('pl-stages').value.split('\n').map(x => x.trim()).filter(Boolean);
      next.weekly = {};
      if (stl.length && stl.join('|') !== STAGES_DEF.join('|')) next.weekly.stages = stl.slice(0, 6);
      fb.querySelectorAll('[data-wl]').forEach(t => { const v = t.value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 40); if (v.length && v.join('|') !== WK_LISTS_DEF[t.dataset.wl].join('|')) (next.weekly.lists = next.weekly.lists || {})[t.dataset.wl] = v; });
      const { error } = await db.rpc('set_planner_sections', { sid: S.id, val: next });
      if (error) return say(friendly(error)); custom = next; say('✅ Template saved.'); fb.innerHTML = '';
    };
  }

  // ===== 📑 Subject plans: a subject overview (grades × terms) and mid-term plans (one per grade and term) =====
  const SP_TERMS = () => (S.terms && S.terms.length ? S.terms : ['Term 1', 'Term 2', 'Term 3']);
  const spDl = (html, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/msword' })); a.download = name.replace(/[^\w\u0600-\u06FF-]+/g, '-') + '.doc'; document.body.appendChild(a); a.click(); a.remove(); };
  const spDoc = (title, body) => `<html><head><meta charset="utf-8"><title>${PL_E(title)}</title><style>body{font-family:Arial,sans-serif;color:#1D2026;margin:24px;font-size:10pt}h1{color:${S.color_primary};font-size:17pt;margin:0 0 4px}
    h2{font-size:12.5pt;color:#fff;background:${S.color_primary};padding:5px 8px;margin:16px 0 6px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:5px 7px;vertical-align:top;font-size:9.5pt;text-align:left}th{background:#EEF0FB}.meta{color:#555}</style></head><body>${body}</body></html>`;
  async function subjectPlans(want) {
    setMode('subject'); history.replaceState(null, '', 'planner.html?mode=subject' + (want ? '&subject=' + encodeURIComponent(want) : ''));
    box.innerHTML = '<p class="empty">Loading…</p>';
    const { data: subs, error } = await db.rpc('my_plan_subjects', { sid: S.id });
    if (error) { box.innerHTML = `<p class="note">${/my_plan_subjects|function/.test(error.message || '') ? 'Subject plans need database update 74. Please ask your school admin.' : PL_E(error.message)}</p>`; return; }
    if (!(subs || []).length) { box.innerHTML = '<div class="empty-box"><p>📑 Subject plans appear here for the subjects you teach or coordinate.</p></div>'; return; }
    const cur = subs.find(x => x.subject === want) || subs.find(x => x.can_edit) || subs[0], canEdit = !!cur.can_edit, terms = SP_TERMS(), grades = S.grades || [];
    const [{ data: ovId }, { data: mids }] = await Promise.all([db.rpc('subject_plan_open', { sid: S.id, subj: cur.subject, pkind: 'overview', pgrade: '', pterm: '' }),
      db.from('subject_plans').select('id, grade, term, data, updated_at').eq('school_id', S.id).eq('subject', cur.subject).eq('kind', 'midterm')]);
    let ov = null; if (ovId) { const { data } = await db.from('subject_plans').select('*').eq('id', ovId).maybeSingle(); ov = data; }
    const grid = Object.assign({}, ((ov && ov.data) || {}).grid || {}), cell = (g, t) => ((grid[g] || {})[t]) || '';
    const mid = (g, t) => (mids || []).find(m => m.grade === g && m.term === t);
    box.innerHTML = `<div class="page-head"><h1 class="title">📑 Subject plans</h1></div>
      <p class="hint">The year at a glance for each subject, and mid-term plans for every grade and term. ${canEdit ? '✏️ You can edit this subject.' : '👀 You can read this subject’s plans.'}</p>
      <div class="sp-subs">${subs.map(x => `<button type="button" class="chip ${x.subject === cur.subject ? 'on' : ''}" data-sp="${PL_E(x.subject)}">${PL_E(x.subject)}${x.can_edit ? ' ✏️' : ''}</button>`).join('')}</div>
      <section class="panel sp-sec"><div class="in-head"><h2>📘 ${PL_E(cur.subject)} overview</h2><span class="sp-acts"><small class="pl-by" id="sp-ov-by"></small><button type="button" class="pill pill-soft" id="sp-ov-word">⬇ Word</button></span></div>
        ${ov ? `<div class="in-scroll"><table class="sp-grid"><thead><tr><th>Grade</th>${terms.map(t => `<th>${PL_E(t)}</th>`).join('')}</tr></thead><tbody>
          ${grades.map(g => `<tr><th>${PL_E(g)}</th>${terms.map(t => `<td>${canEdit ? `<textarea data-g="${PL_E(g)}" data-t="${PL_E(t)}" rows="3" placeholder="Topics or units">${PL_E(cell(g, t))}</textarea>` : `<div class="sp-txt">${PL_E(cell(g, t) || '–').replace(/\n/g, '<br>')}</div>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <label class="wk-l">Notes</label>${canEdit ? `<textarea id="sp-ov-notes" rows="2" placeholder="Key messages, progression, links to other subjects…">${PL_E(((ov.data || {}).notes) || '')}</textarea>` : `<p>${PL_E(((ov.data || {}).notes) || '–')}</p>`}`
          : '<p class="meta">The subject coordinator hasn’t started this overview yet.</p>'}</section>
      <section class="panel sp-sec"><h2>🗓️ Mid-term plans</h2><div class="in-scroll"><table class="sp-grid sp-mid"><thead><tr><th>Grade</th>${terms.map(t => `<th>${PL_E(t)}</th>`).join('')}</tr></thead><tbody>
        ${grades.map(g => `<tr><th>${PL_E(g)}</th>${terms.map(t => { const m = mid(g, t); return `<td>${m ? `<button type="button" class="sp-open" data-mg="${PL_E(g)}" data-mt="${PL_E(t)}"><b>${PL_E((m.data || {}).title || 'Mid-term plan')}</b><small>Open</small></button>`
          : canEdit ? `<button type="button" class="sp-new" data-mg="${PL_E(g)}" data-mt="${PL_E(t)}">➕ Create</button>` : '<span class="meta">–</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div></section>`;
    box.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => subjectPlans(b.dataset.sp));
    box.querySelectorAll('[data-mg]').forEach(b => b.onclick = () => openMidterm(cur.subject, b.dataset.mg, b.dataset.mt, canEdit));
    let tm; const saveGrid = () => { clearTimeout(tm); document.getElementById('sp-ov-by').textContent = 'Saving…'; tm = setTimeout(async () => { const { error: e } = await db.rpc('subject_plan_set', { pid: ovId, fkey: 'grid', fval: grid }); document.getElementById('sp-ov-by').textContent = e ? '⚠️ Not saved' : '✓ Saved'; if (e) say(friendly(e)); }, 700); };
    box.querySelectorAll('textarea[data-g]').forEach(t => t.oninput = () => { grid[t.dataset.g] = Object.assign({}, grid[t.dataset.g] || {}, { [t.dataset.t]: t.value }); saveGrid(); });
    const nt = document.getElementById('sp-ov-notes'); let tn;
    if (nt) nt.oninput = () => { clearTimeout(tn); tn = setTimeout(async () => { const { error: e } = await db.rpc('subject_plan_set', { pid: ovId, fkey: 'notes', fval: nt.value }); document.getElementById('sp-ov-by').textContent = e ? '⚠️ Not saved' : '✓ Saved'; }, 700); };
    document.getElementById('sp-ov-word').onclick = () => spDl(spDoc(cur.subject + ' overview', `<p class="meta">${PL_E(S.name)} · Subject overview</p><h1>${PL_E(cur.subject)} overview</h1>
      <table><tr><th>Grade</th>${terms.map(t => `<th>${PL_E(t)}</th>`).join('')}</tr>${grades.map(g => `<tr><th>${PL_E(g)}</th>${terms.map(t => `<td>${PL_E(cell(g, t)).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`).join('')}</table>
      ${((ov && ov.data) || {}).notes ? `<h2>Notes</h2><p>${PL_E(ov.data.notes).replace(/\n/g, '<br>')}</p>` : ''}`), cur.subject + ' overview');
  }
  async function openMidterm(subj, grade, term, canEdit) {
    setMode('subject'); box.innerHTML = '<p class="empty">Loading…</p>';
    const { data: pid, error } = await db.rpc('subject_plan_open', { sid: S.id, subj, pkind: 'midterm', pgrade: grade, pterm: term });
    if (error || !pid) { say(error ? friendly(error) : 'This mid-term plan hasn’t been written yet.'); subjectPlans(subj); return; }
    const [{ data: P }, { data: objs }] = await Promise.all([db.from('subject_plans').select('*').eq('id', pid).maybeSingle(), db.rpc('planner_objectives', { sid: S.id, sgrade: grade, ssubject: subj })]);
    const D = Object.assign({ weeks: [] }, P.data || {}), picked = new Set(P.objective_ids || []), L = objs || [], ro = canEdit ? '' : 'readonly';
    if (!D.weeks.length) D.weeks = [1, 2, 3, 4, 5, 6].map(n => ({ focus: '', activities: '', assessment: '' }));
    const F = [['overview', '🌍 Big picture', 'What is this term about, and why does it matter?'], ['assessment', '📝 Assessment', 'How will you know students have learned it?'], ['differentiation', '🧩 Support and challenge', 'Support for those who need it, challenge for those ready for more'], ['resources', '📚 Resources', 'Books, materials, websites'], ['links', '🔗 Cross-curricular links', 'Links to units of inquiry and other subjects']];
    const weeksHtml = () => `<table class="sp-weeks"><thead><tr><th>Week</th><th>Focus / content</th><th>Key activities</th><th>Assessment</th>${canEdit ? '<th></th>' : ''}</tr></thead><tbody>${D.weeks.map((w, i) => `<tr data-w="${i}"><th>${i + 1}</th>
      ${['focus', 'activities', 'assessment'].map(k => `<td>${canEdit ? `<textarea data-wk="${k}" rows="2">${PL_E(w[k] || '')}</textarea>` : PL_E(w[k] || '').replace(/\n/g, '<br>')}</td>`).join('')}${canEdit ? '<td><button type="button" class="wk-icon danger" data-wrm aria-label="Remove week">✕</button></td>' : ''}</tr>`).join('')}</tbody></table>${canEdit ? '<button type="button" class="wk-add-les" id="sp-wadd">+ Add a week</button>' : ''}`;
    const topics = [...new Set(L.map(o => o.topic))];
    box.innerHTML = `<div class="pl-top"><button type="button" class="link-btn" id="sp-back">‹ ${PL_E(subj)} plans</button><div class="pl-top-acts"><small class="pl-by" id="sp-by"></small><button type="button" class="pill pill-soft" id="sp-word">⬇ Word</button></div></div>
      <section class="panel sp-sec"><span class="pl-tpl">🗓️ Mid-term plan · ${PL_E(subj)}</span><h2 class="wk-title">${PL_E(grade)} · ${PL_E(term)}</h2>
        <label class="wk-l">Topic or unit title</label><input type="text" class="sp-title" data-f="title" maxlength="160" value="${PL_E(D.title || '')}" placeholder="e.g. Fractions and decimals" ${ro}>
        <label class="wk-l">🌍 Big picture</label><textarea data-f="overview" rows="2" placeholder="What is this term about, and why does it matter?" ${ro}>${PL_E(D.overview || '')}</textarea></section>
      <section class="panel sp-sec"><h3>🎯 Learning objectives</h3>${L.length ? topics.map(tp => `<details class="pl-topic" ${L.filter(o => o.topic === tp).some(o => picked.has(o.id)) ? 'open' : ''}><summary>${PL_E(tp)} <small class="meta">${L.filter(o => o.topic === tp && picked.has(o.id)).length}/${L.filter(o => o.topic === tp).length}</small></summary>
          ${L.filter(o => o.topic === tp).map(o => `<label class="pl-obj"><input type="checkbox" value="${o.id}" data-obj ${picked.has(o.id) ? 'checked' : ''} ${canEdit ? '' : 'disabled'}><span>${PL_E(o.text)}</span></label>`).join('')}</details>`).join('') : `<p class="meta">No ${PL_E(subj)} objectives for ${PL_E(grade)} in the school’s curriculum yet.</p>`}</section>
      <section class="panel sp-sec"><h3>📆 Week by week</h3><div id="sp-weeks">${weeksHtml()}</div></section>
      ${F.slice(1).map(([k, l, ph]) => `<section class="panel sp-sec"><h3>${l}</h3><textarea data-f="${k}" rows="3" placeholder="${ph}" ${ro}>${PL_E(D[k] || '')}</textarea></section>`).join('')}`;
    const by = t => { document.getElementById('sp-by').textContent = t; };
    const timers = {}; const save = (k, v) => { clearTimeout(timers[k]); by('Saving…'); timers[k] = setTimeout(async () => { const { error: e } = await db.rpc('subject_plan_set', { pid, fkey: k, fval: v }); by(e ? '⚠️ Not saved' : '✓ Saved'); if (e) say(friendly(e)); }, 700); };
    if (canEdit) {
      box.querySelectorAll('[data-f]').forEach(el => el.oninput = () => { D[el.dataset.f] = el.value; save(el.dataset.f, el.value); });
      box.querySelectorAll('[data-obj]').forEach(cb => cb.onchange = () => { cb.checked ? picked.add(Number(cb.value)) : picked.delete(Number(cb.value)); save('objective_ids', [...picked]); });
      const wb = document.getElementById('sp-weeks');
      wb.addEventListener('input', e => { const tr = e.target.closest('[data-w]'); if (!tr || !e.target.dataset.wk) return; D.weeks[Number(tr.dataset.w)][e.target.dataset.wk] = e.target.value; save('weeks', D.weeks); });
      wb.addEventListener('click', e => { if (e.target.closest('#sp-wadd')) { D.weeks.push({ focus: '', activities: '', assessment: '' }); wb.innerHTML = weeksHtml(); save('weeks', D.weeks); }
        const rm = e.target.closest('[data-wrm]'); if (rm && confirm('Remove this week?')) { D.weeks.splice(Number(rm.closest('[data-w]').dataset.w), 1); wb.innerHTML = weeksHtml(); save('weeks', D.weeks); } });
    }
    document.getElementById('sp-back').onclick = () => subjectPlans(subj);
    document.getElementById('sp-word').onclick = () => { const ob = L.filter(o => picked.has(o.id));
      spDl(spDoc(`${subj} ${grade} ${term}`, `<p class="meta">${PL_E(S.name)} · Mid-term plan</p><h1>${PL_E(subj)} · ${PL_E(grade)} · ${PL_E(term)}</h1><p><b>${PL_E(D.title || '')}</b></p>
        ${D.overview ? `<h2>Big picture</h2><p>${PL_E(D.overview).replace(/\n/g, '<br>')}</p>` : ''}<h2>Learning objectives</h2>${ob.length ? `<ul>${ob.map(o => `<li>${PL_E(o.text)}</li>`).join('')}</ul>` : '<p>–</p>'}
        <h2>Week by week</h2><table><tr><th>Week</th><th>Focus / content</th><th>Key activities</th><th>Assessment</th></tr>${D.weeks.map((w, i) => `<tr><td>${i + 1}</td><td>${PL_E(w.focus || '').replace(/\n/g, '<br>')}</td><td>${PL_E(w.activities || '').replace(/\n/g, '<br>')}</td><td>${PL_E(w.assessment || '').replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>
        ${F.slice(1).map(([k, l]) => D[k] ? `<h2>${l.replace(/^\S+\s/, '')}</h2><p>${PL_E(D[k]).replace(/\n/g, '<br>')}</p>` : '').join('')}`), `${subj} ${grade} ${term} mid-term plan`); };
    box.scrollIntoView({ block: 'start' });
  }

  const q = new URLSearchParams(location.search).get('plan'), qw = new URLSearchParams(location.search).get('week');
  const qm = new URLSearchParams(location.search).get('mode');
  if (qm === 'subject') subjectPlans(new URLSearchParams(location.search).get('subject')); else if (qw) openWeek(Number(qw)); else if (q) openPlan(Number(q)); else if (qm === 'weeks' || (!qm && sessionStorage.getItem('tn_pl_mode') === 'weeks')) weeks(); else list();
}
