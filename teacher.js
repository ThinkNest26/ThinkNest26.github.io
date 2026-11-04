// ===== Think Nest teacher area =====
// Uses db, say(), friendly(), esc(), when(), relative(), showError(), PHOTOS from app.js

// Every teacher page: must be logged in AND approved as a teacher
async function initTeacher() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'teacher-login.html'; throw new Error('not logged in'); }
  const { data: p } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!p || !['teacher', 'school_leader'].includes(p.role)) {
    location.href = p && p.requested_role === 'teacher' ? 'teacher-pending.html' : 'student-dashboard.html';
    throw new Error('not a teacher');
  }
  document.body.classList.remove('loading');
  const side = document.getElementById('side'), shade = document.getElementById('side-shade'), st = document.getElementById('side-toggle');
  st.addEventListener('click', () => { side.classList.add('open'); shade.classList.add('show'); });
  shade.addEventListener('click', () => { side.classList.remove('open'); shade.classList.remove('show'); });
  document.getElementById('logout').addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  const initials = (p.full_name || session.user.email).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  document.querySelectorAll('#me-initials, #me-initials-small').forEach(el => el.textContent = initials);
  document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  return { user: session.user, profile: p };
}

function tImg(c) { return c.image_url ? esc(c.image_url) : 'images/' + PHOTOS[c.id % PHOTOS.length] + '.png'; }

// ---------- Teacher sign up (request) ----------
function startTeacherSignup() {
  const f = document.getElementById('tsignup-form'), err = document.getElementById('tsignup-error');
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    for (const el of f.querySelectorAll('input[required]')) {
      if (!el.checkValidity()) { el.focus(); return showError(err, el.type === 'password' ? 'Choose a password with at least 8 characters.' : el.type === 'email' ? 'Enter a valid email address.' : 'Please fill in every required box.'); }
    }
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    const { error } = await db.auth.signUp({
      email: f.email.value.trim(), password: f.password.value,
      options: { data: { role: 'teacher', full_name: f.full_name.value.trim(), subject: f.subject.value.trim(), school: f.school.value.trim(), phone: f.phone.value.trim() } }
    });
    btn.disabled = false; btn.textContent = 'Send request';
    if (error) return showError(err, friendly(error));
    location.href = 'teacher-pending.html';
  });
}

// ---------- Course form (used on two pages) ----------
function courseDialog(onSaved) {
  const dlg = document.getElementById('course-dialog'), f = document.getElementById('course-form'), err = document.getElementById('course-error');
  let editing = null, teacher = null;
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    const row = { title: f.title.value.trim(), description: f.description.value.trim() || null, category: f.category.value, level: f.level.value,
                  weeks: f.weeks.value ? Number(f.weeks.value) : null, image_url: f.image_url.value.trim() || null };
    if (!row.title) return showError(err, 'Give the course a title.');
    let res;
    if (editing) res = await db.from('courses').update(row).eq('id', editing.id).select().single();
    else res = await db.from('courses').insert({ ...row, teacher_id: teacher.id, teacher_name: teacher.full_name }).select().single();
    if (res.error) return showError(err, friendly(res.error));
    dlg.close(); say(editing ? 'Course saved.' : 'Course created.'); onSaved(res.data);
  });
  return {
    open(course, me) {
      editing = course; teacher = me;
      document.getElementById('course-dlg-title').textContent = course ? 'Edit course' : 'New course';
      f.reset();
      if (course) ['title', 'description', 'category', 'level', 'weeks', 'image_url'].forEach(k => f[k].value = course[k] ?? '');
      showError(err, ''); dlg.showModal();
    }
  };
}

