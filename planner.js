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
  const LEAD = ['principal', 'vice_principal', 'assistant_principal', 'coordinator', 'head_of_department'];
  const isLeader = LEAD.includes(S.my_role) || profile.role === 'admin';
  const canCustomise = ['principal', 'vice_principal', 'assistant_principal', 'coordinator'].includes(S.my_role) || profile.role === 'admin';
  const coversGrade = g => isLeader && (!(S.scope_grades || []).length || S.scope_grades.includes(g));
  const { data: srow } = await db.from('schools').select('planner_sections, curriculum_map').eq('id', S.id).maybeSingle();
  let custom = (srow && srow.planner_sections) || {};
  const subjects = Object.keys((srow && srow.curriculum_map) || { English: 1, Maths: 1, Science: 1 }).filter(k => ((srow && srow.curriculum_map) || {})[k] !== 'none');
  const sections = tpl => PL_TEMPLATES[tpl].sections.map(sec => Object.assign({}, sec, { label: ((custom[tpl] || {})[sec.key] || {}).label || sec.label, hidden: !!((custom[tpl] || {})[sec.key] || {}).hidden }));
  let gradeFilter = sessionStorage.getItem('tn_pl_grade') || '';
  // two modes: unit plans and weekly plans
  box.innerHTML = '<div class="tabs sc-tabs pl-mode" role="tablist"><button role="tab" data-pm="units">🗂️ Unit plans</button><button role="tab" data-pm="weeks">📅 Weekly plans</button></div><div id="pl-main"></div>';
  box = document.getElementById('pl-main');
  const setMode = m => { document.querySelectorAll('[data-pm]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pm === m))); sessionStorage.setItem('tn_pl_mode', m); };
  document.querySelector('.pl-mode').onclick = e => { const b = e.target.closest('[data-pm]'); if (!b) return; history.replaceState(null, '', 'planner.html'); if (b.dataset.pm === 'weeks') weeks(); else list(); };

  // ----- the list of units
  async function list() {
    setMode('units');
    box.innerHTML = '<p class="empty">Loading…</p>';
    const { data, error } = await db.from('unit_plans').select('id, template, grade, subject, title, term, starts_on, ends_on, status, updated_at, edits, created_by').eq('school_id', S.id).order('starts_on', { ascending: true, nullsFirst: false });
    if (error) { box.innerHTML = `<p class="empty">${PL_E(/unit_plans/.test(error.message || '') ? 'Run database update 63 to use the unit planner.' : friendly(error))}</p>`; return; }
    const L = (data || []).filter(p => !gradeFilter || p.grade === gradeFilter);
    const grades = (S.grades || []).filter(g => !gradeFilter || g === gradeFilter);
    const lastBy = p => { const e = Object.values(p.edits || {}).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]; return e ? `Last edited by ${e.by} · ${plWhen(e.at)}` : 'Not started'; };
    box.innerHTML = `<div class="page-head"><h1 class="title">📘 Unit planner</h1><div class="pl-head-acts">${canCustomise ? '<button type="button" class="link-btn" id="pl-custom">⚙️ Customise the template</button>' : ''}<button type="button" class="btn btn-red" id="pl-new">➕ New unit</button></div></div>
      <p class="hint">Plan units together as a team. Everyone in your grade team can edit the same plan, and it saves as you type.</p>
      <div class="feed-filter pl-grades"><button type="button" class="chip ${gradeFilter ? '' : 'on'}" data-gf="">All grades</button>${(S.grades || []).map(g => `<button type="button" class="chip ${gradeFilter === g ? 'on' : ''}" data-gf="${PL_E(g)}">${PL_E(g)}</button>`).join('')}</div>
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
        <label>Grade <select name="grade">${(S.grades || []).map(g => `<option ${g === gradeFilter ? 'selected' : ''}>${PL_E(g)}</option>`).join('')}</select></label></div>
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
  let wk = sessionStorage.getItem('tn_pl_week') || mondayOf(new Date()), CLS = null, onlyMine = !isLeader;
  async function weeks() {
    setMode('weeks'); box.innerHTML = '<p class="empty">Loading…</p>';
    if (!CLS) { const { data, error } = await db.rpc('planning_classes', { sid: S.id }); if (error) { box.innerHTML = `<p class="empty">${PL_E(/planning_classes|function/.test(error.message || '') ? 'Run database update 68 to use weekly plans.' : friendly(error))}</p>`; return; } CLS = data || []; }
    const { data: W } = await db.from('weekly_plans').select('id, group_id, stage, status, edits, feedback').eq('school_id', S.id).eq('week_start', wk);
    const L = CLS.filter(c => !onlyMine || c.mine), byG = id => (W || []).find(p => p.group_id === id);
    const lastBy = p => { const e = Object.values((p && p.edits) || {}).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0]; return e ? `${e.by} · ${plWhen(e.at)}` : ''; };
    const done = L.filter(c => byG(c.id)).length;
    box.innerHTML = `<div class="page-head"><h1 class="title">📅 Weekly plans</h1></div>
      <div class="wk-bar"><button type="button" class="pill pill-soft" data-wk="-7" aria-label="Previous week">‹</button><b>Week of ${wkLabel(wk)}</b><button type="button" class="pill pill-soft" data-wk="7" aria-label="Next week">›</button>
        ${wk !== mondayOf(new Date()) ? '<button type="button" class="link-btn" data-wk="0">This week</button>' : ''}
        ${isLeader ? `<label class="remember"><input type="checkbox" id="wk-mine" ${onlyMine ? 'checked' : ''}> Only my classes</label>` : ''}<span class="meta">${done} of ${L.length} plans started</span></div>
      ${L.length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Class</th><th>Teacher</th><th>Inquiry stage</th><th>Status</th><th>Last edited</th><th></th></tr></thead><tbody>
        ${L.map(c => { const p = byG(c.id), st = p ? PL_STATUS[p.status] || PL_STATUS.draft : null; return `<tr><td><b>${PL_E(c.name)}</b></td><td>${PL_E(c.teacher || '')}</td><td>${p && p.stage ? `<span class="wk-stage">${PL_E(p.stage)}</span>` : '–'}</td>
          <td>${st ? `<span class="rc-st ${st[0]}">${st[1]}</span>` : '<span class="meta">Not started</span>'}</td><td class="meta">${PL_E(lastBy(p))}</td>
          <td>${p ? `<button type="button" class="pill pill-soft" data-wp="${p.id}">Open</button>` : c.mine || isLeader ? `<button type="button" class="pill pill-soft" data-new="${c.id}">➕ Start plan</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`
        : '<div class="empty-box"><p>You don’t have any classes to plan for yet.</p></div>'}`;
    box.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => { const n = Number(b.dataset.wk); wk = n ? addDays(wk, n) : mondayOf(new Date()); sessionStorage.setItem('tn_pl_week', wk); weeks(); });
    const m = document.getElementById('wk-mine'); if (m) m.onchange = () => { onlyMine = m.checked; weeks(); };
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
    const canEdit = !!CLS.find(c => c.id === P.group_id), canReview = coversGrade(C.grade), ro = canEdit ? '' : 'disabled';
    const { data: units } = await db.from('unit_plans').select('id, title').eq('school_id', S.id).eq('grade', C.grade).order('starts_on', { ascending: true });
    const picked = new Set(P.objective_ids || []), objs = {}, openPick = new Set(), openLes = new Set();
    const noBank = sj => !sj || sj === 'Unit of inquiry (PYP)' || sj === 'Other';
    const loadObjs = async sj => { if (noBank(sj)) return []; if (objs[sj]) return objs[sj]; const { data } = await db.rpc('planner_objectives', { sid: S.id, sgrade: C.grade, ssubject: sj }); return (objs[sj] = data || []); };
    const st = PL_STATUS[P.status] || PL_STATUS.draft, STG = stages().slice(0, 6);
    const by = k => { const e = (P.edits || {})[k]; return `<small class="pl-by" data-by="${k}">${e ? 'Edited by ' + PL_E(e.by) + ' · ' + plWhen(e.at) : ''}</small>`; };
    const chips = (list, on, attr) => `<div class="pl-chips">${list.concat((on || []).filter(x => !list.includes(x))).map(o => `<label class="sc-chip"><input type="checkbox" ${attr} value="${PL_E(o)}" ${(on || []).includes(o) ? 'checked' : ''} ${ro}><span>${PL_E(o)}</span></label>`).join('')}</div>`;
    const dayName = dk => (DAYS.find(d => d[0] === dk) || ['', ''])[1];
    const glance = () => `<div class="in-scroll"><table class="wk-glance"><thead><tr>${DAYS.map(([, dn], i) => `<th>${dn}<br><small>${new Date(addDays(P.week_start, i) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></th>`).join('')}</tr></thead>
      <tbody><tr>${DAYS.map(([dk]) => `<td>${D.subjects.flatMap(sb => (sb.lessons || []).filter(l => l.day === dk).map(l => `<div class="wk-g"><b>${PL_E(sb.subject || 'Subject')}</b>${l.focus ? `<span>${PL_E(l.focus)}</span>` : ''}</div>`)).join('') || '<span class="meta">–</span>'}</td>`).join('')}</tr></tbody></table></div>`;
    const lessonHtml = (si, li, l) => { const filled = (l.stages || []).filter(x => x.a || x.t).length, open = openLes.has(si + ':' + li);
      return `<div class="wk-les ${open ? 'open' : ''}" data-li="${li}"><div class="wk-les-top">
        <select data-lf="day" ${ro} aria-label="Day"><option value="">Day…</option>${DAYS.map(([dk, dn]) => `<option value="${dk}" ${l.day === dk ? 'selected' : ''}>${dn}</option>`).join('')}</select>
        <input type="text" data-lf="focus" maxlength="200" value="${PL_E(l.focus || '')}" placeholder="Lesson focus" ${ro}>
        <button type="button" class="pill pill-soft wk-tog" data-tog-les>${open ? '▴' : '▾'} Inquiry stages · ${filled}/6</button>${canEdit ? '<button type="button" class="link-btn danger" data-rm-les aria-label="Remove lesson">✕</button>' : ''}</div>
        ${open ? `<div class="wk-stages6">${STG.map((nm, k) => `<div class="wk-s6"><div class="wk-s6-h"><span class="wk-s6-n">${k + 1}</span><b>${PL_E(nm)}</b></div>
          <input type="text" list="dl-stage${k}" data-lf="a" data-st="${k}" value="${PL_E((l.stages[k] || {}).a || '')}" placeholder="Choose or type an activity…" ${ro}>
          <textarea data-lf="t" data-st="${k}" rows="2" maxlength="1500" placeholder="Details (optional)" ${ro}>${PL_E((l.stages[k] || {}).t || '')}</textarea></div>`).join('')}</div>` : ''}</div>`; };
    const subjectHtml = (sb, si) => { const nObj = (objs[sb.subject] || []).filter(o => picked.has(o.id)).length;
      return `<section class="panel wk-subj" data-si="${si}"><div class="wk-subj-top"><select data-sf="subject" class="wk-subj-sel" ${ro} aria-label="Subject"><option value="">Choose a subject…</option>${WK_SUBJECTS().map(x => `<option ${sb.subject === x ? 'selected' : ''}>${PL_E(x)}</option>`).join('')}</select>
          <span class="meta">${(sb.lessons || []).length} lesson${(sb.lessons || []).length === 1 ? '' : 's'} this week</span>${canEdit ? '<button type="button" class="link-btn danger" data-rm-subj>Remove subject</button>' : ''}</div>
        <div class="wk-sub-grid"><div><h4>🎯 Learning objectives</h4>${noBank(sb.subject) ? '' : `<button type="button" class="pill pill-soft" data-tog-obj>${openPick.has(si) ? '▴ Hide' : '▾ Choose from the curriculum'}${nObj ? ' · ' + nObj + ' chosen' : ''}</button><div class="wk-objpick" data-objbox></div>`}
            <textarea data-sf="obj_note" rows="2" maxlength="1500" placeholder="Objectives in your own words (optional)" ${ro}>${PL_E(sb.obj_note || '')}</textarea></div>
          <div><h4>✅ Success criteria</h4><textarea data-sf="success" rows="4" maxlength="2000" placeholder="One per line, e.g. I can explain my thinking using a diagram" ${ro}>${PL_E(sb.success || '')}</textarea></div></div>
        <h4>📆 Lessons this week</h4><div class="wk-lesl">${(sb.lessons || []).map((l, li) => lessonHtml(si, li, l)).join('') || '<p class="meta">No lessons yet.</p>'}</div>${canEdit ? '<button type="button" class="pill pill-soft" data-add-les>+ Add lesson</button>' : ''}
        <div class="wk-sub-grid wk-sub-4">${[['support', '🧩 Support'], ['challenge', '🚀 Challenge'], ['assessment', '📝 Assessment'], ['resources', '📚 Resources']].map(([k, l]) => `<div><h4>${l}</h4>${chips(wkList(k), sb[k], `data-chip="${k}"`)}
          <input type="text" data-sf="${k}_note" maxlength="500" value="${PL_E(sb[k + '_note'] || '')}" placeholder="Anything else? (optional)" ${ro}></div>`).join('')}</div></section>`; };
    const empty = !D.subjects.length && !P.stage;
    box.innerHTML = `<div class="pl-top"><button type="button" class="link-btn" id="wk-back">‹ All classes</button>
        <div class="pl-top-acts">${canEdit && empty ? '<button type="button" class="pill pill-soft" id="wk-copy">📋 Copy last week’s plan</button>' : ''}<button type="button" class="pill pill-soft" id="wk-word">⬇ Word</button><button type="button" class="pill pill-soft" id="wk-print">🖨️ Print</button><button type="button" class="link-btn" id="wk-refresh">🔄 Refresh</button></div></div>
      ${[0, 1, 2, 3, 4, 5].map(k => `<datalist id="dl-stage${k}">${wkList('stage' + k).map(x => `<option value="${PL_E(x)}">`).join('')}</datalist>`).join('')}
      <section class="panel pl-meta"><span class="pl-tpl">📅 Weekly plan</span><h2 class="wk-title">${PL_E(C.name)} · Week of ${wkLabel(P.week_start)}</h2>
        <div class="pl-meta-row"><label>Unit <select id="wk-unit" ${ro}><option value="">–</option>${(units || []).map(u => `<option value="${u.id}" ${P.unit_plan_id === u.id ? 'selected' : ''}>${PL_E(u.title)}</option>`).join('')}</select></label><span class="rc-st ${st[0]}">${st[1]}</span></div>
        <div class="wk-stages" role="radiogroup" aria-label="Main inquiry focus this week"><span class="meta">🔄 Main inquiry focus this week (optional):</span>${STG.map(x => `<button type="button" class="wk-st ${P.stage === x ? 'on' : ''}" data-stage="${PL_E(x)}" ${ro}>${PL_E(x)}</button>`).join('')}</div>
        <div class="wk-sub-grid"><div><h4>🧠 ATL skills this week</h4>${chips(wkList('atl'), D.atl, 'data-wchip="atl"')}</div><div><h4>🌟 Learner profile focus</h4>${chips(wkList('profile'), D.profile, 'data-wchip="profile"')}</div></div>
        ${P.feedback ? `<p class="note">${P.status === 'returned' ? '↩' : '💬'} <b>Feedback from your school leader:</b> ${PL_E(P.feedback)}</p>` : ''}
        <div class="ca-bar pl-flow">${canEdit && (P.status === 'draft' || P.status === 'returned') ? '<button type="button" class="btn btn-red" data-flow="submit">📤 Submit for review</button>' : ''}
          ${P.status === 'review' && canReview ? '<button type="button" class="btn btn-white outline" data-flow="return">↩ Return with feedback</button><button type="button" class="btn btn-red" data-flow="approve">✅ Approve</button>' : ''}
          ${P.status === 'approved' && canReview ? '<button type="button" class="btn btn-white outline" data-flow="return">💬 Add feedback</button>' : ''}
          ${canEdit && (P.status === 'approved' || P.status === 'review') ? '<button type="button" class="link-btn" data-flow="reopen">✏️ Reopen for editing</button>' : ''}
          ${canEdit ? '<button type="button" class="link-btn danger" id="wk-del">Delete plan</button>' : ''}</div></section>
      <section class="panel"><h3>🗓️ Week at a glance</h3><div id="wk-glance">${glance()}</div></section>
      <div id="wk-subjects"></div>
      <div class="wk-add-subj">${canEdit ? `<select id="wk-new-subj"><option value="">➕ Add a subject…</option>${WK_SUBJECTS().map(x => `<option>${PL_E(x)}</option>`).join('')}</select>` : ''}${by('subjects')}</div>
      <section class="panel pl-sec"><h3>💭 Reflection (after the week)</h3><textarea data-f="reflection" rows="3" maxlength="4000" placeholder="What worked well? What will you change next week?" ${canEdit ? '' : 'readonly'}>${PL_E(D.reflection || '')}</textarea>${by('reflection')}</section>`;
    const subBox = document.getElementById('wk-subjects');
    const drawPicker = async si => {
      const sec = subBox.querySelector(`.wk-subj[data-si="${si}"] [data-objbox]`); if (!sec) return;
      sec.innerHTML = '<p class="meta">Loading…</p>';
      const L = await loadObjs(D.subjects[si].subject), topics = [...new Set(L.map(o => o.topic))];
      sec.innerHTML = L.length ? topics.map(tp => `<details class="pl-topic" ${L.filter(o => o.topic === tp).some(o => picked.has(o.id)) ? 'open' : ''}><summary>${PL_E(tp)} <small class="meta">${L.filter(o => o.topic === tp && picked.has(o.id)).length}/${L.filter(o => o.topic === tp).length}</small></summary>
        ${L.filter(o => o.topic === tp).map(o => `<label class="pl-obj"><input type="checkbox" data-obj value="${o.id}" ${picked.has(o.id) ? 'checked' : ''} ${ro}><span>${PL_E(o.text)}</span></label>`).join('')}</details>`).join('') : `<p class="meta">No ${PL_E(D.subjects[si].subject)} objectives for ${PL_E(C.grade)} in your school’s curriculum yet.</p>`;
    };
    const drawSubjects = () => { subBox.innerHTML = D.subjects.map(subjectHtml).join('') || '<div class="empty-box"><p>Add the subjects you’re teaching this week (➕ Add a subject below), or copy last week’s plan.</p></div>'; openPick.forEach(si => drawPicker(si)); };
    // saving: all subjects are saved together, a moment after each change
    const saved = (k, t) => { const b = box.querySelector(`[data-by="${k}"]`); if (b) b.textContent = t; };
    const save = async (k, v) => { saved(k, 'Saving…'); const { error } = await db.rpc('set_weekly_field', { pid, fkey: k, fval: v }); if (error) { saved(k, '⚠️ Not saved'); return say(friendly(error)); } saved(k, '✓ Saved just now by you'); };
    let sTimer; const saveSubjects = () => { clearTimeout(sTimer); saved('subjects', 'Saving…'); sTimer = setTimeout(() => { save('subjects', D.subjects); document.getElementById('wk-glance').innerHTML = glance(); }, 700); };
    const upd = async row => { const { error } = await db.from('weekly_plans').update(row).eq('id', pid); if (error) say(friendly(error)); };
    drawSubjects();
    const field = e => { const el = e.target, sec = el.closest('[data-si]'); if (!sec || !canEdit) return; const sb = D.subjects[Number(sec.dataset.si)];
      if (el.dataset.sf) { sb[el.dataset.sf] = el.value; if (el.dataset.sf === 'subject' && e.type === 'change') drawSubjects(); saveSubjects(); return; }
      if (el.dataset.chip) { const k = el.dataset.chip; sb[k] = [...sec.querySelectorAll(`[data-chip="${k}"]:checked`)].map(x => x.value); saveSubjects(); return; }
      if (el.hasAttribute('data-obj')) { if (e.type !== 'change') return; const id = Number(el.value); el.checked ? picked.add(id) : picked.delete(id); upd({ objective_ids: [...picked] }); return; }
      const les = el.closest('[data-li]'); if (les && el.dataset.lf) { const l = sb.lessons[Number(les.dataset.li)];
        if (el.dataset.st !== undefined) l.stages[Number(el.dataset.st)][el.dataset.lf] = el.value; else l[el.dataset.lf] = el.value;
        if (el.dataset.lf === 'a' || el.dataset.lf === 't') { const tg = les.querySelector('.wk-tog'); if (tg) tg.textContent = `▴ Inquiry stages · ${l.stages.filter(x => x.a || x.t).length}/6`; }
        saveSubjects(); } };
    subBox.addEventListener('change', field);
    subBox.addEventListener('input', e => { if (e.target.matches('textarea, input[type=text]')) field(e); });
    subBox.addEventListener('click', e => {
      const sec = e.target.closest('[data-si]'); if (!sec) return; const si = Number(sec.dataset.si), sb = D.subjects[si];
      if (e.target.closest('[data-tog-obj]')) { openPick.has(si) ? openPick.delete(si) : openPick.add(si); drawSubjects(); return; }
      if (e.target.closest('[data-rm-subj]')) { if (!confirm(`Remove ${sb.subject || 'this subject'} from this week’s plan?`)) return; D.subjects.splice(si, 1); openPick.clear(); openLes.clear(); drawSubjects(); saveSubjects(); return; }
      if (e.target.closest('[data-add-les]')) { const used = (sb.lessons || []).map(l => l.day), next = (DAYS.find(([dk]) => !used.includes(dk)) || DAYS[0])[0]; sb.lessons.push(blankLesson(next)); openLes.add(si + ':' + (sb.lessons.length - 1)); drawSubjects(); saveSubjects(); return; }
      const les = e.target.closest('[data-li]'); if (!les) return; const li = Number(les.dataset.li), key = si + ':' + li;
      if (e.target.closest('[data-tog-les]')) { openLes.has(key) ? openLes.delete(key) : openLes.add(key); drawSubjects(); return; }
      if (e.target.closest('[data-rm-les]')) { if (!confirm('Remove this lesson?')) return; sb.lessons.splice(li, 1); openLes.clear(); drawSubjects(); saveSubjects(); }
    });
    const ns = document.getElementById('wk-new-subj');
    if (ns) ns.onchange = () => { if (!ns.value) return; D.subjects.push(blankSubject(ns.value)); openLes.add((D.subjects.length - 1) + ':0'); ns.value = ''; drawSubjects(); saveSubjects();
      const last = subBox.lastElementChild; if (last) last.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    box.querySelectorAll('[data-wchip]').forEach(w => w.onchange = () => { const k = w.dataset.wchip; D[k] = [...box.querySelectorAll(`[data-wchip="${k}"]:checked`)].map(x => x.value); save(k, D[k]); });
    const rf = box.querySelector('textarea[data-f="reflection"]'); let lastR = rf.value; rf.onblur = () => { if (!canEdit || rf.value === lastR) return; lastR = rf.value; save('reflection', rf.value); };
    document.getElementById('wk-unit').onchange = e => upd({ unit_plan_id: e.target.value ? Number(e.target.value) : null });
    box.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { const v = P.stage === b.dataset.stage ? null : b.dataset.stage; P.stage = v; box.querySelectorAll('[data-stage]').forEach(x => x.classList.toggle('on', x.dataset.stage === v)); upd({ stage: v }); });
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
    document.getElementById('wk-back').onclick = () => { history.replaceState(null, '', 'planner.html'); wk = P.week_start; weeks(); };
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
            ${(sb.lessons || []).map(l => `<h3>${E(dayName(l.day) || 'Lesson')}${l.focus ? ': ' + E(l.focus) : ''}</h3><table><tr><th style="width:24%">Inquiry stage</th><th style="width:30%">Activity</th><th>Details</th></tr>
              ${STG.map((nm, k) => `<tr><td><b>${k + 1}. ${E(nm)}</b></td><td>${E((l.stages[k] || {}).a || '')}</td><td>${E((l.stages[k] || {}).t || '').replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`).join('')}
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

  const q = new URLSearchParams(location.search).get('plan'), qw = new URLSearchParams(location.search).get('week');
  if (qw) openWeek(Number(qw)); else if (q) openPlan(Number(q)); else if (sessionStorage.getItem('tn_pl_mode') === 'weeks') weeks(); else list();
}
