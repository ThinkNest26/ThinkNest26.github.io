// ===== Think Nest for Schools: lesson observations =====
const OB_E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const OB_MOE = {
  preset: 'moe',
  scale: [{ n: 1, label: 'Very weak' }, { n: 2, label: 'Weak' }, { n: 3, label: 'Acceptable' }, { n: 4, label: 'Good' }, { n: 5, label: 'Very good' }, { n: 6, label: 'Outstanding' }],
  criteria: [
    { key: 'ls1', group: '1.3 Learning skills', code: '1.3.1', label: 'Engagement in and responsibility for learning', desc: 'Students are motivated, take responsibility for their learning and know how to improve.' },
    { key: 'ls2', group: '1.3 Learning skills', code: '1.3.2', label: 'Interactions, collaboration and communication', desc: 'Students work well together, discuss and communicate their learning clearly.' },
    { key: 'ls3', group: '1.3 Learning skills', code: '1.3.3', label: 'Application of learning to the real world and making connections', desc: 'Students connect learning across subjects and apply it to real-life situations.' },
    { key: 'ls4', group: '1.3 Learning skills', code: '1.3.4', label: 'Innovation, enterprise, inquiry, research, critical thinking and use of learning technologies', desc: 'Students inquire, research, think critically, solve problems and use technology to learn.' },
    { key: 't1', group: '3.1 Teaching for effective learning', code: '3.1.1', label: 'Teachers’ knowledge of their subjects and how students learn them', desc: 'Secure subject knowledge and understanding of how students learn it.' },
    { key: 't2', group: '3.1 Teaching for effective learning', code: '3.1.2', label: 'Lesson planning, the learning environment, and the use of time and resources', desc: 'Well-planned lessons, a stimulating environment, good use of time and resources.' },
    { key: 't3', group: '3.1 Teaching for effective learning', code: '3.1.3', label: 'Teacher–student interactions, including questioning and dialogue', desc: 'Questions and dialogue deepen thinking and check understanding.' },
    { key: 't4', group: '3.1 Teaching for effective learning', code: '3.1.4', label: 'Teaching strategies to meet the needs of individuals and groups', desc: 'Support and challenge for all groups, including students of determination, G&T and language learners.' },
    { key: 't5', group: '3.1 Teaching for effective learning', code: '3.1.5', label: 'Teaching to develop critical thinking, problem-solving, innovation and independent learning', desc: 'Students are given chances to think critically, solve problems, innovate and learn independently.' },
    { key: 'a4', group: '3.2 Assessment', code: '3.2.4', label: 'Use of assessment information to influence teaching and students’ progress', desc: 'The teacher checks learning during the lesson and adapts teaching to it.' },
    { key: 'a5', group: '3.2 Assessment', code: '3.2.5', label: 'Teachers’ knowledge of students’ strengths and weaknesses, feedback, and self- and peer-assessment', desc: 'Useful feedback; students assess their own and each other’s work and know their next steps.' }]
};
const OB_GENERAL = {
  preset: 'general',
  scale: [{ n: 1, label: 'Needs support' }, { n: 2, label: 'Developing' }, { n: 3, label: 'Effective' }, { n: 4, label: 'Highly effective' }],
  criteria: [
    { key: 'planning', label: 'Planning and subject knowledge', desc: 'Clear objectives, well-sequenced activities, secure subject knowledge.' },
    { key: 'environment', label: 'Learning environment and relationships', desc: 'Positive, respectful and well-organised; routines support learning.' },
    { key: 'questioning', label: 'Questioning and discussion', desc: 'Questions deepen thinking; students explain and discuss their ideas.' },
    { key: 'needs', label: 'Meeting the needs of all learners', desc: 'Support and challenge for different groups, including SEND, G&T and language learners.' },
    { key: 'assessment', label: 'Assessment for learning and feedback', desc: 'Checks understanding during the lesson and adapts; useful feedback.' },
    { key: 'engagement', label: 'Student engagement and learning skills', desc: 'Students are motivated, independent, collaborative and reflective.' }]
};
const OB_KIND = { formal: '📋 Formal observation', walk: '🚶 Learning walk', dropin: '👋 Drop-in', peer: '🤝 Peer observation' };
const obDate = d => d ? new Date(d + (String(d).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

async function startObserve() {
  const { user, profile } = await initTeacher();
  const box = document.getElementById('observe');
  const { data: scs } = await db.rpc('my_schools');
  const S = (scs || []).find(s => !['student', 'parent'].includes(s.my_role));
  if (!S) { box.innerHTML = '<div class="empty-box"><p>Lesson observations are part of Think Nest for Schools, for teachers and leaders of a school.</p></div>'; return; }
  document.documentElement.style.setProperty('--school', S.color_primary || '#3E4B94'); document.documentElement.style.setProperty('--school2', S.color_accent || '#F27A6F');
  const isLead = ['principal', 'vice_principal', 'assistant_principal', 'coordinator', 'head_of_department'].includes(S.my_role) || profile.role === 'admin';
  const canRubric = ['principal', 'vice_principal', 'assistant_principal', 'coordinator'].includes(S.my_role) || profile.role === 'admin';
  const { data: srow } = await db.from('schools').select('obs_rubric').eq('id', S.id).maybeSingle();
  let R = Object.assign({}, OB_MOE, (srow && srow.obs_rubric) || {});
  const { data: staffRows } = await db.rpc('obs_staff', { sid: S.id });
  const STAFF = staffRows || [], nameOf = id => (STAFF.find(p => p.user_id === id) || {}).full_name || '–';
  const cTitle = c => (c.code ? c.code + ' ' : '') + c.label;
  const grouped = (list, fn) => { let last = null; return list.map(c => { const h = c.group && c.group !== last ? `<h3 class="ob-group">${OB_E(c.group)}</h3>` : ''; last = c.group || last; return h + fn(c); }).join(''); };
  const SCALE_DESC = () => R.scale.slice().sort((a, b) => b.n - a.n);
  const lvLabel = n => n ? ((R.scale.find(x => x.n === Number(n)) || {}).label || n) : 'Not seen';
  const lvClass = n => { n = Number(n); if (!n) return 'none'; const r = n / R.scale.length; return r >= 0.99 ? 'top' : r >= 0.8 ? 'hi' : r >= 0.65 ? 'ok' : r >= 0.45 ? 'mid' : r > 0.2 ? 'lo' : 'vlo'; };
  const tabs = isLead ? [['new', '➕ New observation'], ['list', '📋 Observations'], ['trends', '📈 Trends'], ['mine', '📥 My feedback']].concat(canRubric ? [['rubric', '⚙️ Rubric']] : [])
    : [['mine', '📥 My observations']];
  box.innerHTML = `<div class="page-head"><h1 class="title">👀 Lesson observations</h1></div>
    <p class="hint">${isLead ? 'Observe lessons with your school’s rubric, share feedback with teachers, and see trends across the school.' : 'Your lesson observation reports appear here once your observer shares them. Read the feedback and reply with your comments.'}</p>
    <div class="tabs sc-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="false" data-ot="${k}">${l}</button>`).join('')}</div><section id="ob-pane"></section>`;
  const pane = () => document.getElementById('ob-pane');
  const show = (k, arg) => { document.querySelectorAll('[data-ot]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.ot === k))); ({ new: form, list, trends, mine, rubric })[k](arg); };
  document.querySelector('.sc-tabs').addEventListener('click', e => { const b = e.target.closest('[data-ot]'); if (b) show(b.dataset.ot); });

  // ----- the observation form (new or editing a draft)
  function form(o) {
    o = o || {}; const rt = o.ratings || {}, nt = o.notes || {};
    pane().innerHTML = `<form class="panel ob-form" id="ob-form"><h2>${o.id ? '✏️ Edit observation' : isLead ? '➕ New observation' : '🤝 Peer observation'}</h2>
      <div class="ob-grid"><label>Teacher observed <select name="teacher" required><option value="">Choose…</option>${STAFF.filter(p => p.user_id !== user.id).map(p => `<option value="${p.user_id}" ${o.teacher_id === p.user_id ? 'selected' : ''}>${OB_E(p.full_name)}</option>`).join('')}</select></label>
        <label>Type <select name="kind">${Object.entries(OB_KIND).filter(([k]) => isLead || k === 'peer').map(([k, l]) => `<option value="${k}" ${(o.kind || (isLead ? 'formal' : 'peer')) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Date <input type="date" name="date" value="${o.observed_on || new Date().toISOString().slice(0, 10)}"></label>
        <label>Class <input type="text" name="cls" maxlength="60" value="${OB_E(o.class_name || '')}" placeholder="e.g. Grade 4 B"></label>
        <label>Grade <select name="grade"><option value="">–</option>${(S.grades || []).map(g => `<option ${o.grade === g ? 'selected' : ''}>${OB_E(g)}</option>`).join('')}</select></label>
        <label>Subject <input type="text" name="subject" maxlength="60" value="${OB_E(o.subject || '')}" placeholder="e.g. Maths"></label></div>
      <label>Focus of the observation (optional) <input type="text" name="focus" maxlength="200" value="${OB_E(o.focus || '')}" placeholder="e.g. Questioning, or support for English language learners"></label>
      <div class="ob-crits">${grouped(R.criteria, c => `<section class="ob-crit" data-c="${OB_E(c.key)}"><div><b>${OB_E(cTitle(c))}</b>${c.desc ? `<small class="meta">${OB_E(c.desc)}</small>` : ''}</div>
        <div class="ob-levels" role="radiogroup" aria-label="${OB_E(c.label)}">${SCALE_DESC().map(l => `<button type="button" class="ob-lv lv-${lvClass(l.n)} ${Number(rt[c.key]) === l.n ? 'on' : ''}" data-lv="${l.n}" aria-pressed="${Number(rt[c.key]) === l.n}"><b>${l.n}</b><span>${OB_E(l.label)}</span></button>`).join('')}
          <button type="button" class="ob-lv lv-none ${rt[c.key] === 0 ? 'on' : ''}" data-lv="0" aria-pressed="${rt[c.key] === 0}"><b>–</b><span>Not seen</span></button></div>
        <textarea rows="2" maxlength="2000" placeholder="Evidence: what did you see and hear?">${OB_E(nt[c.key] || '')}</textarea></section>`)}</div>
      <label>💪 Strengths <textarea name="strengths" rows="3" maxlength="3000">${OB_E(o.strengths || '')}</textarea></label>
      <label>🎯 Next steps <textarea name="next" rows="3" maxlength="3000">${OB_E(o.next_steps || '')}</textarea></label>
      <div class="ca-bar"><span class="meta">The teacher sees it only after you click Share.</span><span><button type="button" class="btn btn-white outline" data-save="draft">💾 Save draft</button> <button type="button" class="btn btn-red" data-save="share">📤 Save and share with the teacher</button></span></div></form>`;
    const f = document.getElementById('ob-form');
    f.querySelectorAll('.ob-levels').forEach(g => g.onclick = e => { const b = e.target.closest('[data-lv]'); if (!b) return; g.querySelectorAll('[data-lv]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); });
    f.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
      if (!f.teacher.value) return say('Choose the teacher you observed.');
      const ratings = {}, notes = {};
      f.querySelectorAll('.ob-crit').forEach(sec => { const on = sec.querySelector('.ob-lv.on'); if (on) ratings[sec.dataset.c] = Number(on.dataset.lv); const t = sec.querySelector('textarea').value.trim(); if (t) notes[sec.dataset.c] = t; });
      const row = { teacher_id: f.teacher.value, kind: f.kind.value, observed_on: f.date.value || new Date().toISOString().slice(0, 10), class_name: f.cls.value.trim() || null, grade: f.grade.value || null,
        subject: f.subject.value.trim() || null, focus: f.focus.value.trim() || null, ratings, notes, strengths: f.strengths.value.trim() || null, next_steps: f.next.value.trim() || null };
      if (b.dataset.save === 'share' && !Object.keys(ratings).length && !row.strengths && !row.next_steps) return say('Add at least one rating, a strength or a next step before sharing.');
      let id = o.id, error;
      if (id) ({ error } = await db.from('observations').update(row).eq('id', id));
      else { const r = await db.from('observations').insert(Object.assign(row, { school_id: S.id, observer_id: user.id })).select('id').single(); error = r.error; id = r.data && r.data.id; }
      if (error) return say(friendly(error));
      if (b.dataset.save === 'share') { if (!confirm(`Share this feedback with ${nameOf(row.teacher_id)}? They’ll get a notification.`)) { say('💾 Saved as a draft.'); return view(id); }
        const { error: er } = await db.rpc('share_observation', { oid: id }); if (er) return say(friendly(er)); say('📤 Shared with the teacher.'); }
      else say('💾 Draft saved.');
      view(id);
    });
  }

  // ----- lists
  async function list() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    let q = db.from('observations').select('id, teacher_id, observer_id, kind, observed_on, class_name, status, read_at, reflection').eq('school_id', S.id).order('observed_on', { ascending: false }).limit(300);
    if (!isLead) q = q.eq('observer_id', user.id);
    const { data, error } = await q;
    if (error) { pane().innerHTML = `<p class="empty">${OB_E(/observations/.test(error.message || '') ? 'Run database update 64 to use lesson observations.' : friendly(error))}</p>`; return; }
    const L = (data || []).filter(o => o.teacher_id !== user.id || o.observer_id === user.id);
    let who = '', kind = '';
    const draw = () => {
      const shown = L.filter(o => (!who || o.teacher_id === who) && (!kind || o.kind === kind));
      pane().innerHTML = `<section class="panel"><div class="ob-filters"><label>Teacher <select id="ob-who"><option value="">Everyone</option>${[...new Set(L.map(o => o.teacher_id))].map(id => `<option value="${id}" ${who === id ? 'selected' : ''}>${OB_E(nameOf(id))}</option>`).join('')}</select></label>
          <label>Type <select id="ob-kind"><option value="">All types</option>${Object.entries(OB_KIND).map(([k, l]) => `<option value="${k}" ${kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><span class="meta">${shown.length} observation${shown.length === 1 ? '' : 's'}</span></div>
        ${shown.length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Date</th><th>Teacher</th><th>Type</th><th>Class</th><th>Observer</th><th>Status</th><th></th></tr></thead><tbody>
          ${shown.map(o => `<tr><td>${obDate(o.observed_on)}</td><td><b>${OB_E(nameOf(o.teacher_id))}</b></td><td>${OB_KIND[o.kind] || o.kind}</td><td>${OB_E(o.class_name || '')}</td><td>${OB_E(nameOf(o.observer_id))}</td>
            <td>${o.status === 'draft' ? '<span class="rc-st draft">✏️ Draft</span>' : o.read_at ? `<span class="rc-st ok">✓ Read${o.reflection ? ' · reflected' : ''}</span>` : '<span class="rc-st rev">📤 Shared</span>'}</td>
            <td><button type="button" class="pill pill-soft" data-o="${o.id}">Open</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="meta">No observations yet.</p>'}</section>`;
      document.getElementById('ob-who').onchange = e => { who = e.target.value; draw(); };
      document.getElementById('ob-kind').onchange = e => { kind = e.target.value; draw(); };
      pane().querySelectorAll('[data-o]').forEach(b => b.onclick = () => view(Number(b.dataset.o)));
    };
    draw();
  }
  async function mine() {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const { data, error } = await db.from('observations').select('id, observer_id, kind, observed_on, class_name, read_at, reflection, next_steps').eq('teacher_id', user.id).eq('status', 'shared').order('observed_on', { ascending: false });
    if (error) { pane().innerHTML = `<p class="empty">${OB_E(/observations/.test(error.message || '') ? 'Run database update 64 to use lesson observations.' : friendly(error))}</p>`; return; }
    const L = data || [];
    pane().innerHTML = L.length ? `<div class="ob-cards">${L.map(o => `<button type="button" class="ob-card ${o.read_at ? '' : 'new'}" data-o="${o.id}"><span class="ob-card-k">${OB_KIND[o.kind] || ''}</span>
        <b>${obDate(o.observed_on)}${o.class_name ? ' · ' + OB_E(o.class_name) : ''}</b><small class="meta">By ${OB_E(nameOf(o.observer_id))}</small>
        ${o.read_at ? `<span class="rc-st ok">✓ Read${o.reflection ? ' · reflected' : ''}</span>` : '<span class="an-new">New</span>'}</button>`).join('')}</div>`
      : '<div class="empty-box"><p>No observation feedback yet. When a colleague shares feedback with you, it appears here. 🌱</p></div>';
    pane().querySelectorAll('[data-o]').forEach(b => b.onclick = () => view(Number(b.dataset.o)));
  }

  // ----- one observation
  async function view(id) {
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const { data: o } = await db.from('observations').select('*').eq('id', id).maybeSingle();
    if (!o) { pane().innerHTML = '<p class="empty">This observation couldn’t be found.</p>'; return; }
    const isMine = o.teacher_id === user.id, isObs = o.observer_id === user.id;
    const crit = R.criteria.filter(c => o.ratings[c.key] !== undefined || (o.notes || {})[c.key]);
    pane().innerHTML = `<section class="panel ob-view"><button type="button" class="link-btn" id="ob-back">‹ Back</button>
      <div class="ob-v-head"><div><span class="ob-card-k">${OB_KIND[o.kind] || ''}</span><h2>${OB_E(nameOf(o.teacher_id))}</h2>
        <p class="meta">${obDate(o.observed_on)}${o.class_name ? ' · ' + OB_E(o.class_name) : ''}${o.subject ? ' · ' + OB_E(o.subject) : ''} · Observed by ${OB_E(nameOf(o.observer_id))}</p>${o.focus ? `<p><b>Focus:</b> ${OB_E(o.focus)}</p>` : ''}</div>
        <div class="ob-v-acts"><button type="button" class="pill pill-soft" id="ob-word">⬇ Word</button>${isObs && o.status === 'draft' ? '<button type="button" class="pill pill-soft" id="ob-edit">✏️ Edit</button><button type="button" class="btn btn-red" id="ob-share">📤 Share</button>' : ''}
          ${isLead ? '<button type="button" class="link-btn danger" id="ob-del">Delete</button>' : ''}</div></div>
      ${o.status === 'draft' ? '<p class="note">✏️ Draft: the teacher can’t see this yet.</p>' : ''}
      <div class="ob-v-crits">${grouped(crit, c => `<div class="ob-v-c"><div><b>${OB_E(cTitle(c))}</b>${(o.notes || {})[c.key] ? `<p>${OB_E(o.notes[c.key]).replace(/\n/g, '<br>')}</p>` : ''}</div>
        <span class="ob-chip lv-${lvClass(o.ratings[c.key])}">${OB_E(lvLabel(o.ratings[c.key]))}</span></div>`) || '<p class="meta">No criteria rated.</p>'}</div>
      ${o.strengths ? `<h3 class="sc-h3">💪 Strengths</h3><p class="ob-text">${OB_E(o.strengths).replace(/\n/g, '<br>')}</p>` : ''}
      ${o.next_steps ? `<h3 class="sc-h3">🎯 Next steps</h3><p class="ob-text">${OB_E(o.next_steps).replace(/\n/g, '<br>')}</p>` : ''}
      <h3 class="sc-h3">💬 Comments</h3>
      ${o.reflection ? `<div class="ob-cm"><b>${OB_E(nameOf(o.teacher_id))}</b> <small class="meta">reflection</small><p>${OB_E(o.reflection).replace(/\n/g, '<br>')}</p></div>` : ''}
      <div id="ob-cms"><p class="meta">Loading…</p></div>
      ${isMine || isObs || isLead ? `<form id="ob-cf" class="ob-cf"><textarea name="t" rows="3" maxlength="2000" placeholder="${isMine ? 'Your comments on this feedback: what you’ll try next, a question, or support you’d like…' : 'Reply to the teacher…'}"></textarea>
        <div class="ca-bar"><span class="meta">${isMine ? (o.read_at ? '✓ You read this on ' + obDate(o.read_at) : '') : (o.status === 'shared' ? (o.read_at ? '✓ Read by the teacher on ' + obDate(o.read_at) : 'Not read yet') : '')}</span>
        <span>${isMine && !o.read_at ? '<button type="button" class="btn btn-white outline" id="ob-read">✓ Mark as read</button> ' : ''}<button class="btn btn-red">💬 Post comment</button></span></div></form>` : ''}</section>`;
    document.getElementById('ob-back').onclick = () => show(isMine ? 'mine' : 'list');
    const ed = document.getElementById('ob-edit'); if (ed) ed.onclick = () => form(o);
    const sh = document.getElementById('ob-share'); if (sh) sh.onclick = async () => { if (!confirm(`Share this feedback with ${nameOf(o.teacher_id)}?`)) return; const { error } = await db.rpc('share_observation', { oid: id }); if (error) return say(friendly(error)); say('📤 Shared.'); view(id); };
    const dl = document.getElementById('ob-del'); if (dl) dl.onclick = async () => { if (!confirm('Delete this observation? This can’t be undone.')) return; const { error } = await db.from('observations').delete().eq('id', id); if (error) return say(friendly(error)); say('Deleted.'); show(isLead ? 'list' : 'mine'); };
    db.from('observation_comments').select('*').eq('observation_id', id).order('created_at').then(({ data: cm, error: ce }) => {
      const el = document.getElementById('ob-cms'); if (!el) return;
      el.innerHTML = ce ? '' : (cm || []).map(c => `<div class="ob-cm ${c.author_id === user.id ? 'me' : ''}"><b>${OB_E(c.author_name || '')}</b> <small class="meta">${new Date(c.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small><p>${OB_E(c.body).replace(/\n/g, '<br>')}</p></div>`).join('') || '<p class="meta">No comments yet.</p>';
    });
    const cf = document.getElementById('ob-cf');
    if (cf) cf.onsubmit = async e => { e.preventDefault(); const t = cf.t.value.trim(); if (!t) return say('Write a comment first.');
      const { error } = await db.rpc('obs_comment', { oid: id, txt: t }); if (error) return say(/obs_comment|function/.test(error.message || '') ? 'Your school needs database update 70 for comments.' : friendly(error)); say('💬 Comment posted.'); view(id); };
    const rd = document.getElementById('ob-read'); if (rd) rd.onclick = async () => { const { error } = await db.rpc('obs_reflect', { oid: id, txt: o.reflection || '' }); if (error) return say(friendly(error)); say('✓ Thank you. Your observer has been told.'); view(id); };
    document.getElementById('ob-word').onclick = () => {
      const html = `<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:32px;color:#1D2026}h1{color:${S.color_primary};margin:0}h2{color:${S.color_primary};font-size:13pt;border-bottom:2px solid ${S.color_accent};padding-bottom:3px;margin-top:18px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;vertical-align:top;text-align:left}.meta{color:#555}</style></head><body>
        <p class="meta">${OB_E(S.name)} · ${OB_E((OB_KIND[o.kind] || '').replace(/^\S+\s/, ''))}</p><h1>Lesson observation: ${OB_E(nameOf(o.teacher_id))}</h1>
        <p class="meta">${obDate(o.observed_on)}${o.class_name ? ' · ' + OB_E(o.class_name) : ''}${o.subject ? ' · ' + OB_E(o.subject) : ''} · Observed by ${OB_E(nameOf(o.observer_id))}</p>${o.focus ? `<p><b>Focus:</b> ${OB_E(o.focus)}</p>` : ''}
        <h2>Criteria</h2><table><tr><th>Criterion</th><th>Judgement</th><th>Evidence</th></tr>${crit.map(c => `<tr><td>${c.group ? `<small>${OB_E(c.group)}</small><br>` : ''}${OB_E(cTitle(c))}</td><td>${OB_E(lvLabel(o.ratings[c.key]))}</td><td>${OB_E((o.notes || {})[c.key] || '')}</td></tr>`).join('')}</table>
        <h2>Strengths</h2><p>${OB_E(o.strengths || '–').replace(/\n/g, '<br>')}</p><h2>Next steps</h2><p>${OB_E(o.next_steps || '–').replace(/\n/g, '<br>')}</p>
        <h2>Teacher’s reflection</h2><p>${OB_E(o.reflection || '–').replace(/\n/g, '<br>')}</p></body></html>`;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/msword' }));
      a.download = ('observation-' + nameOf(o.teacher_id) + '-' + o.observed_on).replace(/[^\w\u0600-\u06FF-]+/g, '-') + '.doc'; document.body.appendChild(a); a.click(); a.remove();
    };
  }

  // ----- trends (leaders)
  async function trends(since) {
    const y = new Date().getFullYear(), m = new Date().getMonth(), yearStart = (m >= 7 ? y : y - 1) + '-08-15';
    since = since || yearStart;
    pane().innerHTML = '<p class="empty">Loading…</p>';
    const { data: d, error } = await db.rpc('obs_summary', { sid: S.id, since });
    if (error) { pane().innerHTML = `<p class="empty">${OB_E(/obs_summary|function/.test(error.message || '') ? 'Run database update 64 to see observation trends.' : friendly(error))}</p>`; return; }
    const T = d.teachers || [], notYet = T.filter(t => !t.count), max = R.scale.length;
    const opts = [[yearStart, 'This school year'], [new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), 'Last 90 days'], [new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), 'Last 30 days']];
    pane().innerHTML = `<div class="ob-filters"><label>Period <select id="ob-since">${opts.map(([v, l]) => `<option value="${v}" ${v === since ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <section class="in-cards sc-cards"><div class="in-card"><span>👀</span><b>${d.total}</b><small>Observations shared</small></div>
        ${Object.entries(OB_KIND).map(([k, l]) => `<div class="in-card"><span>${l.split(' ')[0]}</span><b>${(d.by_kind || {})[k] || 0}</b><small>${l.replace(/^\S+\s/, '')}</small></div>`).join('')}</section>
      <div class="sc-two-col"><section class="panel"><h2>📈 Criteria across the school</h2><p class="meta">The average judgement for each criterion, and how judgements are spread. No names are shown.</p>
        ${grouped(R.criteria, c => { const x = (d.criteria || {})[c.key]; if (!x) return `<div class="ob-tr"><b>${OB_E(cTitle(c))}</b><small class="meta">Not rated yet</small></div>`;
          return `<div class="ob-tr"><div class="ob-tr-top"><b>${OB_E(cTitle(c))}</b><span class="ob-chip lv-${lvClass(Math.round(x.avg))}">${OB_E(lvLabel(Math.round(x.avg)))} · ${x.avg}</span></div>
            <div class="ob-dist">${R.scale.map(l => { const n = (x.dist || {})[l.n] || 0; return n ? `<i class="lv-${lvClass(l.n)}" style="flex:${n}" title="${OB_E(l.label)}: ${n}">${n}</i>` : ''; }).join('')}</div><small class="meta">${x.n} rating${x.n === 1 ? '' : 's'}</small></div>`; })}
        <p class="sc-legend">${SCALE_DESC().map(l => `<span><i class="lv-${lvClass(l.n)}"></i>${OB_E(l.label)}</span>`).join('')}</p></section>
      <section class="panel"><h2>👩‍🏫 Teachers</h2>${notYet.length ? `<p class="note">🔔 <b>${notYet.length} teacher${notYet.length === 1 ? '' : 's'}</b> not observed in this period.</p>` : ''}
        <div class="in-scroll"><table class="ac-table"><thead><tr><th>Teacher</th><th>Observations</th><th>Last</th></tr></thead><tbody>
        ${T.map(t => `<tr class="${t.count ? '' : 'sc-low'}"><td>${OB_E(t.name)}</td><td>${t.count}</td><td>${t.last ? obDate(t.last) : 'Not yet'}</td></tr>`).join('') || '<tr><td colspan="3" class="meta">No teachers yet.</td></tr>'}</tbody></table></div></section></div>`;
    document.getElementById('ob-since').onchange = e => trends(e.target.value);
  }

  // ----- the school's rubric (leaders)
  function rubric() {
    const C = R.criteria.map(c => Object.assign({}, c)), SC = R.scale.map(l => Object.assign({}, l));
    const draw = () => {
      pane().innerHTML = `<section class="panel ob-rub"><h2>⚙️ Your school’s observation rubric</h2><p class="meta">Start from a framework, then rename, add or remove criteria and levels to match your school. Changes apply to new observations.</p>
        <div class="ob-presets"><button type="button" class="pill pill-soft" data-preset="moe">🇦🇪 UAE MOE inspection framework (1.3, 3.1, 3.2)</button><button type="button" class="pill pill-soft" data-preset="general">📋 General rubric (4 levels)</button></div>
        <h3 class="sc-h3">Levels</h3><div class="ob-rub-scale">${SC.map((l, i) => `<label><b>${l.n}</b><input type="text" data-sl="${i}" maxlength="40" value="${OB_E(l.label)}"></label>`).join('')}
          <span>${SC.length < 7 ? '<button type="button" class="pill pill-soft" id="ob-lv-add">+ Level</button>' : ''}${SC.length > 3 ? '<button type="button" class="link-btn" id="ob-lv-rm">− Level</button>' : ''}</span></div>
        <h3 class="sc-h3">Criteria</h3><p class="meta">Standard (for grouping) · code · criterion · what it looks like</p>${C.map((c, i) => `<div class="ob-rub-c ob-rub-c4"><input type="text" data-cg="${i}" maxlength="80" value="${OB_E(c.group || '')}" placeholder="e.g. 3.1 Teaching" aria-label="Standard"><input type="text" data-cc="${i}" maxlength="12" value="${OB_E(c.code || '')}" placeholder="3.1.1" aria-label="Code"><input type="text" data-cl="${i}" maxlength="160" value="${OB_E(c.label)}" aria-label="Criterion name"><input type="text" data-cd="${i}" maxlength="200" value="${OB_E(c.desc || '')}" placeholder="What it looks like (optional)" aria-label="Description">
          <button type="button" class="link-btn danger" data-crm="${i}" aria-label="Remove">✕</button></div>`).join('')}
        <button type="button" class="pill pill-soft" id="ob-c-add">+ Add a criterion</button>
        <div class="ca-bar"><button type="button" class="link-btn" id="ob-reset">Reset to the MOE framework</button><button type="button" class="btn btn-red" id="ob-rub-save">💾 Save rubric</button></div></section>`;
      const sync = () => { pane().querySelectorAll('[data-cg]').forEach(x => C[x.dataset.cg].group = x.value.trim()); pane().querySelectorAll('[data-cc]').forEach(x => C[x.dataset.cc].code = x.value.trim()); pane().querySelectorAll('[data-sl]').forEach(x => SC[x.dataset.sl].label = x.value.trim()); pane().querySelectorAll('[data-cl]').forEach(x => C[x.dataset.cl].label = x.value.trim()); pane().querySelectorAll('[data-cd]').forEach(x => C[x.dataset.cd].desc = x.value.trim()); };
      const a = document.getElementById('ob-lv-add'); if (a) a.onclick = () => { sync(); SC.push({ n: SC.length + 1, label: 'Level ' + (SC.length + 1) }); draw(); };
      const r = document.getElementById('ob-lv-rm'); if (r) r.onclick = () => { sync(); SC.pop(); draw(); };
      document.getElementById('ob-c-add').onclick = () => { sync(); C.push({ key: 'c' + Date.now().toString(36), label: 'New criterion', desc: '' }); draw(); };
      pane().querySelectorAll('[data-crm]').forEach(b => b.onclick = () => { sync(); if (C.length <= 1) return say('Keep at least one criterion.'); C.splice(Number(b.dataset.crm), 1); draw(); });
      const usePreset = P => { C.splice(0, C.length, ...P.criteria.map(c => Object.assign({}, c))); SC.splice(0, SC.length, ...P.scale.map(l => Object.assign({}, l))); draw(); say('Loaded. Click 💾 Save rubric to use it.'); };
      pane().querySelectorAll('[data-preset]').forEach(b => b.onclick = () => usePreset(b.dataset.preset === 'moe' ? OB_MOE : OB_GENERAL));
      document.getElementById('ob-reset').onclick = () => usePreset(OB_MOE);
      document.getElementById('ob-rub-save').onclick = async () => {
        sync(); if (C.some(c => !c.label) || SC.some(l => !l.label)) return say('Every criterion and level needs a name.');
        const val = { criteria: C, scale: SC }; const { error } = await db.rpc('set_obs_rubric', { sid: S.id, val });
        if (error) return say(friendly(error)); R = val; say('✅ Rubric saved.');
      };
    };
    draw();
  }

  const q = new URLSearchParams(location.search).get('o');
  if (q) { document.querySelectorAll('[data-ot]').forEach(b => b.setAttribute('aria-selected', 'false')); view(Number(q)); } else show(isLead ? 'new' : 'mine');
}
