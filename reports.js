// ===== Think Nest: report cards =====
const RC_LEVELS = [['exceeding', '🌟 Exceeding'], ['secure', '🟢 Secure'], ['developing', '🟡 Developing'], ['emerging', '🔴 Emerging'], ['na', '⚪ Not yet assessed']];
const RC_RATE = ['Excellent', 'Good', 'Satisfactory', 'Needs improvement'];
const rcE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RC_LEVELS7 = [['l7', 'Level 7'], ['l6', 'Level 6'], ['l5', 'Level 5'], ['l4', 'Level 4'], ['l3', 'Level 3'], ['l2', 'Level 2'], ['l1', 'Level 1'], ['na', '⚪ Not yet assessed']];
const rcLevels = scale => scale === '1-7' ? RC_LEVELS7 : RC_LEVELS;
const rcLevel = (p, scale) => p == null ? 'na' : scale === '1-7' ? 'l' + (p >= 90 ? 7 : p >= 80 ? 6 : p >= 70 ? 5 : p >= 60 ? 4 : p >= 50 ? 3 : p >= 35 ? 2 : 1)
  : p >= 90 ? 'exceeding' : p >= 80 ? 'secure' : p >= 60 ? 'developing' : 'emerging';
const rcLabel = k => (RC_LEVELS7.find(l => l[0] === k) || RC_LEVELS.find(l => l[0] === k) || RC_LEVELS[4])[1];
const rcFirst = n => String(n || 'Student').split(' ')[0];

