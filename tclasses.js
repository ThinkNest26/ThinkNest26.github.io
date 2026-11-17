// ===== Think Nest: My classes (one page for a teacher to run all her classes) =====
// A class = a published course + one class time. A course with one time is one class.
// Uses db, say(), friendly(), esc() from app.js, initTeacher() from teacher.js, openAttendanceDialog() / attPct() / tnSlotDays() from attendance.js
async function startMyClasses() {
  const { user, profile } = await initTeacher();
  const uid = user.id;
  const $ = id => document.getElementById(id);
  const ini = n => String(n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const slotsOf = c => String(c.class_schedule || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
  const todayIdx = typeof tnTodayIdx === 'function' ? tnTodayIdx() : new Date().getDay();
  const when = d => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  // ---- load everything once
  const { data: cs0 } = await db.from('courses').select('*').eq('teacher_id', uid).order('title');
  const courses = (cs0 || []).filter(c => c.published !== false && (c.audience || 'students') === 'students');
  const ids = courses.map(c => c.id);
  if (!ids.length) {
    $('mc-page').innerHTML = '<div class="empty-box"><p>🏫 Your classes appear here once you publish a course for students.</p><a class="btn btn-red" href="teacher-courses.html">Go to My courses</a></div>';
    return;
  }
  const [{ data: groups }, { data: enr }, { data: sess }, { data: reqs }] = await Promise.all([
    db.from('study_groups').select('id, course_id, slot, name').in('course_id', ids).eq('kind', 'class'),
    db.from('enrollments').select('*, profiles(full_name, grade)').in('course_id', ids).order('created_at'),
    db.from('sessions').select('*').in('course_id', ids).gte('starts_at', new Date(Date.now() - 2 * 3600e3).toISOString()).order('starts_at').limit(200),
    db.from('course_requests').select('course_id').eq('status', 'teacher').in('course_id', ids)
  ]);

  // ---- build the classes
  const classes = [];
  courses.forEach(c => {
    const sl = slotsOf(c);
    const cEnr = (enr || []).filter(e => e.course_id === c.id);
    if (sl.length > 1) {
      sl.forEach(s => {
        const g = (groups || []).find(x => x.course_id === c.id && String(x.slot || '').trim() === s) || null;
        classes.push({ key: c.id + '|' + s, course: c, slot: s, group: g, students: cEnr.filter(e => String(e.time_slot || '').trim() === s) });
      });
      const loose = cEnr.filter(e => !sl.includes(String(e.time_slot || '').trim()));
      if (loose.length) classes.push({ key: c.id + '|none', course: c, slot: 'No class time chosen yet', group: null, students: loose, loose: true });
    } else {
      classes.push({ key: c.id + '|', course: c, slot: sl[0] || '', group: null, students: cEnr });
    }
  });
  classes.forEach(k => {
    const days = typeof tnSlotDays === 'function' ? tnSlotDays(k.slot || k.course.class_schedule) : new Set();
    k.today = !k.loose && days.size > 0 && days.has(todayIdx);
    { const v = (k.course.slot_caps || {})[k.slot]; k.cap = k.loose ? null : (v != null && v !== '' ? Number(v) : (k.course.max_students || null)); }
    k.days = days;
    k.next = (sess || []).find(s => s.course_id === k.course.id && (!k.group || !s.group_id || s.group_id === k.group.id)) || null;
  });
  classes.sort((a, b) => (b.today - a.today) || a.course.title.localeCompare(b.course.title) || String(a.slot).localeCompare(String(b.slot)));

  // ---- summary numbers
  let toMark = 0;
  try {
    const { data: ls } = await db.from('lessons').select('id').in('course_id', ids);
    const lids = (ls || []).map(l => l.id);
    if (lids.length) {
      const { data: its } = await db.from('lesson_items').select('id').in('lesson_id', lids);
      const iids = (its || []).map(i => i.id);
      if (iids.length) { const { count } = await db.from('item_responses').select('id', { count: 'exact', head: true }).in('item_id', iids).eq('needs_marking', true); toMark = count || 0; }
    }
  } catch (_) {}
  let unread = 0;
  try { const { data: cv } = await db.rpc('my_conversations'); unread = (cv || []).filter(c => c.kind !== 'group').reduce((t, c) => t + Number(c.unread || 0), 0); } catch (_) {}
  const stat = (n, label, href) => `<a class="mc-stat" href="${href}"><span>${label}</span><b>${n}</b></a>`;
  $('mc-stats').innerHTML = stat(classes.filter(k => k.today).length, 'Classes today', '#mc-list')
    + stat(toMark, 'Work to mark', 'teacher-courses.html')
    + stat((reqs || []).length, 'New registrations', 'teacher-courses.html')
    + stat(unread, 'Unread messages', 'messages.html');

  // ---- class list
  let current = null;
  const pick = new URLSearchParams(location.search).get('class');
  function drawList() {
    $('mc-list').innerHTML = classes.map(k => `<button type="button" class="mc-class ${current === k ? 'on' : ''}" data-k="${esc(k.key)}">
        <b>${esc(k.course.title)}</b><span class="meta">${esc(k.slot || 'One class time')} · ${k.students.length}${k.cap ? ' of ' + k.cap : ''} student${k.students.length === 1 && !k.cap ? '' : 's'}${k.cap && k.students.length >= k.cap ? ' · full' : ''}</span>
        ${k.today ? '<span class="mc-today">⏰ Class today</span>' : k.loose ? '<span class="mc-warn">⚠️ Needs a class time</span>' : ''}</button>`).join('');
  }
  $('mc-list').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; open(classes.find(k => k.key === b.dataset.k)); });

  // ---- one class
  async function open(k) {
    current = k; drawList();
    history.replaceState(null, '', '?class=' + encodeURIComponent(k.key));
    const c = k.course, title = c.title + (k.slot && !k.loose ? ' · ' + k.slot : '');
    const n = k.next, live = n && new Date(n.starts_at) - Date.now() < 15 * 60e3;
    $('mc-main').innerHTML = `<div class="mc-head"><div><h2>${esc(c.title)}</h2><span class="meta">${esc(k.loose ? 'Students who haven’t chosen a class time yet' : k.slot || 'One class time')}</span>
        <span class="meta" style="display:block">${n ? (live ? '🔴 Live class now or very soon' : '📅 Next live class: ' + esc(when(n.starts_at))) : 'No live class scheduled'}</span></div>
      <div class="mc-acts">${n && n.meeting_link ? `<a class="btn ${live ? 'btn-red' : 'btn-white outline'}" href="${esc(n.meeting_link)}" target="_blank" rel="noopener">🎥 Start live class</a>` : `<a class="btn btn-white outline" href="teacher-course.html?id=${c.id}">🎥 Schedule live classes</a>`}
        <button type="button" class="btn ${k.today ? 'btn-red' : 'btn-white outline'}" id="mc-att">📋 Take attendance</button></div></div>
      <nav class="mc-tabs"><button type="button" class="on" data-mt="students">👩‍🎓 Students</button><button type="button" data-mt="work">📝 Work to mark<span id="mc-work-n"></span></button><button type="button" data-mt="certs">🏅 Certificates</button>
        <a href="teacher-course.html?id=${c.id}">📚 Lessons</a><a href="teacher-course.html?id=${c.id}#t-reqs">📝 Registrations</a>
        <a href="teacher-course.html?id=${c.id}#t-groups">👥 Group</a><a href="teacher-course.html?id=${c.id}#t-reports">📄 Reports</a>
        <a href="teacher-insights.html">📊 Insights</a></nav>
      <div id="mc-students"><p class="empty">Loading…</p></div><div id="mc-work" hidden></div><div id="mc-certs" hidden></div>`;
    $('mc-main').querySelector('.mc-tabs').onclick = e => {
      const b = e.target.closest('[data-mt]'); if (!b) return;
      $('mc-main').querySelectorAll('[data-mt]').forEach(x => x.classList.toggle('on', x === b));
      ['students', 'work', 'certs'].forEach(n => { $('mc-' + n).hidden = n !== b.dataset.mt; });
      if (b.dataset.mt === 'work') drawWork(k);
      if (b.dataset.mt === 'certs') drawCerts(k);
    };
    countWork(k);
    $('mc-att').onclick = () => {
      if (k.loose) return say('These students need a class time first. Choose one for each student on the course page.');
      openAttendanceDialog(k.group ? { gid: k.group.id, title } : { cid: c.id, title });
      document.getElementById('att-dialog').addEventListener('close', () => drawStudents(k), { once: true });
    };
    drawStudents(k);
  }

  async function drawStudents(k) {
    const box = $('mc-students'); if (!box) return;
    if (!k.students.length) { box.innerHTML = '<div class="empty-box"><p>No students in this class yet. When students register and you confirm their place, they appear here.</p></div>'; return; }
    let att = [];
    try { const { data } = await db.rpc('attendance_summary', { cid: k.group ? null : k.course.id, gid: k.group ? k.group.id : null }); att = data || []; } catch (_) {}
    const sids = k.students.map(s => s.user_id);
    let parents = {};
    try { const { data: pl } = await db.from('parent_links').select('parent_id, student_id').in('student_id', sids); (pl || []).forEach(r => { (parents[r.student_id] = parents[r.student_id] || []).push(r.parent_id); }); } catch (_) {}
    const nameOf = s => s.student_name || (s.profiles && s.profiles.full_name) || 'Student';
    const attOf = s => att.find(a => (a.student_id || a.user_id || a.id) === s.user_id) || att.find(a => a.full_name && a.full_name === nameOf(s));
    box.innerHTML = `<div class="mc-table"><div class="mc-row mc-th"><span>Student</span><span>Progress</span><span>Attendance</span><span></span></div>
      ${k.students.map(s => { const a = attOf(s), p = a && typeof attPct === 'function' ? attPct(a) : null, pa = parents[s.user_id] || [];
        const contact = pa.length ? `<a class="link-btn" href="messages.html?with=${pa[0]}">✉️ Parent</a>` : s.parent_email ? `<a class="link-btn" href="mailto:${esc(s.parent_email)}">✉️ Parent</a>` : '';
        return `<div class="mc-row"><span class="mc-who"><input type="checkbox" data-pick="${s.user_id}" aria-label="Choose ${esc(nameOf(s))}"><span class="initials" data-av="${s.user_id}">${esc(ini(nameOf(s)))}</span><span><b>${esc(nameOf(s))}</b>${s.profiles && s.profiles.grade ? `<span class="meta" style="display:block">${esc(s.profiles.grade)}</span>` : ''}</span></span>
          <span><span class="bar small"><i style="width:${Number(s.progress) || 0}%"></i></span> ${Number(s.progress) || 0}%</span>
          <span class="att-pct ${p == null ? '' : p >= 90 ? 'good' : p >= 75 ? 'ok' : 'low'}">${p == null ? '–' : p + '%'}</span>
          <span class="mc-links">${contact}<a class="link-btn" href="teacher-certificates.html?course=${k.course.id}&student=${s.user_id}">🏅 Certificate</a></span></div>`; }).join('')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;align-items:center"><button type="button" class="pill pill-soft" id="mc-pick-all">Tick everyone</button><button type="button" class="btn btn-red" id="mc-send">📤 Send a resource to ticked students</button></div>
      <p class="meta" style="margin-top:10px">Attendance counts present and late. 90%+ green, 75–89% amber, below 75% red.</p>`;
  }

  // ---- Work to mark: hand-ins from THIS class only
  async function workFor(k) {
    const sids = k.students.map(s => s.user_id); if (!sids.length) return { rows: [], items: [], lessons: [] };
    const { data: ls } = await db.from('lessons').select('id, title').eq('course_id', k.course.id);
    const lids = (ls || []).map(l => l.id); if (!lids.length) return { rows: [], items: [], lessons: ls || [] };
    const { data: its } = await db.from('lesson_items').select('id, lesson_id, title, kind, data').in('lesson_id', lids);
    const iids = (its || []).map(i => i.id); if (!iids.length) return { rows: [], items: its || [], lessons: ls };
    const { data: rs } = await db.from('item_responses').select('*').in('item_id', iids).in('student_id', sids).order('submitted_at', { ascending: false });
    return { rows: rs || [], items: its || [], lessons: ls || [] };
  }
  async function countWork(k) {
    try { const { rows } = await workFor(k); const n = rows.filter(r => r.needs_marking).length; const el = $('mc-work-n'); if (el) el.textContent = n ? ' (' + n + ')' : ''; } catch (_) {}
  }
  async function drawWork(k) {
    const box = $('mc-work'); box.innerHTML = '<p class="empty">Loading…</p>';
    let w; try { w = await workFor(k); } catch (x) { box.innerHTML = '<p class="empty">' + esc(friendly(x)) + '</p>'; return; }
    const nameOf = sid => { const s = k.students.find(x => x.user_id === sid); return s ? (s.student_name || (s.profiles && s.profiles.full_name) || 'Student') : 'Student'; };
    const itemOf = id => w.items.find(i => i.id === id) || {}, lessonOf = id => (w.lessons.find(l => l.id === id) || {}).title || '';
    const todo = w.rows.filter(r => r.needs_marking), done = w.rows.filter(r => !r.needs_marking);
    const card = r => { const it = itemOf(r.item_id);
      return `<article class="panel mc-hand" data-iid="${r.item_id}" data-sid="${r.student_id}">
        <header style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span><b>${esc(nameOf(r.student_id))}</b> · ${esc(it.title || 'Task')}<span class="meta" style="display:block">${esc(lessonOf(it.lesson_id))} · handed in ${new Date(r.submitted_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}${r.attempts > 1 ? ' · 🔁 ' + r.attempts + ' times' : ''}</span></span>
          <span class="tag ${r.needs_marking ? 'tag-wait' : ''}">${r.needs_marking ? '⏳ To mark' : '✅ Marked' + (r.teacher_score != null ? ' · ' + r.teacher_score : '')}</span></header>
        ${r.auto_total ? `<p class="meta">Auto-marked: <b>${r.auto_score ?? 0} / ${r.auto_total}</b></p>` : ''}
        ${r.text_answer ? `<div class="written">${esc(r.text_answer).replace(/\n/g, '<br>')}</div>` : ''}
        ${r.file_path ? `<button type="button" class="pill pill-soft" data-handin="${esc(r.file_path)}">📎 ${esc(r.file_name || 'Open their work')}</button>` : ''}
        <div class="two"><label>Score <input type="number" name="score" min="0" step="0.5" value="${r.teacher_score ?? (r.auto_total ? r.auto_score ?? '' : '')}"></label><label>Feedback for the student <input type="text" name="comment" maxlength="500" value="${esc(r.teacher_comment || '')}"></label></div>
        <button type="button" class="btn btn-red" data-save-mark>Save mark and feedback</button></article>`; };
    box.innerHTML = (todo.length ? `<h3>⏳ To mark (${todo.length})</h3>` + todo.map(card).join('') : '<div class="empty-box"><p>🎉 Nothing to mark for this class right now.</p></div>')
      + (done.length ? `<details class="hubreq-done" style="margin-top:14px"><summary>✅ Already marked (${done.length})</summary>${done.map(card).join('')}</details>` : '');
    box.onclick = async e => {
      const h = e.target.closest('[data-handin]');
      if (h) { const { data, error } = await db.storage.from('hand-ins').createSignedUrl(h.dataset.handin, 600); if (error) return say(friendly(error)); return window.open(data.signedUrl, '_blank', 'noopener'); }
      const b = e.target.closest('[data-save-mark]'); if (!b) return;
      const cardEl = b.closest('[data-iid]'), score = cardEl.querySelector('[name=score]').value;
      b.disabled = true;
      const { error } = await db.from('item_responses').update({ teacher_score: score === '' ? null : Number(score), teacher_comment: cardEl.querySelector('[name=comment]').value.trim() || null, needs_marking: false })
        .eq('item_id', Number(cardEl.dataset.iid)).eq('student_id', cardEl.dataset.sid);
      b.disabled = false;
      if (error) return say(friendly(error));
      say('Saved. The student has been told.'); drawWork(k); countWork(k);
    };
  }

  // ---- Certificates for this class
  async function drawCerts(k) {
    const box = $('mc-certs'); box.innerHTML = '<p class="empty">Loading…</p>';
    if (!k.students.length) { box.innerHTML = '<div class="empty-box"><p>No students in this class yet.</p></div>'; return; }
    let certs = [];
    try { const { data } = await db.from('certificates').select('user_id, title').eq('course_id', k.course.id).in('user_id', k.students.map(s => s.user_id)); certs = data || []; } catch (_) {}
    const nameOf = s => s.student_name || (s.profiles && s.profiles.full_name) || 'Student';
    const ready = k.students.filter(s => (Number(s.progress) || 0) >= 100 && !certs.some(c => c.user_id === s.user_id)).length;
    box.innerHTML = `${ready ? `<p class="note big-note">🎓 ${ready} student${ready === 1 ? ' has' : 's have'} finished every lesson and ${ready === 1 ? 'doesn’t' : 'don’t'} have a certificate yet.</p>` : ''}
      <div class="mc-table">${k.students.map(s => { const got = certs.filter(c => c.user_id === s.user_id);
        return `<div class="mc-row"><span class="mc-who"><span class="initials">${esc(ini(nameOf(s)))}</span><b>${esc(nameOf(s))}</b></span>
          <span><span class="bar small"><i style="width:${Number(s.progress) || 0}%"></i></span> ${Number(s.progress) || 0}%</span>
          <span>${got.length ? '✅ ' + got.length : '–'}</span>
          <span class="mc-links">${got.map(c => `<span class="meta">🏅 ${esc(c.title)}</span>`).join('')}<a class="pill ${(Number(s.progress) || 0) >= 100 && !got.length ? 'pill-live' : 'pill-soft'}" href="teacher-certificates.html?course=${k.course.id}&student=${s.user_id}">🏅 Give certificate</a></span></div>`; }).join('')}</div>`;
  }

  document.addEventListener('click', e => {
    if (e.target.id === 'mc-pick-all') document.querySelectorAll('[data-pick]').forEach(c => c.checked = true);
    if (e.target.id === 'mc-send') { const ids = [...document.querySelectorAll('[data-pick]:checked')].map(c => c.dataset.pick); if (!ids.length) return say('Tick one or more students first.'); location.href = 'teacher-resources.html?students=' + ids.join(','); }
  });
  drawList();
  open(classes.find(k => k.key === pick) || classes.find(k => k.today) || classes[0]);
}