// ---------- Dashboard ----------
async function startTeacherDashboard() {
  const { user, profile } = await initTeacher();
  document.getElementById('me-name').textContent = 'Welcome, ' + (profile.full_name || 'teacher');
  document.getElementById('me-sub').textContent = [profile.subject, profile.school].filter(Boolean).join(' · ') || 'Teacher';
  const { data: courses } = await db.from('courses').select('id, title').eq('teacher_id', user.id);
  const ids = (courses || []).map(c => c.id);
  document.getElementById('st-courses').textContent = ids.length;
  if (!ids.length) {
    document.getElementById('events').innerHTML = '<div class="empty-box"><p>Start by creating your first course.</p><a class="btn btn-red" href="teacher-courses.html">Create a course</a></div>';
    return;
  }
  const [en, ses] = await Promise.all([
    db.from('enrollments').select('user_id, progress').in('course_id', ids),
    db.from('sessions').select('*, courses(title)').in('course_id', ids).gte('starts_at', new Date(Date.now() - 3600000).toISOString()).order('starts_at').limit(8)
  ]);
  const enr = en.data || [];
  document.getElementById('st-students').textContent = new Set(enr.map(e => e.user_id)).size;
  document.getElementById('st-avg').textContent = enr.length ? Math.round(enr.reduce((s, e) => s + e.progress, 0) / enr.length) + '%' : '0%';
  const list = ses.data || [];
  document.getElementById('st-classes').textContent = list.length;
  document.getElementById('events').innerHTML = list.length ? list.map(s => {
    const [rel, live] = relative(s.starts_at);
    return `<article class="event"><div><h4>${esc(s.title)}</h4><span class="meta">${esc(s.courses ? s.courses.title : '')}</span><span class="when">${esc(when(s.starts_at))}</span></div>
      <div class="event-actions"><span class="tag ${live ? 'tag-now' : ''}">${rel}</span>${s.meeting_link ? `<a class="pill pill-live" href="${esc(s.meeting_link)}" target="_blank" rel="noopener">Start</a>` : ''}</div></article>`;
  }).join('') : '<p class="empty">No live classes scheduled.</p>';
}

// ---------- My courses ----------
async function startTeacherCourses() {
  const { user, profile } = await initTeacher();
  const list = document.getElementById('list');
  let courses = [];
  async function load() {
    const { data, error } = await db.from('courses').select('*, enrollments(count)').eq('teacher_id', user.id).order('id');
    if (error) return say(friendly(error));
    courses = data;
    list.innerHTML = courses.length ? courses.map(c => `<article class="learn">
        <img src="${tImg(c)}" alt="">
        <div class="learn-body">
          <span class="meta">${esc(c.category || '')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''} · ${(c.enrollments && c.enrollments[0] ? c.enrollments[0].count : 0)} students</span>
          <h4>${esc(c.title)}</h4><p class="desc">${esc(c.description || '')}</p>
          <div class="row"><button class="pill pill-soft" data-edit="${c.id}">Edit details</button><a class="pill pill-live" href="teacher-course.html?id=${c.id}">Open</a></div>
        </div></article>`).join('')
      : '<div class="empty-box"><p>You haven’t created any courses yet.</p></div>';
  }
  const dlg = courseDialog(() => load());
  document.getElementById('new-course').addEventListener('click', () => dlg.open(null, { id: user.id, full_name: profile.full_name }));
  list.addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) dlg.open(courses.find(c => c.id === Number(b.dataset.edit)), { id: user.id, full_name: profile.full_name }); });
  load();
}

