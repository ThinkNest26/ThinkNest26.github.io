// ===== Think Nest teacher area =====
// Uses db, say(), friendly(), esc(), when(), relative(), showError(), PHOTOS from app.js

// Every teacher page: must be logged in AND approved as a teacher
async function initTeacher() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'teacher-login.html'; throw new Error('not logged in'); }
  const { data: p } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (p && p.role !== 'admin' && p.account_status === 'declined') { location.href = 'pending.html'; throw new Error('declined'); }
  if (!p || !['teacher', 'school_leader', 'admin'].includes(p.role)) {
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
  if (p.role === 'admin' && !document.querySelector('a[href="admin.html"]')) {
    const ul = document.querySelector('.side nav ul');
    ul.insertAdjacentHTML('afterbegin', '<li><a href="admin.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg><span>Approvals</span></a></li>');
  }
  document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  return { user: session.user, profile: p };
}


const T_OPTS = {
  grade_levels: ['Early years (KG)', 'Primary', 'Middle school', 'High school', 'All grades'],
  education_degree: ['Bachelor’s degree', 'Master’s degree', 'PhD', 'Teaching diploma', 'Other'],
  teaching_method: ['Online', 'In person', 'Both'],
  curriculum: ['British Curriculum (England / IGCSE)', 'American Curriculum', 'International Baccalaureate (IB)', 'Montessori', 'UAE MOE', 'Other']
};
function fillSelect(sel, list, value) {
  if (!sel) return;
  sel.innerHTML = '<option value="">Select</option>' + list.map(o => `<option${o === value ? ' selected' : ''}>${o}</option>`).join('');
}

function tImg(c) { return c.image_url ? esc(c.image_url) : 'images/' + PHOTOS[c.id % PHOTOS.length] + '.png'; }

