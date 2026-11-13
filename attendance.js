// ===== Think Nest attendance =====
// Uses db, say(), friendly(), esc() from app.js
const ATT = { present: ['✅', 'Present'], late: ['⏰', 'Late'], absent: ['❌', 'Absent'], excused: ['📝', 'Excused'] };
const todayDubai = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
const attPct = s => s.total ? Math.round((Number(s.present) + Number(s.late)) / Number(s.total) * 100) : null;
const attClass = p => p == null ? '' : p >= 90 ? 'good' : p >= 75 ? 'ok' : 'low';

// Draws the full register (take attendance + overview + history) into `host`
async function attendancePanel(host, ctx) {
  const cid = ctx.cid || null, gid = ctx.gid || null;
  host.innerHTML = `<div class="att">
    <div class="att-tabs"><button class="chip on" data-av="take">📋 Take attendance</button><button class="chip" data-av="overview">📊 Overview</button><button class="chip" data-av="history">🗓️ Past registers</button></div>
    <div data-avp="take">
      <div class="att-top">
        <label>Date <input type="date" class="att-date" value="${todayDubai()}" max="${todayDubai()}"></label>
        ${cid ? '<label>Live class <select class="att-sess"><option value="">Whole day (no live class)</option></select></label>' : ''}
        <button type="button" class="pill pill-soft big" data-allp>✅ Mark everyone present</button>
      </div>
      <div class="att-list"><p class="empty">Loading…</p></div>
      <div class="att-save"><span class="meta att-count"></span><button type="button" class="btn btn-red" data-save-att>Save register</button></div><p class="att-result" role="status" aria-live="polite" hidden></p>
    </div>
    <div data-avp="overview" hidden></div>
    <div data-avp="history" hidden></div>
  </div>`;
  const $ = s => host.querySelector(s);
  let rows = [], sessions = [];
  async function loadSessions() {
    if (!cid) return;
    const d = $('.att-date').value;
    const from = new Date(d + 'T00:00:00+04:00').toISOString(), to = new Date(d + 'T23:59:59+04:00').toISOString();
    const { data } = await db.from('sessions').select('id, title, starts_at').eq('course_id', cid).gte('starts_at', from).lte('starts_at', to).order('starts_at');
    sessions = data || [];
    const keep = $('.att-sess').value;
    $('.att-sess').innerHTML = '<option value="">Whole day (no live class)</option>' + sessions.map(s => `<option value="${s.id}">${esc(s.title)} · ${new Date(s.starts_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}</option>`).join('');
    if (sessions.some(s => String(s.id) === keep)) $('.att-sess').value = keep; else if (sessions.length === 1) $('.att-sess').value = sessions[0].id;
  }
  async function loadRegister() {
    const sess = cid && $('.att-sess').value ? Number($('.att-sess').value) : null;
    const { data, error } = await db.rpc('attendance_register', { cid, gid, d: $('.att-date').value, sess });
    if (error) { $('.att-list').innerHTML = `<p class="empty">${esc(friendly(error))}</p>`; return; }
    rows = (data || []).map(r => ({ ...r, status: r.status || '', note: r.note || '' }));
    drawRegister();
  }
  function drawRegister() {
    $('.att-list').innerHTML = rows.length ? rows.map((r, i) => `<div class="att-row ${r.status ? 'st-' + r.status : ''}" data-ai="${i}">
        <span class="initials">${esc((r.full_name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
        <div class="att-name"><b>${esc(r.full_name || 'Student')}</b><span class="meta">${esc(r.grade || '')}${r.self_checkin ? ' · ✋ checked in themselves' : ''}</span></div>
        <div class="att-btns" role="radiogroup" aria-label="Attendance for ${esc(r.full_name || 'student')}">${Object.entries(ATT).map(([k, [ic, n]]) => `<button type="button" class="att-b ${r.status === k ? 'on ' + k : ''}" data-st="${k}" role="radio" aria-checked="${r.status === k}">${ic}<span>${n}</span></button>`).join('')}</div>
        <input type="text" class="att-note" placeholder="Note (optional)" maxlength="200" value="${esc(r.note)}" aria-label="Note for ${esc(r.full_name || 'student')}">
      </div>`).join('') : `<div class="empty-box"><p>No students yet. ${cid ? 'Students appear here when they join this course.' : 'Add students to this class first.'}</p></div>`;
    const marked = rows.filter(r => r.status).length;
    $('.att-count').textContent = rows.length ? `${marked} of ${rows.length} marked` + (marked < rows.length ? ' · unmarked students won’t be saved' : '') : '';
  }
  host.addEventListener('click', async e => {
    const b = e.target.closest('[data-st]');
    if (b) { const i = Number(b.closest('[data-ai]').dataset.ai); rows[i].status = b.dataset.st; return drawRegister(); }
    if (e.target.closest('[data-allp]')) { rows.forEach(r => { if (!r.status) r.status = 'present'; }); return drawRegister(); }
    if (e.target.closest('[data-save-att]')) {
      const marked = rows.filter(r => r.status);
      if (!marked.length) return say('Mark at least one student first.');
      const btn = e.target.closest('[data-save-att]'); btn.disabled = true; const label = btn.textContent; btn.textContent = 'Saving…';
      const res = $('.att-result'); res.hidden = true;
      host.querySelectorAll('.att-note').forEach((inp, i) => { if (rows[i]) rows[i].note = inp.value; });
      const sess = cid && $('.att-sess').value ? Number($('.att-sess').value) : null;
      let data, error;
      try { ({ data, error } = await db.rpc('save_attendance', { cid, gid, d: $('.att-date').value, sess, rows: rows.filter(r => r.status).map(r => ({ student_id: r.student_id, status: r.status, note: r.note })) })); }
      catch (x) { error = x; }
      btn.disabled = false; btn.textContent = label;
      res.hidden = false;
      if (error) { res.className = 'att-result bad'; res.innerHTML = '⚠️ The register couldn’t be saved: <b>' + esc(error.message || friendly(error)) + '</b><br><small>Please send a screenshot of this message to the Think Nest team.</small>'; return; }
      const msg = `✅ Register saved for ${data} student${data === 1 ? '' : 's'} on ${new Date($('.att-date').value + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}. Parents of absent or late students have been told.`;
      res.className = 'att-result good'; res.textContent = msg; say(msg);
      return;
    }
    const v = e.target.closest('[data-av]');
    if (v) {
      host.querySelectorAll('[data-av]').forEach(x => x.classList.toggle('on', x === v));
      host.querySelectorAll('[data-avp]').forEach(p => p.hidden = p.dataset.avp !== v.dataset.av);
      if (v.dataset.av === 'overview') drawOverview();
      if (v.dataset.av === 'history') drawHistory();
    }
    const h = e.target.closest('[data-hday]');
    if (h) {
      $('.att-date').value = h.dataset.hday;
      host.querySelector('[data-av=take]').click();
      await loadSessions(); if (cid && $('.att-sess')) $('.att-sess').value = h.dataset.hsess || '';
      loadRegister();
    }
  });
  host.addEventListener('input', e => { if (e.target.classList.contains('att-note')) rows[Number(e.target.closest('[data-ai]').dataset.ai)].note = e.target.value; });
  host.addEventListener('change', async e => {
    if (e.target.classList.contains('att-date')) { await loadSessions(); loadRegister(); }
    if (e.target.classList.contains('att-sess')) loadRegister();
  });
  async function drawOverview() {
    const box = host.querySelector('[data-avp=overview]'); box.innerHTML = '<p class="empty">Loading…</p>';
    const { data } = await db.rpc('attendance_summary', { cid, gid });
    box.innerHTML = (data || []).length ? `<div class="att-table-wrap"><table class="att-table"><thead><tr><th>Student</th><th>Attendance</th><th>✅</th><th>⏰</th><th>❌</th><th>📝</th></tr></thead><tbody>${data.map(s => { const p = attPct(s);
        return `<tr><td>${esc(s.full_name)}</td><td><span class="att-pct ${attClass(p)}">${p == null ? '–' : p + '%'}</span></td><td>${s.present}</td><td>${s.late}</td><td>${s.absent}</td><td>${s.excused}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="meta">Attendance % counts present and late. 90% or more is green, 75–89% amber, below 75% red.</p>` : '<p class="empty">No registers taken yet.</p>';
  }
  async function drawHistory() {
    const box = host.querySelector('[data-avp=history]'); box.innerHTML = '<p class="empty">Loading…</p>';
    const { data } = await db.rpc('attendance_days', { cid, gid });
    box.innerHTML = (data || []).length ? `<div class="att-days">${data.map(d => `<button type="button" class="panel att-day" data-hday="${d.day}" data-hsess="${d.session_id || ''}">
        <b>${new Date(d.day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b>${d.session_id ? '<span class="meta">Live class</span>' : ''}
        <span class="att-mini">✅ ${d.present} · ⏰ ${d.late} · ❌ ${d.absent} · 📝 ${d.excused}</span><span class="meta">Open to edit</span></button>`).join('')}</div>` : '<p class="empty">No registers taken yet.</p>';
  }
  await loadSessions(); loadRegister();
}

// A dialog version (used for classes)
function openAttendanceDialog(ctx) {
  let d = document.getElementById('att-dialog');
  if (!d) {
    d = document.createElement('dialog'); d.id = 'att-dialog'; d.className = 'dlg wide-dlg item-dlg';
    d.innerHTML = '<div class="item-wrap"><header class="path-head"><h2 id="att-title"></h2><button type="button" class="link-btn" data-aclose>✕ Close</button></header><div id="att-body"></div></div>';
    document.body.appendChild(d); d.querySelector('[data-aclose]').addEventListener('click', () => d.close());
  }
  d.querySelector('#att-title').textContent = '📋 Attendance: ' + ctx.title;
  const body = d.querySelector('#att-body'); const fresh = body.cloneNode(false); body.replaceWith(fresh);
  d.showModal(); attendancePanel(fresh, ctx);
}

// ---------- Students: check in and see their own attendance ----------
async function studentAttendance(courseId, hostId) {
  const host = document.getElementById(hostId); if (!host) return;
  const now = Date.now();
  const { data: sess } = await db.from('sessions').select('id, title, starts_at, ends_at').eq('course_id', courseId)
    .gte('starts_at', new Date(now - 3 * 3600e3).toISOString()).lte('starts_at', new Date(now + 15 * 60e3).toISOString()).order('starts_at');
  const live = (sess || []).find(s => now >= new Date(s.starts_at).getTime() - 15 * 60e3 && now <= (s.ends_at ? new Date(s.ends_at).getTime() : new Date(s.starts_at).getTime() + 90 * 60e3));
  const { data: { session } } = await db.auth.getSession();
  const { data: mine } = await db.from('attendance').select('status, day, session_id').eq('course_id', courseId).eq('student_id', session.user.id);
  const s = { present: 0, late: 0, absent: 0, excused: 0, total: (mine || []).length };
  (mine || []).forEach(r => s[r.status]++);
  const p = attPct(s), checkedIn = live && (mine || []).some(r => r.session_id === live.id);
  host.innerHTML = (live ? `<div class="checkin ${checkedIn ? 'done' : ''}"><span>${checkedIn ? '✅' : '🔴'}</span><div><b>${esc(live.title)}</b><span class="meta">${checkedIn ? 'You’re checked in. Enjoy the class!' : 'Live now. Check in so your teacher knows you’re here.'}</span></div>${checkedIn ? '' : `<button type="button" class="btn btn-red" data-checkin="${live.id}">✋ Check in</button>`}</div>` : '') +
    (s.total ? `<div class="att-me"><span class="att-pct ${attClass(p)}">${p}%</span><span>attendance · ✅ ${s.present} · ⏰ ${s.late} · ❌ ${s.absent} · 📝 ${s.excused}</span></div>` : '');
  host.onclick = async e => {
    const b = e.target.closest('[data-checkin]'); if (!b) return;
    b.disabled = true;
    const { error } = await db.rpc('self_check_in', { sess: Number(b.dataset.checkin) });
    if (error) { b.disabled = false; return say(friendly(error)); }
    say('✋ You’re checked in! +2 Nest Points'); studentAttendance(courseId, hostId);
  };
}

// ---------- Parents (and students): attendance per course or class ----------
async function attendanceOverviewFor(sid, hostId) {
  const host = document.getElementById(hostId); if (!host) return;
  const { data } = await db.from('attendance').select('status, day, note, course_id, group_id, courses(title), study_groups(name)').eq('student_id', sid).order('day', { ascending: false });
  if (!(data || []).length) { host.innerHTML = '<p class="meta">No attendance taken yet.</p>'; return; }
  const by = {};
  data.forEach(r => { const k = r.course_id ? 'c' + r.course_id : 'g' + r.group_id; const n = r.courses ? r.courses.title : r.study_groups ? r.study_groups.name : 'Class';
    (by[k] = by[k] || { name: n, present: 0, late: 0, absent: 0, excused: 0, total: 0 }); by[k][r.status]++; by[k].total++; });
  const recent = data.filter(r => ['absent', 'late'].includes(r.status)).slice(0, 5);
  host.innerHTML = `<div class="att-cards">${Object.values(by).map(s => { const p = attPct(s); return `<div class="att-card"><span class="att-pct ${attClass(p)}">${p}%</span><b>${esc(s.name)}</b><span class="meta">✅ ${s.present} · ⏰ ${s.late} · ❌ ${s.absent} · 📝 ${s.excused}</span></div>`; }).join('')}</div>` +
    (recent.length ? `<p class="meta att-recent-h">Recent absences and late arrivals</p><ul class="att-recent">${recent.map(r => `<li>${ATT[r.status][0]} ${new Date(r.day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${esc(r.courses ? r.courses.title : r.study_groups ? r.study_groups.name : '')}${r.note ? ` · <i>${esc(r.note)}</i>` : ''}</li>`).join('')}</ul>` : '');
}

// ---------- Class days: read "Sun and Wed 5 to 7" style times ----------
const TN_DAYS = [['sun', 'sunday', 'الأحد'], ['mon', 'monday', 'الاثنين'], ['tue', 'tuesday', 'tues', 'الثلاثاء'], ['wed', 'wednesday', 'الأربعاء'], ['thu', 'thursday', 'thur', 'thurs', 'الخميس'], ['fri', 'friday', 'الجمعة'], ['sat', 'saturday', 'السبت']];
const TN_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function tnSlotDays(text) {
  const t = String(text || '').toLowerCase(), out = new Set();
  TN_DAYS.forEach((names, i) => { if (names.some(n => /[a-z]/.test(n) ? new RegExp('\\b' + n + '\\b').test(t) : t.includes(n))) out.add(i); });
  // ranges like "Mon–Thu" or "Monday to Friday"
  const r = t.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*(?:-|–|to)\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*/);
  if (r) { const a = TN_DAYS.findIndex(n => n[0] === r[1]), b = TN_DAYS.findIndex(n => n[0] === r[2]); for (let i = a; ; i = (i + 1) % 7) { out.add(i); if (i === b) break; } }
  if (/\b(daily|every ?day)\b/.test(t)) for (let i = 0; i < 7; i++) out.add(i);
  return out;
}
const tnTodayIdx = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' })).getDay();
function tnNextDay(days) { const d = tnTodayIdx(); for (let k = 1; k <= 7; k++) if (days.has((d + k) % 7)) return TN_DAY_NAMES[(d + k) % 7]; return ''; }

// ---------- Teachers: one register for each published course group, on its class days ----------
async function attendanceHub(hostId, opts = {}) {
  const host = document.getElementById(hostId); if (!host) return;
  const { data: { session } } = await db.auth.getSession();
  const uid = session.user.id, today = todayDubai(), dIdx = tnTodayIdx();
  const [{ data: courses0 }, { data: groups }, { data: marks }, { data: cgs }] = await Promise.all([
    db.from('courses').select('*').eq('teacher_id', uid).order('title'),
    db.rpc('my_groups'),
    db.from('attendance').select('course_id, group_id, status').eq('day', today),
    db.from('study_groups').select('id, course_id, slot, name').eq('owner_id', uid).eq('kind', 'class')
  ]);
  // only published courses for students: no drafts, no study groups, no older classes that aren't part of a course
  const courses = (courses0 || []).filter(c => c.published !== false && (c.audience || 'students') === 'students');
  const cById = {}; courses.forEach(c => cById[c.id] = c);
  const members = {}; (groups || []).forEach(g => members[g.id] = g.members);
  const cgroups = (cgs || []).filter(g => g.course_id && cById[g.course_id]);
  const grouped = new Set(cgroups.map(g => g.course_id));
  const count = (k, v) => (marks || []).filter(m => m[k] === v);
  const regs = courses.filter(c => !grouped.has(c.id)).map(c => ({ type: 'course', id: c.id, title: c.title, sub: ['Course', c.grade === 'all' ? 'All grades' : c.grade, c.subject].filter(Boolean).join(' · '), days: tnSlotDays(c.class_schedule) }))
    .concat(cgroups.map(g => { const c = cById[g.course_id]; return { type: 'class', id: g.id, title: g.name, sub: [c.title, g.slot, members[g.id] != null ? members[g.id] + ' students' : ''].filter(Boolean).join(' · '), days: tnSlotDays(g.slot || c.class_schedule) }; }));
  const item = r => {
    const m = count(r.type === 'course' ? 'course_id' : 'group_id', r.id);
    const done = m.length, absent = m.filter(x => x.status === 'absent').length, late = m.filter(x => x.status === 'late').length;
    const isDay = !r.days.size || r.days.has(dIdx);
    return `<div class="hub-row ${done ? 'done' : ''}"><span class="hub-ic">📘</span>
      <div><b>${esc(r.title)}</b><span class="meta">${esc(r.sub)}</span></div>
      <span class="hub-status">${done ? `✅ Taken today · ${done} marked${absent ? ` · ❌ ${absent}` : ''}${late ? ` · ⏰ ${late}` : ''}` : isDay ? '⏳ Not taken today' : r.days.size ? '📅 Next class: ' + tnNextDay(r.days) : ''}</span>
      <button type="button" class="btn ${done || !isDay ? 'btn-white outline' : 'btn-red'}" data-hub="${r.type}" data-id="${r.id}" data-name="${esc(r.title)}">${done ? 'Open' : isDay ? 'Take attendance' : 'Open register'}</button></div>`;
  };
  const todayRegs = regs.filter(r => !r.days.size || r.days.has(dIdx)), otherRegs = regs.filter(r => r.days.size && !r.days.has(dIdx));
  const notDone = todayRegs.filter(r => !count(r.type === 'course' ? 'course_id' : 'group_id', r.id).length).length;
  host.innerHTML = regs.length ? `<div class="hub-head"><b>Today, ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Dubai' })}</b><span class="meta">${todayRegs.length ? (notDone ? notDone + ' register' + (notDone === 1 ? '' : 's') + ' still to take' : 'All registers taken today 🎉') : 'No classes today'}</span></div>
      ${todayRegs.length ? `<div class="hub-list">${todayRegs.map(item).join('')}</div>` : '<p class="empty">None of your courses has a class today. 🌿</p>'}
      ${otherRegs.length ? `<details class="hubreq-done" style="margin-top:14px"><summary>Other days (${otherRegs.length}): open a register to catch up</summary><div class="hub-list">${otherRegs.map(item).join('')}</div></details>` : ''}`
    : '<div class="empty-box"><p>Attendance appears here for your published courses, on their class days.</p><a class="btn btn-red" href="teacher-courses.html">Go to My Courses</a></div>';
  host.onclick = e => {
    const b = e.target.closest('[data-hub]'); if (!b) return;
    const id = Number(b.dataset.id);
    openAttendanceDialog(b.dataset.hub === 'course' ? { cid: id, title: b.dataset.name } : { gid: id, title: b.dataset.name });
    const d = document.getElementById('att-dialog');
    d.addEventListener('close', () => attendanceHub(hostId, opts), { once: true });
  };
}

// ---------- One course page: its own Attendance tab ----------
async function courseAttendanceTab(host, course) {
  if (!host) return;
  if (course.published === false) { host.innerHTML = '<div class="empty-box"><p>📋 Attendance opens once this course is published and students have joined.</p></div>'; return; }
  const { data: gs } = await db.from('study_groups').select('id, name, slot').eq('course_id', course.id).eq('kind', 'class').order('name');
  if (!(gs || []).length) return attendancePanel(host, { cid: course.id });
  const dIdx = tnTodayIdx();
  const { data: marks } = await db.from('attendance').select('group_id').eq('day', todayDubai()).in('group_id', gs.map(g => g.id));
  host.innerHTML = `<p class="meta">Take the register for each group on its class days.</p><div class="hub-list">${gs.map(g => { const days = tnSlotDays(g.slot || course.class_schedule), isDay = !days.size || days.has(dIdx), done = (marks || []).some(m => m.group_id === g.id);
    return `<div class="hub-row ${done ? 'done' : ''}"><span class="hub-ic">👥</span><div><b>${esc(g.name)}</b><span class="meta">${esc(g.slot || '')}</span></div>
      <span class="hub-status">${done ? '✅ Taken today' : isDay ? '⏳ Class today' : days.size ? '📅 Next class: ' + tnNextDay(days) : ''}</span>
      <button type="button" class="btn ${isDay && !done ? 'btn-red' : 'btn-white outline'}" data-cgatt="${g.id}" data-name="${esc(g.name)}">${done ? 'Open' : isDay ? 'Take attendance' : 'Open register'}</button></div>`; }).join('')}</div>`;
  host.onclick = e => { const b = e.target.closest('[data-cgatt]'); if (!b) return; openAttendanceDialog({ gid: Number(b.dataset.cgatt), title: b.dataset.name }); document.getElementById('att-dialog').addEventListener('close', () => courseAttendanceTab(host, course), { once: true }); };
}
