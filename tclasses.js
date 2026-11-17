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
    $('mc-home').innerHTML = '<div class="empty-box"><p>🏫 Your classes appear here once you publish a course for students.</p><a class="btn btn-red" href="teacher-courses.html">Go to My courses</a></div>';
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

  // ---- work to mark for every class (counted once), and the summary numbers
  const markBy = {};   // course_id|student -> count
  let toMark = 0;
  try {
    const { data: ls } = await db.from('lessons').select('id, course_id').in('course_id', ids);
    const lc = {}; (ls || []).forEach(l => lc[l.id] = l.course_id);
    if ((ls || []).length) {
      const { data: its } = await db.from('lesson_items').select('id, lesson_id').in('lesson_id', ls.map(l => l.id));
      const ic = {}; (its || []).forEach(i => ic[i.id] = lc[i.lesson_id]);
      if ((its || []).length) {
        const { data: rs } = await db.from('item_responses').select('item_id, student_id').in('item_id', its.map(i => i.id)).eq('needs_marking', true);
        (rs || []).forEach(r => { const key = ic[r.item_id] + '|' + r.student_id; markBy[key] = (markBy[key] || 0) + 1; toMark++; });
      }
    }
  } catch (_) {}
  classes.forEach(k => { k.toMark = k.students.reduce((t, s) => t + (markBy[k.course.id + '|' + s.user_id] || 0), 0); });
  let unread = 0;
  try { const { data: cv } = await db.rpc('my_conversations'); unread = (cv || []).filter(c => c.kind !== 'group').reduce((t, c) => t + Number(c.unread || 0), 0); } catch (_) {}
  const stat = (n, label, ic) => `<div class="mc-stat"><span>${ic} ${label}</span><b>${n}</b></div>`;
  $('mc-stats').innerHTML = stat(classes.filter(k => k.today).length, 'Classes today', '⏰') + stat(toMark, 'Work to mark', '📝')
    + stat((reqs || []).length, 'New registrations', '🙋') + stat(unread, 'Unread messages', '💬');

  // ---- the class tiles (one colour per course, so classes of the same course match)
  const PAL = [['#E6F1FB', '#0C447C', '#185FA5'], ['#E1F5EE', '#085041', '#0F6E56'], ['#FAECE7', '#712B13', '#993C1D'], ['#EEEDFE', '#3C3489', '#534AB7'], ['#FAEEDA', '#633806', '#854F0B'], ['#FBEAF0', '#72243E', '#993556']];
  const colourOf = {}; courses.forEach((c, i) => colourOf[c.id] = PAL[i % PAL.length]);
  const nextText = n => { if (!n) return ''; const d = new Date(n.starts_at), t = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
    return (d.toDateString() === new Date().toDateString() ? 'Today ' : d.toLocaleDateString('en-GB', { weekday: 'short' }) + ' ') + t; };
  function drawTiles() {
    $('mc-tiles').innerHTML = classes.map(k => { const [bg, fg, ac] = colourOf[k.course.id], full = k.cap && k.students.length >= k.cap;
      return `<button type="button" class="mc-tile" data-k="${esc(k.key)}" style="background:${bg};color:${fg}">
        <span class="mc-t-course">${esc(k.course.title)}</span>
        <span class="mc-t-time">${esc(k.loose ? '⚠️ No class time yet' : k.slot || 'All students')}</span>
        <span class="mc-t-count">👩‍🎓 ${k.students.length}${k.cap ? ' of ' + k.cap : ''} student${k.students.length === 1 && !k.cap ? '' : 's'}${full ? ' · <b>full</b>' : ''}</span>
        <span class="mc-t-chips">${k.today ? `<i style="background:${ac};color:#fff">⏰ Class today</i>` : ''}<i>${k.toMark ? '📝 ' + k.toMark + ' to mark' : '✅ All marked'}</i>${k.next ? `<i>🎥 ${esc(nextText(k.next))}</i>` : ''}</span></button>`; }).join('');
  }
  $('mc-tiles').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; open(classes.find(k => k.key === b.dataset.k)); });
  function showTiles() {
    $('mc-home').hidden = false; $('mc-class').hidden = true;
    history.replaceState(null, '', location.pathname); window.scrollTo(0, 0);
  }

  // ---- one class, full page: big actions first, then tabs
  async function open(k) {
    $('mc-home').hidden = true; $('mc-class').hidden = false; window.scrollTo(0, 0);
    history.replaceState(null, '', '?class=' + encodeURIComponent(k.key));
    const c = k.course, title = c.title + (k.slot && !k.loose ? ' · ' + k.slot : ''), [bg, fg] = colourOf[c.id];
    const n = k.next, live = n && new Date(n.starts_at) - Date.now() < 15 * 60e3;
    const big = (ic, label, sub, attrs, hot) => `<${attrs.startsWith('href') ? 'a' : 'button type="button"'} class="mc-big ${hot ? 'hot' : ''}" ${attrs}><span class="mc-big-ic">${ic}</span><b>${label}</b><span>${sub}</span></${attrs.startsWith('href') ? 'a' : 'button'}>`;
    $('mc-class').innerHTML = `<button type="button" class="link-btn" id="mc-back">‹ All my classes</button>
      <header class="mc-class-head" style="background:${bg};color:${fg};display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start"><div><span class="mc-t-course">${esc(c.title)}</span><h2>${esc(k.loose ? 'Students without a class time' : k.slot || 'All students')}</h2>
        <span>👩‍🎓 ${k.students.length}${k.cap ? ' of ' + k.cap : ''} students · ${n ? (live ? '🔴 Live class now or very soon' : '🎥 Next class: ' + esc(when(n.starts_at))) : 'No live class scheduled'}</span></div>
        <a class="btn btn-white" href="teacher-course.html?id=${c.id}#edit" title="Class times, places for each time, days, description and more">⚙️ Class settings</a></header>
      <div class="mc-bigs">
        ${n && n.meeting_link ? big('🎥', 'Start class', live ? 'It’s time!' : esc(nextText(n)), `href="${esc(n.meeting_link)}" target="_blank" rel="noopener"`, live) : big('🎥', 'Schedule classes', 'Set up live classes', `href="teacher-course.html?id=${c.id}"`)}
        ${big('📋', 'Take attendance', k.today ? 'Class today' : 'Open the register', 'id="mc-att"', k.today)}
        ${big('➕', 'Add a lesson', 'For this class', `href="teacher-course.html?id=${c.id}${k.group ? '&cls=' + k.group.id : ''}#add-lesson"`)}
        ${big('📤', 'Send a resource', 'To chosen students', 'id="mc-send-big"')}
      </div>
      <nav class="mc-tabs"><button type="button" class="on" data-mt="students">👩‍🎓 Students</button><button type="button" data-mt="work">📝 Work to mark${k.toMark ? ' (' + k.toMark + ')' : ''}<span id="mc-work-n" hidden></span></button><button type="button" data-mt="certs">🏅 Certificates</button><button type="button" data-mt="settings">⚙️ Settings</button>
        <span class="mc-more">More: <a href="teacher-course.html?id=${c.id}#t-reqs">Registrations</a> · <a href="teacher-course.html?id=${c.id}#t-groups">Group</a> · <a href="teacher-course.html?id=${c.id}#t-reports">Reports</a> · <a href="teacher-insights.html">Insights</a></span></nav>
      <section class="panel"><div id="mc-students"><p class="empty">Loading…</p></div><div id="mc-work" hidden></div><div id="mc-certs" hidden></div><div id="mc-settings" hidden></div></section>`;
    $('mc-back').onclick = showTiles;
    $('mc-class').querySelector('.mc-tabs').onclick = e => {
      const b = e.target.closest('[data-mt]'); if (!b) return;
      $('mc-class').querySelectorAll('[data-mt]').forEach(x => x.classList.toggle('on', x === b));
      ['students', 'work', 'certs', 'settings'].forEach(nm => { $('mc-' + nm).hidden = nm !== b.dataset.mt; });
      if (b.dataset.mt === 'settings') drawSettings(k);
      if (b.dataset.mt === 'work') drawWork(k);
      if (b.dataset.mt === 'certs') drawCerts(k);
    };
    $('mc-att').onclick = () => {
      if (k.loose) return say('These students need a class time first. Choose one for each student on the course page.');
      openAttendanceDialog(k.group ? { gid: k.group.id, title } : { cid: c.id, title });
      document.getElementById('att-dialog').addEventListener('close', () => drawStudents(k), { once: true });
    };
    $('mc-send-big').onclick = () => { const ids = k.students.map(s => s.user_id); location.href = 'teacher-resources.html' + (ids.length ? '?students=' + ids.join(',') : ''); };
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

  // ---- Settings for this class
  function drawSettings(k) {
    const box = $('mc-settings'), c = k.course, sl = slotsOf(c), hasTime = !!k.slot && !k.loose;
    const capOwn = (c.slot_caps || {})[k.slot];
    if (k.loose) { box.innerHTML = '<div class="empty-box"><p>These students registered before a class time was chosen. Move each one to a class time from the course page (Students tab).</p><a class="btn btn-red" href="teacher-course.html?id=' + c.id + '#t-students">Open the Students tab</a></div>'; return; }
    box.innerHTML = `<div class="mc-set">
      ${hasTime ? `<form class="mc-set-card" id="mcs-time"><h3>🕒 Class time</h3><p class="meta">Families see this when they register, and it shows on calendars. Students in this class stay in it.</p>
        <label>Days and time <input name="slot" maxlength="80" value="${esc(k.slot)}" placeholder="For example, Mon and Thu, 5–7 pm"></label><button class="btn btn-red">Save class time</button></form>`
      : `<div class="mc-set-card"><h3>🕒 Class time</h3><p class="meta">This course doesn’t have class times yet, so all students are in one class. Add times (for example, a Monday class and a Wednesday class) in the course settings, and students choose one when they register.</p><a class="btn btn-white outline" href="teacher-course.html?id=${c.id}#edit">Add class times</a></div>`}
      <form class="mc-set-card" id="mcs-cap"><h3>👩‍🎓 Places in this class</h3><p class="meta">${k.students.length} student${k.students.length === 1 ? '' : 's'} now. When it’s full, families can choose another time or join this class’s waiting list.</p>
        <label>Maximum students <input type="number" name="cap" min="1" max="500" value="${hasTime ? (capOwn != null ? capOwn : '') : (c.max_students || '')}" placeholder="${c.max_students || 'No limit'}"></label>
        ${hasTime ? `<p class="meta">Leave it empty to use the course maximum${c.max_students ? ' (' + c.max_students + ')' : ''}.</p>` : ''}<button class="btn btn-red">Save places</button></form>
      <div class="mc-set-card"><h3>📘 Course settings</h3><p class="meta">Description, dates, demo video, lesson length, other class times and more. These are shared by all classes of “${esc(c.title)}”.</p><a class="btn btn-white outline" href="teacher-course.html?id=${c.id}#edit">Open course settings</a></div>
      ${hasTime && sl.length > 1 ? `<div class="mc-set-card"><h3>🗑️ Remove this class time</h3><p class="meta">Only possible when the class has no students, requests or waiting list. Other class times aren’t affected.</p><button type="button" class="btn btn-white outline" id="mcs-remove" ${k.students.length ? 'disabled' : ''}>${k.students.length ? 'Move the students first' : 'Remove this class time'}</button></div>` : ''}
    </div>`;
    const tf = $('mcs-time');
    if (tf) tf.onsubmit = async e => {
      e.preventDefault(); const nv = tf.slot.value.trim(); if (!nv) return say('Write the days and time.'); if (nv === k.slot) return say('Nothing changed.');
      const { error } = await db.rpc('rename_class_time', { cid: c.id, old_slot: k.slot, new_slot: nv });
      if (error) return say(/rename_class_time|schema cache/i.test(error.message || '') ? 'Please run the latest Supabase update (class_settings.sql) first.' : (error.message || friendly(error)));
      say('Class time saved. Students in this class have been moved with it.'); setTimeout(() => location.href = location.pathname + '?class=' + encodeURIComponent(c.id + '|' + nv), 700);
    };
    const cf = $('mcs-cap');
    cf.onsubmit = async e => {
      e.preventDefault(); const v = cf.cap.value === '' ? null : Math.max(1, Number(cf.cap.value));
      if (v != null && v < k.students.length && !confirm(`This class already has ${k.students.length} students. Nobody will be removed, but no new students can join until there are fewer than ${v}. Save anyway?`)) return;
      let up;
      if (hasTime) { const caps = Object.assign({}, c.slot_caps || {}); if (v == null) delete caps[k.slot]; else caps[k.slot] = v; up = { slot_caps: caps }; }
      else up = { max_students: v };
      const { error } = await db.from('courses').update(up).eq('id', c.id);
      if (error) return say(/slot_caps/.test(error.message || '') ? 'Please run the latest Supabase update (step_a_class_places.sql) first.' : friendly(error));
      Object.assign(c, up); k.cap = hasTime ? (v != null ? v : c.max_students || null) : v;
      say('Places saved.'); drawTiles();
    };
    const rm = $('mcs-remove');
    if (rm) rm.onclick = async () => {
      if (!confirm(`Remove the class time “${k.slot}”? Families won’t be able to choose it any more.`)) return;
      const { error } = await db.rpc('remove_class_time', { cid: c.id, slot: k.slot });
      if (error) { const m = error.message || ''; return say(/CLASS_HAS_STUDENTS/.test(m) ? 'This class still has students. Move them to another time first.' : /CLASS_HAS_REQUESTS/.test(m) ? 'Some families have asked for this time or are on its waiting list. Answer them first.' : /remove_class_time|schema cache/i.test(m) ? 'Please run the latest Supabase update (class_settings.sql) first.' : friendly(error)); }
      say('Class time removed.'); setTimeout(() => location.href = location.pathname, 700);
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
  drawTiles();
  const pick = new URLSearchParams(location.search).get('class');
  const pk = classes.find(k => k.key === pick); if (pk) open(pk);
}