// ---------- Teacher sign up (request) ----------
function startTeacherSignup() {
  const f = document.getElementById('tsignup-form'), err = document.getElementById('tsignup-error');
  Object.keys(T_OPTS).forEach(k => fillSelect(f[k], T_OPTS[k]));
  const schoolName = f.querySelector('.school-name');
  f.school_pick.addEventListener('change', () => { schoolName.hidden = f.school_pick.value !== 'A school'; });
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    for (const el of f.querySelectorAll('input[required], select[required]')) {
      if (!el.checkValidity()) { el.focus(); return showError(err, el.type === 'password' ? 'Choose a password with at least 8 characters.' : el.type === 'email' ? 'Enter a valid email address.' : 'Please fill in every required box.'); }
    }
    const school = f.school_pick.value === 'A school' ? f.school.value.trim() : f.school_pick.value;
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    if (f.agree_terms && !f.agree_terms.checked) { btn.disabled = false; btn.textContent = 'Send request'; return showError(err, 'Please tick the box to agree to the Terms of use.'); }
    if (!f.querySelector('input[name=also_parent]:checked')) { document.getElementById('parent-q').scrollIntoView({ behavior: 'smooth', block: 'center' }); btn.disabled = false; btn.textContent = 'Send request'; return showError(err, 'Please answer: are you also a parent at Think Nest?'); }
    const { data: su, error } = await db.auth.signUp({
      email: f.email.value.trim(), password: f.password.value,
      options: { data: { role: 'teacher', full_name: f.full_name.value.trim(), subject: f.subject.value.trim(), school, phone: f.phone.value.trim(),
        grade_levels: f.grade_levels.value, education_degree: f.education_degree.value, teaching_method: f.teaching_method.value,
        curriculum: f.curriculum.value, experience_years: f.experience_years.value, bio: f.bio.value.trim(), also_parent: (f.querySelector('input[name=also_parent]:checked') || {}).value === 'yes', agreed_terms: true } }
    });
    btn.disabled = false; btn.textContent = 'Send request';
    if (error) return showError(err, friendly(error));
    if (alreadyRegistered(su)) return showError(err, ALREADY_MSG);
    emailAdmin('New teacher account waiting for approval', { Name: (f.full_name ? f.full_name.value.trim() : ''), Email: f.email.value.trim(), Account: 'Teacher' + ((f.querySelector('input[name=also_parent]:checked') || {}).value === 'yes' ? ' (also a parent)' : ''), Subject: (f.subject ? f.subject.value : ''), 'What to do': 'Log in as admin and open Approvals → Teachers to approve.' });
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
                  weeks: f.weeks.value ? Number(f.weeks.value) : null, image_url: f.image_url.value.trim() || null,
                  curriculum: f.curriculum ? f.curriculum.value || null : null, audience: f.audience ? f.audience.value || 'students' : 'students', format: f.format ? f.format.value.trim() || null : null, grade: f.grade ? f.grade.value || null : null, subject: f.subject ? f.subject.value.trim() || null : null };
    const forStudents = !f.audience || f.audience.value === 'students';
    if (!forStudents && !f.category.value) return showError(err, 'Choose a hub topic.');
    if (forStudents && f.subject && !row.subject) return showError(err, 'Choose a subject.');
    if (forStudents && f.curriculum && !row.curriculum) return showError(err, 'Choose a curriculum.');
    if (forStudents && f.grade && !row.grade) return showError(err, 'Choose a grade.');
    if (!row.title) return showError(err, 'Give the course a name.');
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
      if (course) ['title', 'description', 'category', 'level', 'weeks', 'image_url', 'curriculum', 'grade', 'subject', 'audience', 'format'].forEach(k => { if (f[k]) f[k].value = course[k] ?? ''; });
      showError(err, ''); dlg.showModal();
      if (typeof syncCourseForm === 'function') syncCourseForm(course);
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
  const { data: myMentor } = await db.from('mentors').select('id').eq('teacher_id', user.id).maybeSingle();
  if (myMentor) {
    const { data: pend } = await db.from('bookings').select('id').eq('mentor_id', myMentor.id).eq('status', 'pending');
    const n = (pend || []).length;
    if (n) document.getElementById('req-box').innerHTML = `<a class="panel req-banner" href="teacher-requests.html"><span class="req-ic" aria-hidden="true">🙋</span><span><b>${n} session request${n === 1 ? '' : 's'}</b> waiting for your answer</span><span class="pill pill-live">Review →</span></a>`;
  }
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
  const dlg = courseDialog(saved => { c = saved; drawHero(); if (builder) builder.setCourse(c); });
  let builder = null;
  function drawHero() {
    document.title = c.title + ' – Think Nest';
    const cur = { british: 'British Curriculum', ib: 'IB', american: 'American Curriculum' }[c.curriculum] || '';
    hero.innerHTML = `<img src="${tImg(c)}" alt=""><div><span class="meta">${esc([cur, c.grade, c.subject].filter(Boolean).join(' · ') || 'Set the curriculum, grade and subject in Edit details')}</span><span class="meta">${esc(c.category || '')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''} · ${esc(c.level || '')}</span>
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
  let attDone = false;
  document.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === t));
    document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.id !== t.dataset.tab);
    if (t.dataset.tab === 't-att' && !attDone && typeof attendancePanel === 'function') { attDone = true; attendancePanel(document.getElementById('att-host'), { cid: id }); }
  }));
  if (location.hash === '#attendance') { const at = document.querySelector('[data-tab="t-att"]'); if (at) at.click(); }

  // lessons
  let lessons = [];
  async function loadLessons() {
    const { data } = await db.from('lessons').select('*').eq('course_id', id).order('position');
    lessons = data || [];
    document.getElementById('lessons').innerHTML = lessons.length ? lessons.map((l, k) => `<div class="lesson">
        <b>${String(k + 1).padStart(2, '0')}</b><span class="lesson-title" id="lesson-${l.id}">${esc(l.title)}${l.objective_text ? `<span class="meta lesson-obj">🎯 ${esc(l.objective_text)}</span>` : ''}</span>
        ${l.video_url ? '<span class="tag">Video</span>' : ''}${l.resource_url ? '<span class="tag">Link</span>' : ''}${l.material_kind ? `<span class="tag tag-kind">${{ worksheet: '📝 Worksheet', test: '✅ Test', activities: '🧩 Activities' }[l.material_kind]}</span>` : ''}
        ${l.material_kind && l.material_kind !== 'activities' ? `<button class="pill pill-live" data-results="${l.id}">Results</button>` : ''}
        <button class="pill pill-soft" data-up="${l.id}" ${k === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="pill pill-soft" data-down="${l.id}" ${k === lessons.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button class="pill pill-soft" data-del-lesson="${l.id}">Delete</button></div>`).join('')
      : '<p class="empty">No lessons yet. Add the first one below.</p>';
    if (typeof loadTeacherItems === 'function') loadTeacherItems(lessons, c);
  }
  await loadLessons();
  const lf = document.getElementById('lesson-form');
  if (typeof initLessonBuilder === 'function' && document.getElementById('lesson-extra')) builder = initLessonBuilder(c);
  lf.addEventListener('submit', async e => {
    e.preventDefault();
    if (!lf.title.value.trim()) return say('Give the lesson a title.');
    const extra = builder ? builder.payload() : { objective_id: null, objective_text: null, material_kind: null, material: null, key: null };
    if (!extra) return;
    const btn = lf.querySelector(':scope > button.btn-red'); if (btn) btn.disabled = true;
    const { data: nl, error } = await db.from('lessons').insert({ course_id: id, position: lessons.length + 1, title: lf.title.value.trim(), video_url: lf.video_url.value.trim() || null, resource_url: lf.resource_url.value.trim() || null,
      objective_id: extra.objective_id, objective_text: extra.objective_text, material_kind: extra.material_kind, material: extra.material }).select().single();
    if (!error && extra.key) { const r = await db.from('lesson_keys').upsert({ lesson_id: nl.id, answers: extra.key }); if (r.error) say(friendly(r.error)); }
    if (btn) btn.disabled = false;
    if (error) return say(friendly(error));
    lf.reset(); if (builder) builder.reset(); say('Lesson added. Students in this course can see it now.'); loadLessons();
  });
  const hm = location.hash.match(/^#lesson-(\d+)$/);
  if (hm) { const l = lessons.find(x => x.id === Number(hm[1])); if (l && l.material_kind && l.material_kind !== 'activities') showLessonResults(l); }
  document.getElementById('lessons').addEventListener('click', async e => {
    const up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]'), del = e.target.closest('[data-del-lesson]'), res = e.target.closest('[data-results]');
    if (res) return showLessonResults(lessons.find(l => l.id === Number(res.dataset.results)));
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
        <td><a class="pill pill-live" href="teacher-certificates.html?course=${id}&student=${r.user_id}">🏅 Award</a> ${has.has(r.user_id) ? '<span class="tag tag-now">Issued</span>' : `<button class="pill pill-soft" data-cert="${r.user_id}" data-name="${esc(r.profiles ? r.profiles.full_name : 'this student')}">Issue</button>`}</td></tr>`).join('')
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


// ---------- Admin: teacher approvals ----------
async function startAdmin() {
  const { profile } = await initTeacher();
  if (profile.role !== 'admin') { location.href = 'teacher-dashboard.html'; return; }
  const person = (p, buttons) => `<article class="panel person">
      <span class="initials">${esc((p.full_name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
      <div class="person-info"><h4>${esc(p.full_name || 'No name given')}</h4>
        <span class="meta">${[p.subject && 'Teaches ' + p.subject, p.school, p.phone].filter(Boolean).map(esc).join(' · ') || 'No details given'}</span>
        <span class="meta">${[p.grade_levels, p.curriculum, p.education_degree, p.teaching_method, p.experience_years != null ? p.experience_years + ' years’ experience' : ''].filter(Boolean).map(esc).join(' · ')}</span>${p.bio ? `<span class="meta bio">${esc(p.bio)}</span>` : ''}<span class="meta">Requested ${new Date(p.created_at).toLocaleDateString('en-GB')}</span></div>
      <div class="person-actions">${buttons}</div></article>`;
  async function load() {
    const [all, cs, en] = await Promise.all([
      db.from('profiles').select('*').order('created_at', { ascending: false }),
      db.from('courses').select('id', { count: 'exact', head: true }),
      db.from('enrollments').select('id', { count: 'exact', head: true })
    ]);
    if (all.error) return say(friendly(all.error));
    const ps = all.data;
    const pending = ps.filter(p => ['student', 'parent'].includes(p.role) && p.requested_role === 'teacher');
    const teachers = ps.filter(p => p.role === 'teacher' || p.role === 'school_leader');
    const declined = ps.filter(p => p.role === 'student' && ['declined', 'removed'].includes(p.requested_role));
    document.getElementById('n-pending').textContent = pending.length;
    document.getElementById('n-teachers').textContent = teachers.length;
    document.getElementById('n-declined').textContent = declined.length;
    document.getElementById('pending').innerHTML = pending.length ? pending.map(p => person(p,
      `<button class="pill pill-live" data-act="approve_teacher" data-id="${p.id}">Approve</button><button class="pill pill-soft danger" data-act="decline_teacher" data-id="${p.id}" data-name="${esc(p.full_name || '')}">Decline</button>`)).join('')
      : '<p class="empty">No requests waiting. 🎉</p>';
    document.getElementById('teachers').innerHTML = teachers.length ? teachers.map(p => person(p,
      `<span class="tag tag-now">Teacher</span><button class="pill pill-soft danger" data-act="remove_teacher" data-id="${p.id}" data-name="${esc(p.full_name || '')}">Remove</button>`)).join('')
      : '<p class="empty">No approved teachers yet.</p>';
    document.getElementById('declined').innerHTML = declined.length ? declined.map(p => person(p,
      `<span class="tag">${p.requested_role === 'removed' ? 'Removed' : 'Declined'}</span><button class="pill pill-soft" data-act="approve_teacher" data-id="${p.id}">Approve instead</button>`)).join('')
      : '<p class="empty">Nobody here.</p>';
    document.getElementById('st-students').textContent = ps.filter(p => p.role === 'student' && !p.requested_role).length;
    document.getElementById('st-teachers').textContent = teachers.length;
    document.getElementById('st-courses').textContent = cs.count ?? 0;
    document.getElementById('st-enrol').textContent = en.count ?? 0;
  }
  load();
  document.querySelector('main').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'decline_teacher' && !confirm('Decline ' + (b.dataset.name || 'this request') + '? They keep a normal student account.')) return;
    if (act === 'remove_teacher' && !confirm('Remove ' + (b.dataset.name || 'this teacher') + ' as a teacher? They will no longer see the teacher area or their students. Their courses stay on the site.')) return;
    b.disabled = true;
    const { error } = await db.rpc(act, { person: b.dataset.id });
    if (error) { b.disabled = false; return say(friendly(error)); }
    say(act === 'approve_teacher' ? 'Approved! They can now log in to the teacher area.' : act === 'decline_teacher' ? 'Request declined.' : 'Teacher removed.');
    load();
  });
}


