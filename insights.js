// ===== Think Nest: Class Insights for teachers =====
const IN = { SECURE: 80, DEV: 60 };
const inEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inFirst = n => String(n || 'Student').split(' ')[0];
const inBand = p => p == null ? 'none' : p >= IN.SECURE ? 'secure' : p >= IN.DEV ? 'dev' : 'gap';
const inLabel = { secure: '🟢 Secure', dev: '🟡 Developing', gap: '🔴 Gap', none: '⚪ Not marked yet' };
const inNames = list => { const n = list.map(inFirst); return n.length <= 3 ? n.join(', ').replace(/, ([^,]*)$/, ' and $1') : n.slice(0, 3).join(', ') + ` and ${n.length - 3} more`; };

async function startInsights() {
  const { user } = await initTeacher();
  const pick = document.getElementById('in-pick'), out = document.getElementById('in-out');
  const [{ data: courses }, { data: classes }] = await Promise.all([
    db.from('courses').select('id, title').eq('teacher_id', user.id).order('title'),
    db.from('study_groups').select('id, name, course_id').eq('owner_id', user.id).eq('kind', 'class').order('name')
  ]);
  if (!(courses || []).length && !(classes || []).length) {
    out.innerHTML = '<div class="empty-box"><p>Create a course and add students first. Insights appear once students start completing work.</p><a class="btn btn-red" href="teacher-courses.html">My Courses</a></div>';
    pick.hidden = true; return;
  }
  pick.innerHTML = `<label>Show insights for <select id="in-sel">${(classes || []).length ? `<optgroup label="My classes">${classes.map(c => `<option value="g${c.id}">🏫 ${inEsc(c.name)}</option>`).join('')}</optgroup>` : ''}
    ${(courses || []).length ? `<optgroup label="My courses">${courses.map(c => `<option value="c${c.id}">📘 ${inEsc(c.title)}</option>`).join('')}</optgroup>` : ''}</select></label>`;
  const sel = document.getElementById('in-sel');
  const q = new URLSearchParams(location.search);
  if (q.get('class')) sel.value = 'g' + q.get('class'); else if (q.get('course')) sel.value = 'c' + q.get('course');
  sel.addEventListener('change', () => load(sel.value));
  load(sel.value);

  async function load(v) {
    out.innerHTML = '<p class="empty">Gathering the data…</p>';
    const isG = v[0] === 'g', id = Number(v.slice(1));
    const courseId = isG ? ((classes || []).find(c => c.id === id) || {}).course_id : id;
    const { data, error } = await db.rpc('class_insights', { cid: isG ? null : id, gid: isG ? id : null });
    if (error) { out.innerHTML = `<p class="empty">${inEsc(friendly(error))}</p>`; return; }
    inDraw(out, data, courseId, isG ? 'class' : 'course', sel.options[sel.selectedIndex].text.replace(/^\S+\s/, ''));
  }
}