// ---------- One course: lessons, students, recordings ----------
async function startTeacherCourse() {
  const { user, profile } = await initTeacher();
  const id = Number(new URLSearchParams(location.search).get('id'));
  const { data: course } = await db.from('courses').select('*').eq('id', id).eq('teacher_id', user.id).maybeSingle();
  const hero = document.getElementById('hero');
  if (!course) { hero.innerHTML = '<p class="empty">This course could not be found, or it isn’t one of yours.</p>'; document.querySelector('.tabs').hidden = true; document.querySelectorAll('.tab-panel').forEach(p => p.hidden = true); return; }
  let c = course;
  const dlg = courseDialog(saved => { c = saved; drawHero(); });
  function drawHero() {
    document.title = c.title + ' – Think Nest';
    hero.innerHTML = `<img src="${tImg(c)}" alt=""><div><span class="meta">${esc(c.category || '')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''} · ${esc(c.level || '')}</span>
      <h1>${esc(c.title)}</h1><p>${esc(c.description || '')}</p>
      <div class="row start"><button class="pill pill-soft big" id="edit-course">Edit details</button><button class="pill pill-soft big danger" id="del-course">Delete course</button></div></div>`;
    document.getElementById('edit-course').addEventListener('click', () => dlg.open(c, { id: user.id, full_name: profile.full_name }));
    document.getElementById('del-course').addEventListener('click', async () => {
      if (!confirm('Delete “' + c.title + '”? Its lessons, live classes and recordings will be deleted too, and students will lose their progress.')) return;
      const { error } = await db.from('courses').delete().eq('id', c.id);
      if (error) return say(friendly(error));
      location.href = 'teacher-courses.html';
    });
  }
  drawHero();

  // tabs
  document.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === t));
    document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.id !== t.dataset.tab);
  }));

  // lessons
  let lessons = [];
  async function loadLessons() {
    const { data } = await db.from('lessons').select('*').eq('course_id', id).order('position');
    lessons = data || [];
    document.getElementById('lessons').innerHTML = lessons.length ? lessons.map((l, k) => `<div class="lesson">
        <b>${String(k + 1).padStart(2, '0')}</b><span class="lesson-title">${esc(l.title)}</span>
        ${l.video_url ? '<span class="tag">Video</span>' : ''}${l.resource_url ? '<span class="tag">Worksheet</span>' : ''}
        <button class="pill pill-soft" data-up="${l.id}" ${k === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="pill pill-soft" data-down="${l.id}" ${k === lessons.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button class="pill pill-soft" data-del-lesson="${l.id}">Delete</button></div>`).join('')
      : '<p class="empty">No lessons yet. Add the first one below.</p>';
  }
  loadLessons();
  const lf = document.getElementById('lesson-form');
  lf.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await db.from('lessons').insert({ course_id: id, position: lessons.length + 1, title: lf.title.value.trim(), video_url: lf.video_url.value.trim() || null, resource_url: lf.resource_url.value.trim() || null });
    if (error) return say(friendly(error));
    lf.reset(); say('Lesson added.'); loadLessons();
  });
  document.getElementById('lessons').addEventListener('click', async e => {
    const up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]'), del = e.target.closest('[data-del-lesson]');
    if (del) {
      if (!confirm('Delete this lesson?')) return;
      const { error } = await db.from('lessons').delete().eq('id', Number(del.dataset.delLesson));
      if (error) return say(friendly(error));
    } else if (up || down) {
      const k = lessons.findIndex(l => l.id === Number((up || down).dataset[up ? 'up' : 'down']));
      const j = up ? k - 1 : k + 1;
      [lessons[k], lessons[j]] = [lessons[j], lessons[k]];
    } else return;
    // save the new order
    const remaining = del ? lessons.filter(l => l.id !== Number(del.dataset.delLesson)) : lessons;
    await Promise.all(remaining.map((l, n) => db.from('lessons').update({ position: n + 1 }).eq('id', l.id)));
    loadLessons();
  });

  // students and certificates
  async function loadStudents() {
    const [en, certs] = await Promise.all([
      db.from('enrollments').select('*, profiles(full_name, grade)').eq('course_id', id).order('created_at'),
      db.from('certificates').select('user_id, title').eq('course_id', id)
    ]);
    const has = new Set((certs.data || []).map(x => x.user_id));
    const rows = en.data || [];
    document.getElementById('students').innerHTML = rows.length ? rows.map(r => `<tr>
        <td>${esc(r.profiles ? r.profiles.full_name : 'Student')}</td><td>${esc(r.profiles ? r.profiles.grade || '' : '')}</td>
        <td>${new Date(r.created_at).toLocaleDateString('en-GB')}</td>
        <td><div class="bar small"><i style="width:${r.progress}%"></i></div> ${r.progress}%</td>
        <td>${has.has(r.user_id) ? '<span class="tag tag-now">Issued</span>' : `<button class="pill pill-soft" data-cert="${r.user_id}" data-name="${esc(r.profiles ? r.profiles.full_name : 'this student')}">Issue</button>`}</td></tr>`).join('')
      : '<tr><td colspan="5" class="empty">No students have joined this course yet.</td></tr>';
  }
  loadStudents();
  const cdlg = document.getElementById('cert-dialog'), cf = document.getElementById('cert-form'), cerr = document.getElementById('cert-error');
  let certFor = null;
  document.getElementById('students').addEventListener('click', e => {
    const b = e.target.closest('[data-cert]'); if (!b) return;
    certFor = b.dataset.cert;
    document.getElementById('cert-title').textContent = 'Certificate for ' + b.dataset.name;
    cf.reset(); cf.title.value = 'Certificate of completion: ' + c.title; showError(cerr, ''); cdlg.showModal();
  });
  cf.addEventListener('submit', async e => {
    e.preventDefault(); showError(cerr, '');
    let file_path = null;
    const file = cf.file.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) return showError(cerr, 'The file must be smaller than 10 MB.');
      file_path = certFor + '/' + Date.now() + '-' + file.name.replace(/[^\w.\- ]+/g, '_');
      const up = await db.storage.from('certificates').upload(file_path, file);
      if (up.error) return showError(cerr, friendly(up.error));
    }
    const { error } = await db.from('certificates').insert({ user_id: certFor, course_id: id, title: cf.title.value.trim(), file_path, issued_by: user.id });
    if (error) return showError(cerr, friendly(error));
    cdlg.close(); say('Certificate issued. The student can see it in My Certificates.'); loadStudents();
  });

  // recordings
  async function loadRecs() {
    const { data } = await db.from('recordings').select('*').eq('course_id', id).order('recorded_at', { ascending: false });
    document.getElementById('recs').innerHTML = (data || []).length ? data.map(r => `<article class="panel rec-row">
        <h4>${esc(r.title)}</h4><span class="meta">${r.recorded_at ? new Date(r.recorded_at).toLocaleDateString('en-GB') : ''}</span>
        <div class="row"><a class="pill pill-soft" href="${esc(r.youtube_url)}" target="_blank" rel="noopener">Watch</a><button class="pill pill-soft" data-del-rec="${r.id}">Delete</button></div></article>`).join('')
      : '<p class="empty">No recordings yet.</p>';
  }
  loadRecs();
  const rf = document.getElementById('rec-form');
  rf.recorded_at.value = new Date().toISOString().slice(0, 10);
  rf.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await db.from('recordings').insert({ course_id: id, title: rf.title.value.trim(), youtube_url: rf.youtube_url.value.trim(), recorded_at: rf.recorded_at.value || null });
    if (error) return say(friendly(error));
    rf.reset(); rf.recorded_at.value = new Date().toISOString().slice(0, 10); say('Recording added.'); loadRecs();
  });
  document.getElementById('recs').addEventListener('click', async e => {
    const b = e.target.closest('[data-del-rec]'); if (!b || !confirm('Delete this recording?')) return;
    const { error } = await db.from('recordings').delete().eq('id', Number(b.dataset.delRec));
    if (error) return say(friendly(error));
    loadRecs();
  });
}