// ---------- Session requests ----------
async function startTeacherRequests() {
  const { user } = await initTeacher();
  const { data: m } = await db.from('mentors').select('*').eq('teacher_id', user.id).maybeSingle();
  if (!m) {
    document.getElementById('mentor-off').innerHTML = '<div class="empty-box"><p>Students can’t request sessions with you yet. Switch on <b>Mentor sessions</b> in Account Settings.</p><a class="btn btn-red" href="teacher-settings.html">Open Account Settings</a></div>';
    document.getElementById('pending').innerHTML = ''; return;
  }
  async function load() {
    const { data, error } = await db.from('bookings').select('*, profiles(full_name, grade, curriculum)').eq('mentor_id', m.id).in('status', ['pending', 'accepted']).gte('starts_at', new Date(Date.now() - 3600000).toISOString()).order('starts_at');
    if (error) return say(friendly(error));
    const pend = data.filter(b => b.status === 'pending'), acc = data.filter(b => b.status === 'accepted');
    document.getElementById('n-pend').textContent = pend.length;
    const nm = b => b.profiles ? b.profiles.full_name : 'A student';
    document.getElementById('pending').innerHTML = pend.length ? pend.map(b => `<article class="panel person">
        <span class="initials">${esc((nm(b) || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
        <div class="person-info"><h4>${esc(nm(b))} has requested a session with you</h4>
          <span class="meta">${esc(when(b.starts_at))}${b.profiles && b.profiles.grade ? ' · ' + esc(b.profiles.grade) : ''}</span>
          ${b.note ? `<span class="meta">“${esc(b.note)}”</span>` : ''}</div>
        <div class="person-actions"><button class="pill pill-live" data-ans="1" data-id="${b.id}">Accept</button><button class="pill pill-soft danger" data-ans="0" data-id="${b.id}">Reject</button></div></article>`).join('')
      : '<p class="empty">No requests waiting.</p>';
    document.getElementById('accepted').innerHTML = acc.length ? acc.map(b => {
      const [rel, live] = relative(b.starts_at);
      return `<article class="event ev-book"><div><h4>Session with ${esc(nm(b))}</h4><span class="meta">${esc(b.note || '')}</span><span class="when">${esc(when(b.starts_at))}</span></div>
        <div class="event-actions"><span class="tag ${live ? 'tag-now' : ''}">${rel}</span>${m.meeting_link ? `<a class="pill pill-live" href="${esc(m.meeting_link)}" target="_blank" rel="noopener">Start</a>` : ''}</div></article>`;
    }).join('') : '<p class="empty">No accepted sessions coming up.</p>';
  }
  load();
  document.getElementById('pending').addEventListener('click', async e => {
    const b = e.target.closest('[data-ans]'); if (!b) return;
    b.parentElement.querySelectorAll('button').forEach(x => x.disabled = true);
    const { error } = await db.rpc('answer_booking', { bid: Number(b.dataset.id), ok: b.dataset.ans === '1' });
    if (error) { b.parentElement.querySelectorAll('button').forEach(x => x.disabled = false); return say(friendly(error)); }
    say(b.dataset.ans === '1' ? 'Accepted. It’s now in the student’s calendar.' : 'Request rejected.'); load();
  });
}