// Draw the insights into any box (used on the Class Insights page and inside each class)
function inDraw(out, d, courseId, kind, name) {
    const S = d.students || [], items = d.items || [], R = d.responses || [];
    if (!S.length) { out.innerHTML = `<div class="empty-box"><p>No students in this ${kind} yet.</p></div>`; return; }
    if (!courseId && kind === 'class') { out.innerHTML = '<div class="empty-box"><p>This class isn’t linked to a course yet, so there’s no work to analyse. Create the class from a course to see insights.</p></div>'; return; }
    const pct = r => r.total ? Math.round(100 * Number(r.score || 0) / Number(r.total)) : null;
    const resp = {}; R.forEach(r => { (resp[r.student] = resp[r.student] || {})[r.item] = r; });
    const scored = items.filter(it => R.some(r => r.item === it.id && pct(r) != null));
    // per student
    const stu = S.map(s => {
      const mine = resp[s.id] || {}, ps = scored.map(it => mine[it.id] ? pct(mine[it.id]) : null).filter(x => x != null);
      const att = (d.attendance || {})[s.id];
      return { ...s, avg: ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null,
        done: items.length ? Math.round(100 * Object.keys(mine).length / items.length) : null,
        att: att && att.total ? Math.round(100 * att.came / att.total) : null, gaps: 0 };
    });
    // per objective
    const objs = {};
    scored.forEach(it => {
      const k = it.objective || ('Activity: ' + it.title);
      const o = objs[k] = objs[k] || { name: k, real: !!it.objective, scores: [], low: new Set(), items: [] };
      o.items.push(it.title);
      S.forEach(s => { const r = (resp[s.id] || {})[it.id], p = r ? pct(r) : null; if (p != null) { o.scores.push(p); if (p < IN.DEV) o.low.add(s.id); } });
    });
    const OB = Object.values(objs).map(o => ({ ...o, avg: o.scores.length ? Math.round(o.scores.reduce((a, b) => a + b, 0) / o.scores.length) : null })).sort((a, b) => (a.avg ?? 101) - (b.avg ?? 101));
    OB.forEach(o => o.low.forEach(id => { const s = stu.find(x => x.id === id); if (s) s.gaps++; }));
    const all = R.map(pct).filter(x => x != null);
    const classAvg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
    const doneAvg = stu.filter(s => s.done != null).length ? Math.round(stu.reduce((a, s) => a + (s.done || 0), 0) / stu.length) : null;
    const attL = stu.filter(s => s.att != null), attAvg = attL.length ? Math.round(attL.reduce((a, s) => a + s.att, 0) / attL.length) : null;
    const toMark = R.filter(r => r.marking).length;
    const tag = s => s.avg == null ? ['none', '⚪ No marked work yet'] : (s.avg < IN.DEV || s.gaps >= 2) ? ['gap', '🧡 Needs support'] : s.avg >= 90 ? ['star', '🚀 Ready for a challenge'] : ['secure', '✅ On track'];

    // next steps
    const steps = [];
    OB.filter(o => o.avg != null && o.avg < IN.DEV).forEach(o => steps.push({ ic: '🔴', t: `Re-teach “${o.name}”`, d: `${o.low.size} student${o.low.size === 1 ? ' is' : 's are'} below ${IN.DEV}%${o.low.size ? ': ' + inNames([...o.low].map(id => (S.find(s => s.id === id) || {}).name)) : ''}. Try a short guided practice, then an exit ticket to check understanding.`, obj: o.real ? o.name : '' }));
    OB.filter(o => o.avg != null && o.avg >= IN.DEV && o.avg < IN.SECURE && o.low.size).forEach(o => steps.push({ ic: '🟡', t: `Consolidate “${o.name}”`, d: `The class is developing here (${o.avg}%). ${inNames([...o.low].map(id => (S.find(s => s.id === id) || {}).name))} would benefit from extra practice.`, obj: o.real ? o.name : '' }));
    const group = stu.filter(s => s.gaps >= 2);
    if (group.length) steps.push({ ic: '👥', t: 'Small support group', d: `${inNames(group.map(s => s.name))} ${group.length === 1 ? 'is' : 'are'} below ${IN.DEV}% in 2 or more objectives. A short small-group session could help.` });
    const stars = stu.filter(s => s.avg != null && s.avg >= 90);
    if (stars.length) steps.push({ ic: '🚀', t: 'Ready for a challenge', d: `${inNames(stars.map(s => s.name))} ${stars.length === 1 ? 'is' : 'are'} averaging 90% or more. Offer an extension task or a chance to explain their thinking to others.` });
    const missing = stu.filter(s => s.done != null && s.done < 50 && items.length);
    if (missing.length) steps.push({ ic: '📝', t: 'Missing work', d: `${inNames(missing.map(s => s.name))} ${missing.length === 1 ? 'has' : 'have'} completed less than half the activities. Consider a reminder, or a message to parents.` });
    const lowAtt = stu.filter(s => s.att != null && s.att < 80);
    if (lowAtt.length) steps.push({ ic: '📋', t: 'Attendance', d: lowAtt.map(s => `${inFirst(s.name)} (${s.att}%)`).join(', ') + ` ${lowAtt.length === 1 ? 'has' : 'have'} attended less than 80% of classes.` });
    if (toMark) steps.push({ ic: '✍️', t: 'Marking', d: `${toMark} piece${toMark === 1 ? '' : 's'} of work ${toMark === 1 ? 'is' : 'are'} waiting for your marking. Marking it will make these insights more accurate.` });
    if (!steps.length && scored.length) steps.push({ ic: '🌟', t: 'Great work!', d: 'No gaps found so far. Keep going, and consider stretching the class with more challenging tasks.' });

    const cell = p => p == null ? '<td class="in-c none">–</td>' : `<td class="in-c ${inBand(p)}">${p}</td>`;
    out.innerHTML = `
      <section class="in-cards">
        <div class="in-card"><span>🎯</span><b>${classAvg ?? '–'}${classAvg != null ? '%' : ''}</b><small>Class average</small></div>
        <div class="in-card"><span>📚</span><b>${doneAvg ?? '–'}${doneAvg != null ? '%' : ''}</b><small>Work completed</small></div>
        <div class="in-card"><span>📋</span><b>${attAvg ?? '–'}${attAvg != null ? '%' : ''}</b><small>Attendance</small></div>
        <div class="in-card ${toMark ? 'warn' : ''}"><span>✍️</span><b>${toMark}</b><small>To mark</small></div>
      </section>
      ${!scored.length ? `<div class="empty-box"><p>No marked work yet for this ${kind}. Insights will appear as students complete quizzes and activities, and as you mark their work.</p></div>` : `
      <section class="panel in-steps"><h2>💡 Suggested next steps</h2>
        ${steps.map(s => `<article class="in-step"><span class="in-step-ic">${s.ic}</span><div><b>${inEsc(s.t)}</b><p>${inEsc(s.d)}</p>
          ${s.obj ? `<a class="pill pill-soft" href="teacher-course.html?id=${courseId}&obj=${encodeURIComponent(s.obj)}">📘 Plan a lesson for this</a>` : ''}</div></article>`).join('')}
      </section>
      <section class="panel"><h2>🎯 Objectives: where are the gaps?</h2>
        <div class="in-objs">${OB.map(o => `<div class="in-obj ${inBand(o.avg)}"><div class="in-obj-top"><b>${inEsc(o.name)}</b><span class="in-tag">${inLabel[inBand(o.avg)]}</span></div>
          <div class="in-bar"><i style="width:${o.avg || 0}%"></i></div>
          <span class="meta">Class average <b>${o.avg ?? '–'}%</b> · ${o.scores.length} result${o.scores.length === 1 ? '' : 's'}${o.low.size ? ' · Below ' + IN.DEV + '%: ' + inEsc(inNames([...o.low].map(id => (S.find(s => s.id === id) || {}).name))) : ''}</span></div>`).join('')}</div>
      </section>`}
      <section class="panel"><div class="in-head"><h2>👩‍🎓 Students</h2><button type="button" class="pill pill-soft" id="in-csv">⬇ Download CSV</button></div>
        <div class="in-scroll"><table class="in-table"><thead><tr><th>Student</th><th>Average</th><th>Completed</th><th>Attendance</th><th>Status</th>${scored.map((it, i) => `<th class="in-ih" title="${inEsc(it.lesson + ' · ' + it.title)}">${i + 1}</th>`).join('')}</tr></thead>
        <tbody>${stu.sort((a, b) => (a.avg ?? 999) - (b.avg ?? 999)).map(s => { const t = tag(s); return `<tr><th>${inEsc(s.name)}</th>${cell(s.avg)}<td>${s.done ?? '–'}${s.done != null ? '%' : ''}</td><td>${s.att ?? '–'}${s.att != null ? '%' : ''}</td><td><span class="in-st ${t[0]}">${t[1]}</span></td>
          ${scored.map(it => { const r = (resp[s.id] || {})[it.id]; return r ? cell(pct(r)) : '<td class="in-c miss" title="Not handed in">·</td>'; }).join('')}</tr>`; }).join('')}</tbody></table></div>
        ${scored.length ? `<details class="in-key"><summary>What do the numbers 1, 2, 3… mean?</summary><ol>${scored.map(it => `<li><b>${inEsc(it.title)}</b> <span class="meta">${inEsc(it.lesson)}${it.objective ? ' · 🎯 ' + inEsc(it.objective) : ''}</span></li>`).join('')}</ol></details>` : ''}
        <p class="meta in-legend"><span class="in-c secure">80+</span> Secure <span class="in-c dev">60–79</span> Developing <span class="in-c gap">&lt;60</span> Gap <span class="in-c miss">·</span> Not handed in</p>
      </section>`;
    const csv = document.getElementById('in-csv');
    if (csv) csv.onclick = () => {
      const rows = [['Student', 'Average %', 'Completed %', 'Attendance %', 'Status', ...scored.map(it => it.title)]]
        .concat(stu.map(s => [s.name, s.avg ?? '', s.done ?? '', s.att ?? '', tag(s)[1].replace(/^\S+\s/, ''), ...scored.map(it => { const r = (resp[s.id] || {})[it.id]; return r ? (pct(r) ?? '') : ''; })]));
      const text = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv' }));
      a.download = `insights-${name.replace(/[^\w]+/g, '-').toLowerCase()}.csv`; document.body.appendChild(a); a.click(); a.remove();
    };
  }

// Insights inside a class page (class teacher only)
async function inClassTab(out, gid, courseId, name) {
  out.innerHTML = '<p class="empty">Gathering the data…</p>';
  const { data, error } = await db.rpc('class_insights', { cid: null, gid });
  if (error) { out.innerHTML = `<p class="empty">${inEsc(typeof friendly === 'function' ? friendly(error) : error.message)}</p>`; return; }
  inDraw(out, data, courseId, 'class', name);
}