// ---------- Live classes ----------
async function startTeacherCalendar() {
  const { user } = await initTeacher();
  const f = document.getElementById('session-form'), err = document.getElementById('session-error');
  const { data: courses } = await db.from('courses').select('id, title').eq('teacher_id', user.id).order('title');
  if (!courses || !courses.length) {
    f.innerHTML = '<div class="empty-box"><p>Create a course first, then you can schedule live classes for it.</p><a class="btn btn-red" href="teacher-courses.html">Create a course</a></div>';
    document.getElementById('events').innerHTML = '';
    return;
  }
  f.course_id.innerHTML = courses.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
  f.date.min = new Date().toISOString().slice(0, 10);
  f.date.value = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const ids = courses.map(c => c.id);
  async function load() {
    const { data, error } = await db.from('sessions').select('*, courses(title)').in('course_id', ids).gte('starts_at', new Date(Date.now() - 86400000).toISOString()).order('starts_at');
    if (error) return say(friendly(error));
    document.getElementById('events').innerHTML = data.length ? data.map(s => {
      const [rel, live] = relative(s.starts_at);
      return `<article class="event"><div><h4>${esc(s.title)}</h4><span class="meta">${esc(s.courses ? s.courses.title : '')}${s.meeting_link ? '' : ' · no meeting link yet'}</span><span class="when">${esc(when(s.starts_at))}</span></div>
        <div class="event-actions"><span class="tag ${live ? 'tag-now' : ''}">${rel}</span>${s.meeting_link ? `<a class="pill pill-live" href="${esc(s.meeting_link)}" target="_blank" rel="noopener">Start</a>` : ''}<button class="pill pill-soft" data-del="${s.id}">Delete</button></div></article>`;
    }).join('') : '<p class="empty">No live classes scheduled yet.</p>';
  }
  load();
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    const start = new Date(f.date.value + 'T' + f.time.value);
    if (isNaN(start) || start < new Date()) return showError(err, 'Choose a date and time in the future.');
    const end = new Date(start.getTime() + Number(f.mins.value) * 60000);
    const { error } = await db.from('sessions').insert({ course_id: Number(f.course_id.value), title: f.title.value.trim(), starts_at: start.toISOString(), ends_at: end.toISOString(), meeting_link: f.meeting_link.value.trim() || null });
    if (error) return showError(err, friendly(error));
    f.title.value = ''; f.meeting_link.value = '';
    say('Live class added. Students will see it in their calendar.'); load();
  });
  document.getElementById('events').addEventListener('click', async e => {
    const b = e.target.closest('[data-del]'); if (!b || !confirm('Delete this live class?')) return;
    const { error } = await db.from('sessions').delete().eq('id', Number(b.dataset.del));
    if (error) return say(friendly(error));
    load();
  });
}