// ---------- Teacher account settings ----------
async function startTeacherSettings() {
  const { user, profile: p } = await initTeacher();
  const f = document.getElementById('tprofile-form');
  Object.keys(T_OPTS).forEach(k => fillSelect(f[k], T_OPTS[k], p[k] || ''));
  ['full_name', 'subject', 'phone', 'school', 'experience_years', 'bio'].forEach(k => { f[k].value = p[k] ?? ''; });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const row = {}; ['full_name', 'subject', 'phone', 'school', 'bio', 'grade_levels', 'education_degree', 'teaching_method', 'curriculum'].forEach(k => row[k] = f[k].value.trim() || null);
    row.experience_years = f.experience_years.value ? Number(f.experience_years.value) : null;
    const { error } = await db.from('profiles').update(row).eq('id', user.id);
    say(error ? friendly(error) : 'Your profile is saved.');
  });

  const mf = document.getElementById('mentor-form');
  let { data: m } = await db.from('mentors').select('*').eq('teacher_id', user.id).maybeSingle();
  mf.on.checked = !!m;
  mf.subject.value = m ? m.subject || '' : (p.subject || '');
  mf.bio.value = m ? m.bio || '' : '';
  mf.meeting_link.value = m ? m.meeting_link || '' : '';
  mf.addEventListener('submit', async e => {
    e.preventDefault();
    if (!mf.on.checked) {
      if (m) {
        if (!confirm('Stop offering mentor sessions? Students will no longer see you in Mentors.')) return;
        const { error } = await db.from('mentors').delete().eq('id', m.id);
        if (error) return say(friendly(error));
        m = null;
      }
      return say('Mentor sessions are switched off.');
    }
    const row = { name: p.full_name || 'Teacher', subject: mf.subject.value.trim() || null, bio: mf.bio.value.trim() || null, meeting_link: mf.meeting_link.value.trim() || null, teacher_id: user.id };
    const res = m ? await db.from('mentors').update(row).eq('id', m.id).select().single() : await db.from('mentors').insert(row).select().single();
    if (res.error) return say(friendly(res.error));
    m = res.data; say('Mentor settings saved. Students can now request sessions with you.');
  });

  const pf = document.getElementById('pw-form'), err = document.getElementById('pw-error');
  pf.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    if (pf.password.value.length < 8) return showError(err, 'Choose a password with at least 8 characters.');
    if (pf.password.value !== pf.password2.value) return showError(err, 'The two passwords don’t match.');
    const { error } = await db.auth.updateUser({ password: pf.password.value });
    if (error) return showError(err, friendly(error));
    pf.reset(); say('Your password has been changed.');
  });
}
