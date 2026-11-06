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

// ---------- Teachers: one place for every course and class ----------
async function attendanceHub(hostId, opts = {}) {
  const host = document.getElementById(hostId); if (!host) return;
  const { data: { session } } = await db.auth.getSession();
  const uid = session.user.id, today = todayDubai();
  const [{ data: courses }, { data: groups }, { data: marks }] = await Promise.all([
    db.from('courses').select('id, title, grade, subject').eq('teacher_id', uid).order('title'),
    db.rpc('my_groups'),
    db.from('attendance').select('course_id, group_id, status').eq('day', today)
  ]);
  const classes = (groups || []).filter(g => g.my_role === 'owner' && g.my_status === 'active' && (g.kind === 'class' || !opts.classesOnly));
  const teacherGroups = classes.filter(g => g.kind === 'class').concat(classes.filter(g => g.kind !== 'class'));
  const count = (k, v) => (marks || []).filter(m => m[k] === v);
  const item = (type, id, title, sub) => {
    const m = count(type === 'course' ? 'course_id' : 'group_id', id);
    const done = m.length, absent = m.filter(x => x.status === 'absent').length, late = m.filter(x => x.status === 'late').length;
    return `<div class="hub-row ${done ? 'done' : ''}"><span class="hub-ic">${type === 'course' ? '📘' : type === 'class' ? '🏫' : '👥'}</span>
      <div><b>${esc(title)}</b><span class="meta">${esc(sub)}</span></div>
      <span class="hub-status">${done ? `✅ Taken today · ${done} marked${absent ? ` · ❌ ${absent}` : ''}${late ? ` · ⏰ ${late}` : ''}` : '⏳ Not taken today'}</span>
      <button type="button" class="btn ${done ? 'btn-white outline' : 'btn-red'}" data-hub="${type}" data-id="${id}" data-name="${esc(title)}">${done ? 'Open' : 'Take attendance'}</button></div>`;
  };
  const rows = (courses || []).map(c => item('course', c.id, c.title, ['Course', c.grade, c.subject].filter(Boolean).join(' · ')))
    .concat(teacherGroups.map(g => item(g.kind === 'class' ? 'class' : 'group', g.id, g.name, (g.kind === 'class' ? 'Class' : 'Study group') + ' · ' + g.members + ' members')));
  const notDone = rows.filter(r => !r.includes('class="hub-row done"')).length;
  host.innerHTML = rows.length ? `<div class="hub-head"><b>Today, ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</b><span class="meta">${notDone ? notDone + ' register' + (notDone === 1 ? '' : 's') + ' still to take' : 'All registers taken today 🎉'}</span></div><div class="hub-list">${rows.join('')}</div>`
    : '<div class="empty-box"><p>Create a course or a class first, then take attendance here.</p><a class="btn btn-red" href="teacher-courses.html">Go to My Courses</a></div>';
  host.onclick = e => {
    const b = e.target.closest('[data-hub]'); if (!b) return;
    const id = Number(b.dataset.id);
    openAttendanceDialog(b.dataset.hub === 'course' ? { cid: id, title: b.dataset.name } : { gid: id, title: b.dataset.name });
    const d = document.getElementById('att-dialog');
    d.addEventListener('close', () => attendanceHub(hostId, opts), { once: true });
  };
}