// ---------- the printable report (used by teachers, students and parents)
function rcReportHtml(r) {
  const d = r.data || {}, rows = d.rows || [];
  const box = (label, v) => `<div class="rcp-box"><b>${v == null || v === '' ? '–' : rcE(v) + (typeof v === 'number' ? '%' : '')}</b><span>${label}</span></div>`;
  return `<article class="rcp">
    <header class="rcp-head"><img src="images/tn-logo-dark.png" alt="Think Nest"><div><h1>Student report</h1><p>${rcE(r.term)}</p></div></header>
    <section class="rcp-who"><div><span>Student</span><b>${rcE(r.student_name || d.student || '')}</b></div><div><span>Class</span><b>${rcE(r.class_name || d.class || '')}</b></div><div><span>Teacher</span><b>${rcE(r.teacher_name || d.teacher || '')}</b></div><div><span>Date</span><b>${rcE(d.date || '')}</b></div></section>
    <section class="rcp-boxes">${box('Average score', d.avg)}${box('Attendance', d.att)}${box('Work completed', d.done)}</section>
    ${rows.length ? `<h2>Learning objectives</h2><table class="rcp-table"><thead><tr><th>Objective</th><th>Score</th><th>Level</th></tr></thead><tbody>
      ${rows.map(x => `<tr><td>${rcE(x.objective)}</td><td>${x.pct == null ? '–' : x.pct + '%'}</td><td class="lv-${rcE(x.level)}">${rcLabel(x.level)}</td></tr>`).join('')}</tbody></table>` : ''}
    <section class="rcp-two"><div><span>Effort</span><b>${rcE(d.effort || '–')}</b></div><div><span>Behaviour</span><b>${rcE(d.behaviour || '–')}</b></div></section>
    ${d.extra ? `<h2>${rcE(d.extra_title || 'Additional comment')}</h2><p class="rcp-text">${rcE(d.extra).replace(/\n/g, '<br>')}</p>` : ''}
    ${d.comment ? `<h2>Teacher’s comment</h2><p class="rcp-text">${rcE(d.comment).replace(/\n/g, '<br>')}</p>` : ''}
    ${d.next ? `<h2>Next steps</h2><p class="rcp-text">${rcE(d.next).replace(/\n/g, '<br>')}</p>` : ''}
    <footer class="rcp-foot"><span>Class teacher: <b>${rcE(r.teacher_name || d.teacher || '')}</b></span><span>thinknestonline.com</span></footer>
  </article>`;
}
function rcPrint(list, title) {
  const w = window.open('', '_blank'); if (!w) return say('Please allow pop-ups to print the reports.');
  const css = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${rcE(title)}</title><base href="${location.href.replace(/[^/]*$/, '')}">${css}
    <style>body{background:#fff;margin:0;padding:12px}.rcp{page-break-after:always;box-shadow:none;margin:0 auto 20px}.rcp:last-child{page-break-after:auto}@page{size:A4;margin:12mm}</style></head>
    <body class="rcp-print">${list.map(rcReportHtml).join('')}<script>setTimeout(function(){window.print()},700)<\/script></body></html>`);
  w.document.close();
}

// ---------- teacher: Report cards tab inside the class
async function rcClassInit() {
  const gid = Number(new URLSearchParams(location.search).get('id')); if (!gid) return;
  const { data: { session } } = await db.auth.getSession(); if (!session) return;
  const [{ data: g }, { data: me }] = await Promise.all([db.from('study_groups').select('id, name, kind, owner_id, course_id').eq('id', gid).maybeSingle(), db.from('profiles').select('full_name, role').eq('id', session.user.id).maybeSingle()]);
  if (!g || g.kind !== 'class' || !(g.owner_id === session.user.id || (me && me.role === 'admin'))) return;
  const tabs = document.querySelector('.tabs'); if (!tabs || document.getElementById('tab-rc')) return;
  tabs.insertAdjacentHTML('beforeend', '<button role="tab" aria-selected="false" data-tab="t-rc" id="tab-rc">📝 Report cards</button>');
  const sec = document.createElement('section'); sec.id = 't-rc'; sec.className = 'tab-panel rc'; sec.hidden = true;
  document.getElementById('t-mem').after(sec);
  let term = '', ins = null, cards = [], editing = null; const pending = new Set();
  let cycles = [];
  try { const { data: cy } = await db.rpc('my_report_cycles', { gid }); cycles = cy || []; } catch (_) {}
  const cycle = () => cycles.find(c => c.title === term) || null;
  const teacherName = (me && me.full_name) || '';

  async function loadData() {
    const [{ data: i }, { data: c }] = await Promise.all([db.rpc('class_insights', { cid: null, gid }), db.from('report_cards').select('*').eq('group_id', gid)]);
    ins = i; cards = c || [];
  }
  function studentFacts(sid) {
    const items = (ins && ins.items) || [], R = (ins && ins.responses) || [];
    const pct = r => r.total ? Math.round(100 * Number(r.score || 0) / Number(r.total)) : null;
    const mine = R.filter(r => r.student === sid), byObj = {};
    items.forEach(it => {
      const r = mine.find(x => x.item === it.id); const p = r ? pct(r) : null; if (p == null) return;
      const k = it.objective || it.title; (byObj[k] = byObj[k] || []).push(p);
    });
    const rows = Object.entries(byObj).map(([o, ps]) => { const p = Math.round(ps.reduce((a, b) => a + b, 0) / ps.length); return { objective: o, pct: p, level: rcLevel(p) }; });
    const all = mine.map(pct).filter(x => x != null), att = ((ins && ins.attendance) || {})[sid];
    return { rows, avg: all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null,
      att: att && att.total ? Math.round(100 * att.came / att.total) : null, done: items.length ? Math.round(100 * mine.length / items.length) : null };
  }
  function suggest(name, f, effort) {
    const n = rcFirst(name), sec2 = f.rows.filter(r => ['exceeding', 'secure'].includes(r.level)).map(r => r.objective), dev = f.rows.filter(r => ['developing', 'emerging'].includes(r.level)).map(r => r.objective);
    const overall = f.avg == null ? 'has settled into the class this term' : f.avg >= 85 ? 'has made excellent progress this term' : f.avg >= 70 ? 'has made good progress this term' : f.avg >= 55 ? 'has made steady progress this term' : 'has worked towards their goals this term and is building confidence';
    let c = `${n} ${overall}.`;
    if (sec2.length) c += ` ${n} is secure in these objectives: ${sec2.slice(0, 3).join('; ')}.`;
    if (dev.length) c += ` ${n} is still building confidence in: ${dev.slice(0, 3).join('; ')}. With regular practice, ${n} will continue to grow.`;
    if (effort === 'Excellent' || effort === 'Good') c += ` ${n} approaches learning with ${effort === 'Excellent' ? 'outstanding' : 'good'} effort and enthusiasm.`;
    if (f.att != null && f.att < 85) c += ` Regular attendance will help ${n} make even more progress.`;
    c += ` Well done, ${n}!`;
    const next = dev.length ? dev.slice(0, 3).map(o => '• Practise: ' + o).join('\n') : '• Take on extension challenges and explain thinking to others.';
    return { comment: c, next };
  }
  async function draw() {
    await loadData();
    const terms = cycles.length ? cycles.map(c => c.title) : [...new Set(cards.map(c => c.term).concat([...pending]))];
    if (!term || !terms.includes(term)) term = cycles.length ? (cycles.find(c => c.status === 'open') || cycles[0]).title : (terms[terms.length - 1] || '');
    const CY = cycle();
    const S = (ins && ins.students) || [];
    const mine = cards.filter(c => c.term === term), card = sid => mine.find(c => c.student_id === sid);
    const st = c => !c ? ['none', '⚪ Not started'] : ({ published: ['pub', '📤 Shared'], ready: ['ready', '✅ Ready'], submitted: ['sub', '⏳ Waiting for approval'], returned: ['ret', '↩ Returned'], approved: ['ready', '✅ Approved'] })[c.status] || ['draft', '✏️ Draft'];
    sec.innerHTML = `<div class="panel rc-head">
        <div class="rc-term"><label>Report <select id="rc-term">${terms.map(t => `<option ${t === term ? 'selected' : ''}>${rcE(t)}</option>`).join('')}${terms.length ? '' : '<option value="">No reports yet</option>'}</select></label>
          ${cycles.length ? '' : '<span class="rc-or">or</span><input id="rc-new" maxlength="80" placeholder="New report title, e.g. Term 1 Report 2026–2027"><button type="button" class="pill pill-soft" id="rc-add">+ Start</button>'}</div>
        ${term ? `<div class="rc-acts"><button type="button" class="btn btn-white outline" id="rc-print-all">🖨️ Print all</button>${CY && CY.needs_approval ? '' : '<button type="button" class="btn btn-red" id="rc-share">📤 Share ready reports</button>'}</div>` : ''}
      </div>
      ${CY ? `<p class="note rc-cycle">🏫 School report cycle${CY.deadline ? ` · <b>Deadline: ${new Date(CY.deadline + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</b>` : ''}${CY.scale === '1-7' ? ' · Scale: levels 1–7' : ''}${CY.needs_approval ? ' · When a report is finished, click <b>📤 Submit for approval</b>. Your school leaders approve and release reports to families.' : ''}${CY.status === 'released' ? ' · ✅ Released to families' : ''}</p>` : ''}
      ${!g.course_id ? '<p class="note">Tip: link a course to this class (📊 Insights tab) so reports can fill in scores and objectives automatically.</p>' : ''}
      ${!term ? '<div class="empty-box"><p>Start a report: type a title above, for example “Term 1 Report 2026–2027”, and click + Start.</p></div>'
        : !S.length ? '<div class="empty-box"><p>No students in this class yet. Use ➕ Add students first.</p></div>'
        : `<div class="panel"><div class="in-scroll"><table class="ac-table rc-table"><thead><tr><th>Student</th><th>Average</th><th>Status</th><th></th></tr></thead><tbody>
          ${S.map(s => { const c = card(s.id), f = studentFacts(s.id), t = st(c); return `<tr data-sid="${s.id}"><td>${rcE(s.name)}</td><td>${f.avg == null ? '–' : f.avg + '%'}</td><td><span class="rc-st ${t[0]}">${t[1]}</span>${c && c.status === 'returned' && c.leader_note ? `<br><small class="rc-note">“${rcE(c.leader_note)}”</small>` : ''}</td>
            <td class="rc-row-acts"><button type="button" class="pill pill-soft" data-rc="edit">${c ? '✏️ Edit' : '📝 Write report'}</button>${c ? '<button type="button" class="link-btn" data-rc="print">🖨️</button>' : ''}</td></tr>`; }).join('')}</tbody></table></div></div>
          <div id="rc-editor"></div>`}`;
    const ts = document.getElementById('rc-term'); if (ts) ts.onchange = () => { term = ts.value; draw(); };
    const addB = document.getElementById('rc-add'); if (addB) addB.onclick = () => { const v = document.getElementById('rc-new').value.trim(); if (v.length < 2) return say('Type a title for the report, e.g. Term 1 Report 2026–2027.'); term = v; pending.add(v); draw(); };
    const pa = document.getElementById('rc-print-all'); if (pa) pa.onclick = () => { const list = mine.filter(c => c.student_id).map(c => withNames(c)); if (!list.length) return say('Write at least one report first.'); rcPrint(list, g.name + ' – ' + term); };
    const sh = document.getElementById('rc-share'); if (sh) sh.onclick = async () => {
      const ready = mine.filter(c => c.status === 'ready').length;
      if (!ready) return say('Mark reports as ✅ Ready first, then share them.');
      if (!confirm(`Share ${ready} ready report${ready === 1 ? '' : 's'} with students and their parents? They’ll get a notification.`)) return;
      const { data: n, error } = await db.rpc('publish_reports', { gid, rterm: term });
      if (error) return say(friendly(error)); say(`📤 ${n} report${n === 1 ? '' : 's'} shared.`); draw();
    };
  }
  const withNames = c => ({ ...c, student_name: (((ins && ins.students) || []).find(s => s.id === c.student_id) || {}).name, class_name: g.name, teacher_name: teacherName });
  function openEditor(sid) {
    const S = (ins && ins.students) || [], s = S.find(x => x.id === sid); if (!s) return;
    const c = cards.find(x => x.term === term && x.student_id === sid), f = studentFacts(sid);
    const CY = cycle(), scale = (CY && CY.scale) || 'levels4';
    const d = c && c.data && c.data.rows ? c.data : { rows: f.rows.map(r => ({ ...r, level: rcLevel(r.pct, scale) })), avg: f.avg, att: f.att, done: f.done, effort: '', behaviour: '', comment: '', next: '', extra: '' };
    editing = { sid, id: c && c.id, d };
    const ed = document.getElementById('rc-editor');
    ed.innerHTML = `<section class="panel rc-ed"><div class="ca-top"><h2>📝 ${rcE(s.name)} · ${rcE(term)}</h2><button type="button" class="link-btn" data-rc="close" aria-label="Close">✕</button></div>
      <div class="rc-facts"><span>🎯 Average <b>${d.avg ?? '–'}${d.avg != null ? '%' : ''}</b></span><span>📋 Attendance <b>${d.att ?? '–'}${d.att != null ? '%' : ''}</b></span><span>📚 Work completed <b>${d.done ?? '–'}${d.done != null ? '%' : ''}</b></span>
        <button type="button" class="link-btn" data-rc="refresh">🔄 Refresh from latest data</button></div>
      ${d.rows.length ? `<table class="ac-table"><thead><tr><th>Learning objective</th><th>Score</th><th>Level</th></tr></thead><tbody>
        ${d.rows.map((r, i) => `<tr><td>${rcE(r.objective)}</td><td>${r.pct == null ? '–' : r.pct + '%'}</td><td><select data-row="${i}">${rcLevels(scale).map(([k, l]) => `<option value="${k}" ${r.level === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>`
        : '<p class="meta">No marked work yet, so there are no objectives to show. You can still write a comment.</p>'}
      <div class="rc-two"><label>Effort <select id="rc-effort"><option value="">Choose…</option>${RC_RATE.map(x => `<option ${d.effort === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label>Behaviour <select id="rc-beh"><option value="">Choose…</option>${RC_RATE.map(x => `<option ${d.behaviour === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
      <label class="rc-lab">Teacher’s comment <button type="button" class="pill pill-soft" data-rc="suggest">✨ Suggest a comment</button><textarea id="rc-comment" rows="5" maxlength="2000">${rcE(d.comment)}</textarea></label>
      ${CY && CY.extra_title ? `<label class="rc-lab">${rcE(CY.extra_title)}<textarea id="rc-extra" rows="4" maxlength="2000">${rcE(d.extra || '')}</textarea></label>` : ''}
      <label class="rc-lab">Next steps<textarea id="rc-next" rows="3" maxlength="1000">${rcE(d.next)}</textarea></label>
      ${c && c.status === 'returned' && c.leader_note ? `<p class="note">↩ <b>Returned by your school leader:</b> ${rcE(c.leader_note)}</p>` : ''}
      ${c && c.status === 'published' ? '<p class="note">📤 This report has been released to the family, so it can no longer be changed.</p>' : `<div class="ca-bar"><button type="button" class="btn btn-white outline" data-rc="preview">👀 Preview</button><button type="button" class="btn btn-white outline" data-rc="draft">💾 Save draft</button>${CY && CY.needs_approval
        ? '<button type="button" class="btn btn-red" data-rc="submit">📤 Submit for approval</button>' : '<button type="button" class="btn btn-red" data-rc="ready">✅ Save and mark ready</button>'}</div>`}
    </section>`;
    ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function collect() {
    const d = editing.d, ed = document.getElementById('rc-editor');
    ed.querySelectorAll('[data-row]').forEach(sel => { d.rows[Number(sel.dataset.row)].level = sel.value; });
    d.effort = ed.querySelector('#rc-effort').value; d.behaviour = ed.querySelector('#rc-beh').value;
    d.comment = ed.querySelector('#rc-comment').value.trim(); d.next = ed.querySelector('#rc-next').value.trim();
    const ex = ed.querySelector('#rc-extra'); const CY = cycle();
    if (ex) { d.extra = ex.value.trim(); d.extra_title = CY && CY.extra_title; }
    d.scale = (CY && CY.scale) || d.scale || 'levels4';
    d.date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return d;
  }
  async function save(status) {
    const CY = cycle();
    const d = collect(), payload = Object.assign({ group_id: gid, student_id: editing.sid, term, data: d, status, updated_at: new Date().toISOString() }, CY ? { cycle_id: CY.id } : {}, status === 'submitted' ? { leader_note: null } : {});
    const { error } = await db.from('report_cards').upsert(payload, { onConflict: 'group_id,student_id,term' });
    if (error) return say(friendly(error));
    say(status === 'ready' ? '✅ Saved and marked ready.' : status === 'submitted' ? '📤 Submitted for approval. Your school leaders will review it.' : '💾 Draft saved.'); editing = null; draw();
  }
  sec.addEventListener('click', async e => {
    const b = e.target.closest('[data-rc]'); if (!b) return;
    const a = b.dataset.rc, row = b.closest('[data-sid]');
    if (a === 'edit') return openEditor(row.dataset.sid);
    if (a === 'print') { const c = cards.find(x => x.term === term && x.student_id === row.dataset.sid); if (c) rcPrint([withNames(c)], term); return; }
    if (a === 'close') { document.getElementById('rc-editor').innerHTML = ''; editing = null; return; }
    if (a === 'refresh') { const f = studentFacts(editing.sid); Object.assign(editing.d, { rows: f.rows, avg: f.avg, att: f.att, done: f.done }); const keep = collect(); openEditor(editing.sid); editing.d.comment = keep.comment; return; }
    if (a === 'suggest') {
      const s = ((ins && ins.students) || []).find(x => x.id === editing.sid), d = collect(), sg = suggest(s.name, d, d.effort);
      const t = document.getElementById('rc-comment'); if (t.value.trim() && !confirm('Replace your comment with a suggested one?')) return;
      t.value = sg.comment; const nx = document.getElementById('rc-next'); if (!nx.value.trim()) nx.value = sg.next; return;
    }
    if (a === 'preview') { const d = collect(); const s = ((ins && ins.students) || []).find(x => x.id === editing.sid); rcPrint([{ term, data: d, student_name: s.name, class_name: g.name, teacher_name: teacherName }], 'Preview'); return; }
    if (a === 'draft') return save('draft');
    if (a === 'ready') return save('ready');
    if (a === 'submit') return save('submitted');
  });
  document.getElementById('tab-rc').addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.tab === 't-rc')));
    document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = p.id !== 't-rc'; });
    draw();
  });
}

// ---------- students and parents: My reports
async function startReportsPage() {
  const { data: { session } } = await db.auth.getSession(); if (!session) { location.href = 'start.html'; return; }
  const { data: me } = await db.from('profiles').select('role, also_parent').eq('id', session.user.id).maybeSingle();
  const box = document.getElementById('rp-list'), view = document.getElementById('rp-view');
  const isParent = me && (me.role === 'parent' || me.also_parent) && me.role !== 'student';
  let child = new URLSearchParams(location.search).get('child');
  if (isParent) {
    const { data: links } = await db.from('parent_links').select('student_id').eq('parent_id', session.user.id);
    const ids = (links || []).map(l => l.student_id);
    if (!ids.length) { box.innerHTML = '<div class="empty-box"><p>Link your child to your account to see their reports.</p><a class="btn btn-red" href="add-child.html">Add a child</a></div>'; return; }
    const { data: kids } = await db.from('profiles').select('id, full_name').in('id', ids);
    if (!child || !ids.includes(child)) child = ids[0];
    document.getElementById('rp-pick').innerHTML = (kids || []).length > 1 ? `<label>Child <select id="rp-kid">${kids.map(k => `<option value="${k.id}" ${k.id === child ? 'selected' : ''}>${rcE(k.full_name)}</option>`).join('')}</select></label>` : '';
    const sel = document.getElementById('rp-kid'); if (sel) sel.onchange = () => { location.search = '?child=' + sel.value; };
  }
  const { data, error } = await db.rpc('my_reports', { child: isParent ? child : null });
  if (error) { box.innerHTML = `<p class="empty">${rcE(friendly(error))}</p>`; return; }
  if (!(data || []).length) { box.innerHTML = '<div class="empty-box"><p>No reports yet. When a teacher shares a report, it will appear here. 📝</p></div>'; return; }
  box.innerHTML = data.map((r, i) => `<button type="button" class="panel rp-card" data-i="${i}"><span class="rp-ic">📝</span><span><b>${rcE(r.term)}</b><small>${rcE(r.class_name)} · ${rcE(r.teacher_name || '')} · ${new Date(r.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small></span><span class="rp-go">Open →</span></button>`).join('');
  box.onclick = e => {
    const b = e.target.closest('[data-i]'); if (!b) return; const r = data[Number(b.dataset.i)];
    view.innerHTML = `<div class="rp-bar"><button type="button" class="btn btn-red" id="rp-print">🖨️ Print / Save PDF</button></div>` + rcReportHtml(r);
    document.getElementById('rp-print').onclick = () => rcPrint([r], r.term); view.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  box.querySelector('[data-i="0"]').click();
}
