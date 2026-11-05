// ===== Think Nest student area: the working sections =====
// Uses db, say(), soon(), friendly(), esc(), when(), relative(), PHOTOS from app.js

const MAX_FILE_MB = 10;

// Every student page: check log in, set up menu, initials and log out
async function initShell() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'login.html'; throw new Error('not logged in'); }
  document.body.classList.remove('loading');
  const side = document.getElementById('side'), shade = document.getElementById('side-shade'), st = document.getElementById('side-toggle');
  st.addEventListener('click', () => { side.classList.add('open'); shade.classList.add('show'); });
  shade.addEventListener('click', () => { side.classList.remove('open'); shade.classList.remove('show'); });
  document.getElementById('logout').addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  const { data: p } = await db.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  gateApproval(p);
  const initials = ((p && p.full_name) || session.user.email).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const small = document.getElementById('me-initials-small'); if (small) small.textContent = initials;
  return { user: session.user, profile: p || {} };
}

function courseImg(c, k) { return c.image_url ? esc(c.image_url) : 'images/' + PHOTOS[(c.id ?? k) % PHOTOS.length] + '.png'; }

function courseCard(c, e, k) {
  return `<article class="learn">
    <img src="${courseImg(c, k)}" alt="">
    <div class="learn-body">
      <span class="meta">${esc(c.category || '')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''}${c.level ? ' · ' + esc(c.level) : ''}</span>
      <h4>${esc(c.title)}</h4>
      <p class="desc">${esc(c.description || '')}</p>
      ${e ? `<div class="bar"><i style="width:${e.progress}%"></i></div>
             <div class="row"><a class="pill pill-live" href="course.html?id=${c.id}">Continue</a><span class="done">${e.progress}% completed</span></div>`
          : `<div class="row"><a class="pill pill-soft" href="course.html?id=${c.id}">View</a><button class="pill pill-live" data-join="${c.id}">Join course</button></div>`}
    </div></article>`;
}

async function joinCourse(uid, courseId) {
  const { data, error } = await db.from('enrollments').insert({ user_id: uid, course_id: courseId }).select().single();
  if (error && !String(error.message).includes('duplicate')) { say(friendly(error)); return null; }
  say('You’ve joined the course!');
  return data;
}

// ---------- My courses ----------
async function startMyCourses() {
  const { user } = await initShell();
  const { data, error } = await db.from('enrollments').select('*, courses(*)').eq('user_id', user.id).order('created_at');
  if (error) return say(friendly(error));
  const list = document.getElementById('list');
  list.innerHTML = data.length ? data.map((e, k) => courseCard(e.courses, e, k)).join('')
    : '<div class="empty-box"><p>You haven’t joined any courses yet.</p><a class="btn btn-red" href="all-courses.html">Browse all courses</a></div>';
}

// ---------- All courses ----------
async function startAllCourses() {
  const { user, profile } = await initShell();
  const forWho = new URLSearchParams(location.search).get('for') || ({ teacher: 'teachers', school_leader: 'teachers', parent: 'parents' }[profile && profile.role] || 'students');
  const [cs, en] = await Promise.all([
    db.from('courses').select('*').order('id'),
    db.from('enrollments').select('*').eq('user_id', user.id)
  ]);
  if (cs.error) return say(friendly(cs.error));
  const mine = en.data || [];
  const list = document.getElementById('list');
  const q = document.getElementById('q');
  q.value = new URLSearchParams(location.search).get('q') || '';
  function render() {
    const term = q.value.trim().toLowerCase();
    const shown = cs.data.filter(c => (c.audience || 'students') === forWho).filter(c => !term || [c.title, c.description, c.category, c.teacher_name].join(' ').toLowerCase().includes(term));
    list.innerHTML = shown.length ? shown.map((c, k) => courseCard(c, mine.find(e => e.course_id === c.id), k)).join('')
      : '<p class="empty">No courses match your search.</p>';
  }
  render();
  q.addEventListener('input', render);
  list.addEventListener('click', async e => {
    const b = e.target.closest('[data-join]'); if (!b) return;
    b.disabled = true; b.textContent = 'Joining…';
    const row = await joinCourse(user.id, Number(b.dataset.join));
    if (row) mine.push(row);
    render();
  });
}

// ---------- One course: lessons and progress ----------
async function startCourse() {
  const { user } = await initShell();
  const id = Number(new URLSearchParams(location.search).get('id'));
  const [c, ls, en, done, recs] = await Promise.all([
    db.from('courses').select('*').eq('id', id).maybeSingle(),
    db.from('lessons').select('*').eq('course_id', id).order('position'),
    db.from('enrollments').select('*').eq('user_id', user.id).eq('course_id', id).maybeSingle(),
    db.from('lesson_progress').select('lesson_id').eq('user_id', user.id),
    db.from('recordings').select('*').eq('course_id', id).order('recorded_at', { ascending: false })
  ]);
  const hero = document.getElementById('course-hero');
  if (!c.data) { hero.innerHTML = '<p class="empty">This course could not be found.</p>'; return; }
  const course = c.data;
  let enrol = en.data;
  const doneIds = new Set((done.data || []).map(d => d.lesson_id));
  const lessons = ls.data || [];
  document.title = course.title + ' – Think Nest';

  function drawHero() {
    hero.innerHTML = `<img src="${courseImg(course, 0)}" alt="">
      <div><span class="meta">${esc(course.category || '')}${course.weeks ? ' · ' + course.weeks + ' weeks' : ''}${course.level ? ' · ' + esc(course.level) : ''}</span>
      <h1>${esc(course.title)}</h1><p>${esc(course.description || '')}</p>
      ${course.teacher_name ? `<p class="by">By ${esc(course.teacher_name)}</p>` : ''}
      ${enrol ? `<div class="bar"><i style="width:${enrol.progress}%"></i></div><p class="done">${enrol.progress}% completed</p>`
              : `<button class="btn btn-red" id="join">Join course</button>`}</div>`;
    const j = document.getElementById('join');
    if (j) j.addEventListener('click', async () => { j.disabled = true; const r = await joinCourse(user.id, id); if (r) { enrol = r; drawHero(); drawLessons(); } else j.disabled = false; });
  }
  function drawLessons() {
    const box = document.getElementById('lessons');
    if (!lessons.length) { box.innerHTML = '<p class="empty">Lessons for this course will be added soon.</p>'; return; }
    box.innerHTML = lessons.map(l => `<div class="lesson ${doneIds.has(l.id) ? 'is-done' : ''}">
        <b>${String(l.position).padStart(2, '0')}</b>
        <span class="lesson-title" id="lesson-${l.id}">${esc(l.title)}${l.objective_text ? `<span class="meta lesson-obj">🎯 ${esc(l.objective_text)}</span>` : ''}</span>
        ${l.video_url ? `<a href="${esc(l.video_url)}" target="_blank" rel="noopener" class="pill pill-soft">Watch</a>` : ''}
        ${l.resource_url ? `<a href="${esc(l.resource_url)}" target="_blank" rel="noopener" class="pill pill-soft">Link</a>` : ''}
        ${l.material_kind ? `<button class="pill pill-live" data-open-lesson="${l.id}" data-label="${{ worksheet: '📝 Open worksheet', test: '✅ Open test', activities: '🧩 Open activities' }[l.material_kind]}">${{ worksheet: '📝 Open worksheet', test: '✅ Open test', activities: '🧩 Open activities' }[l.material_kind]}</button>` : ''}
        ${enrol ? `<label class="tick"><input type="checkbox" data-lesson="${l.id}" ${doneIds.has(l.id) ? 'checked' : ''}> Done</label>` : ''}
      </div>${l.material_kind ? `<div class="lesson-material panel" id="lm-${l.id}" hidden></div>` : ''}`).join('');
  }
  drawHero(); drawLessons();
  if (enrol && typeof studentAttendance === 'function') studentAttendance(id, 'my-att');
  if (typeof initStudentLessons === 'function') {
    await initStudentLessons(lessons, id, () => !!enrol, async lid => {
      if (doneIds.has(lid)) return;
      doneIds.add(lid);
      const cb = document.querySelector(`[data-lesson="${lid}"]`); if (cb) cb.checked = true;
      const progress = Math.round(lessons.filter(l => doneIds.has(l.id)).length / lessons.length * 100);
      const up = await db.from('enrollments').update({ progress }).eq('id', enrol.id).select().single();
      if (!up.error) { enrol = up.data; drawHero(); }
    });
    const hm = location.hash.match(/^#lesson-(\d+)$/);
    if (hm) { const b = document.querySelector(`[data-open-lesson="${hm[1]}"]`); if (b) { b.click(); b.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  }
  if (typeof initStudentItems === 'function') {
    await initStudentItems(lessons, () => !!enrol, async lid => {
      if (doneIds.has(lid)) return;
      doneIds.add(lid);
      const cb = document.querySelector(`[data-lesson="${lid}"]`); if (cb) cb.checked = true;
      const progress = Math.round(lessons.filter(l => doneIds.has(l.id)).length / lessons.length * 100);
      const up = await db.from('enrollments').update({ progress }).eq('id', enrol.id).select().single();
      if (!up.error) { enrol = up.data; drawHero(); }
    });
  }

  document.getElementById('lessons').addEventListener('change', async e => {
    const box = e.target.closest('[data-lesson]'); if (!box) return;
    const lid = Number(box.dataset.lesson);
    const res = box.checked
      ? await db.from('lesson_progress').insert({ user_id: user.id, lesson_id: lid })
      : await db.from('lesson_progress').delete().eq('user_id', user.id).eq('lesson_id', lid);
    if (res.error) { box.checked = !box.checked; return say(friendly(res.error)); }
    box.checked ? doneIds.add(lid) : doneIds.delete(lid);
    const progress = Math.round(lessons.filter(l => doneIds.has(l.id)).length / lessons.length * 100);
    const up = await db.from('enrollments').update({ progress }).eq('id', enrol.id).select().single();
    if (!up.error) enrol = up.data;
    drawHero(); drawLessons(); if (window._drawItems) window._drawItems();
    if (progress === 100) say('Well done! You’ve finished this course. 🎉');
  });

  const rb = document.getElementById('course-recs');
  rb.innerHTML = (recs.data || []).length ? recs.data.map(recCard).join('') : '<p class="empty">No recordings yet.</p>';
}

// ---------- Calendar ----------
async function startCalendar() {
  const { user } = await initShell();
  const [ses, bk] = await Promise.all([
    db.from('sessions').select('*, courses(title), mentors(name)').order('starts_at'),
    db.from('bookings').select('*, mentors(name, meeting_link)').eq('user_id', user.id).in('status', ['booked', 'pending', 'accepted', 'rejected']).order('starts_at')
  ]);
  if (ses.error) say(friendly(ses.error));
  const events = [
    ...(ses.data || []).map(s => ({ kind: 'class', at: new Date(s.starts_at), title: s.title, sub: [s.courses && s.courses.title, s.mentors && 'with ' + s.mentors.name].filter(Boolean).join(' · '), link: s.meeting_link })),
    ...(bk.data || []).map(b => ({ kind: 'book', id: b.id, status: b.status, at: new Date(b.starts_at), title: 'Mentor session with ' + (b.mentors ? b.mentors.name : 'your mentor'), sub: [b.status === 'pending' ? 'Waiting for the mentor to accept' : b.status === 'rejected' ? 'The mentor couldn’t take this session' : '', b.note || ''].filter(Boolean).join(' · '), link: b.status === 'pending' || b.status === 'rejected' ? null : b.mentors && b.mentors.meeting_link }))
  ].sort((a, b) => a.at - b.at);

  const dayKey = d => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  let month = new Date(); month.setDate(1);
  let picked = null;

  function drawMonth() {
    document.getElementById('month-title').textContent = month.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    const grid = document.getElementById('cal-grid');
    const firstDay = (month.getDay() + 6) % 7; // Monday first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const today = dayKey(new Date());
    let html = '<span></span>'.repeat(firstDay);
    for (let d = 1; d <= days; d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const k = dayKey(date);
      const evs = events.filter(e => dayKey(e.at) === k);
      html += `<button class="cal-day ${k === today ? 'today' : ''} ${picked === k ? 'picked' : ''}" data-day="${k}" aria-label="${date.toDateString()}${evs.length ? ', ' + evs.length + ' events' : ''}">
        <span>${d}</span><em>${evs.map(e => `<i class="dot dot-${e.kind}"></i>`).join('')}</em></button>`;
    }
    grid.innerHTML = html;
  }
  function drawList() {
    const box = document.getElementById('events');
    let shown, title;
    if (picked) {
      shown = events.filter(e => dayKey(e.at) === picked);
      title = shown[0] ? shown[0].at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Nothing on this day';
    } else {
      shown = events.filter(e => e.at > Date.now() - 3600000).slice(0, 10);
      title = 'Coming up';
    }
    document.getElementById('day-title').textContent = title;
    box.innerHTML = shown.length ? shown.map(e => {
      const [rel, live] = relative(e.at);
      return `<article class="event ev-${e.kind}">
        <div><h4>${esc(e.title)}</h4><span class="meta">${esc(e.sub)}</span><span class="when">${esc(when(e.at))}</span></div>
        <div class="event-actions"><span class="tag ${live ? 'tag-now' : ''}">${rel}</span>
        ${e.link ? `<a class="pill pill-live" href="${esc(e.link)}" target="_blank" rel="noopener">Join</a>` : ''}
        ${e.status === 'pending' ? '<span class="tag tag-wait">Waiting</span>' : e.status === 'rejected' ? '<span class="tag">Declined</span>' : ''}${e.kind === 'book' && e.at > Date.now() && e.status !== 'rejected' ? `<button class="pill pill-soft" data-cancel="${e.id}">Cancel</button>` : ''}</div>
      </article>`;
    }).join('') : `<div class="empty-box"><p>${picked ? 'No classes or bookings on this day.' : 'Nothing booked yet.'}</p><a class="btn btn-red" href="mentors.html">Book a mentor session</a></div>`;
  }
  drawMonth(); drawList();
  document.getElementById('prev-month').addEventListener('click', () => { month.setMonth(month.getMonth() - 1); drawMonth(); });
  document.getElementById('next-month').addEventListener('click', () => { month.setMonth(month.getMonth() + 1); drawMonth(); });
  document.getElementById('cal-grid').addEventListener('click', e => {
    const b = e.target.closest('[data-day]'); if (!b) return;
    picked = picked === b.dataset.day ? null : b.dataset.day;
    drawMonth(); drawList();
  });
  document.getElementById('events').addEventListener('click', async e => {
    const b = e.target.closest('[data-cancel]'); if (!b) return;
    if (!confirm('Cancel this mentor session?')) return;
    const { error } = await db.rpc('cancel_booking', { bid: Number(b.dataset.cancel) });
    if (error) return say(friendly(error));
    const i = events.findIndex(x => x.kind === 'book' && x.id === Number(b.dataset.cancel));
    events.splice(i, 1); drawMonth(); drawList(); say('Booking cancelled.');
  });
}

// ---------- Mentors and booking ----------
async function startMentors() {
  const { user } = await initShell();
  const { data, error } = await db.from('mentors').select('*').order('id');
  if (error) return say(friendly(error));
  const list = document.getElementById('list');
  list.innerHTML = data.length ? data.map(m => `<article class="mentor big" id="m${m.id}">
      <div class="mentor-top"><img src="${m.photo_url ? esc(m.photo_url) : 'images/tn-demo-mentor.png'}" alt=""><div><h4>${esc(m.name)}</h4><span>${esc(m.subject || '')}</span></div></div>
      <p class="desc">${esc(m.bio || '')}</p>
      <button class="btn btn-red btn-small" data-book="${m.id}" data-name="${esc(m.name)}">Book a session</button>
    </article>`).join('') : '<p class="empty">Mentors will appear here soon.</p>';

  const dlg = document.getElementById('book-dialog'), form = document.getElementById('book-form'), err = document.getElementById('book-error');
  let mentorId = null;
  function open(id, name) {
    mentorId = id;
    document.getElementById('book-title').textContent = 'Book a session with ' + name;
    const t = new Date(Date.now() + 86400000);
    form.date.min = new Date().toISOString().slice(0, 10);
    form.date.value = t.toISOString().slice(0, 10);
    form.time.value = '16:00';
    form.note.value = '';
    showError(err, '');
    dlg.showModal();
  }
  list.addEventListener('click', e => { const b = e.target.closest('[data-book]'); if (b) open(Number(b.dataset.book), b.dataset.name); });
  const fromHash = location.hash.match(/^#m(\d+)$/);
  if (fromHash) { const b = list.querySelector(`[data-book="${fromHash[1]}"]`); if (b) open(Number(fromHash[1]), b.dataset.name); }
  document.getElementById('book-cancel').addEventListener('click', () => dlg.close());
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const at = new Date(form.date.value + 'T' + form.time.value);
    if (isNaN(at) || at < new Date()) return showError(err, 'Choose a date and time in the future.');
    const save = document.getElementById('book-save'); save.disabled = true; save.textContent = 'Booking…';
    const { data: nb, error } = await db.from('bookings').insert({ user_id: user.id, mentor_id: mentorId, starts_at: at.toISOString(), note: form.note.value.trim() || null }).select().single();
    save.disabled = false; save.textContent = 'Book session';
    if (error) return showError(err, friendly(error));
    dlg.close();
    say(nb && nb.status === 'pending' ? 'Request sent for ' + when(at) + '. You’ll see it in My Calendar once your mentor accepts.' : 'Session booked for ' + when(at) + '. You’ll find it in My Calendar.');
  });
}

// ---------- My files ----------
async function startFiles() {
  const { user } = await initShell();
  const list = document.getElementById('list');
  const folder = user.id;
  async function load() {
    const { data, error } = await db.storage.from('student-files').list(folder, { sortBy: { column: 'created_at', order: 'desc' } });
    if (error) { list.innerHTML = ''; return say(friendly(error)); }
    const files = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
    list.innerHTML = files.length ? files.map(f => `<div class="file-row">
        <span class="file-ic" aria-hidden="true">📄</span>
        <div class="file-name"><b>${esc(f.name.replace(/^\d+-/, ''))}</b><span class="meta">${f.metadata ? (f.metadata.size / 1024 / 1024).toFixed(2) + ' MB · ' : ''}${f.created_at ? new Date(f.created_at).toLocaleDateString('en-GB') : ''}</span></div>
        <button class="pill pill-soft" data-open="${esc(f.name)}">Open</button>
        <button class="pill pill-soft" data-del="${esc(f.name)}" aria-label="Delete ${esc(f.name)}">Delete</button>
      </div>`).join('') : '<p class="empty">No files yet. Use “Upload a file” to add worksheets, homework or projects.</p>';
  }
  await load();
  document.getElementById('upload').addEventListener('change', async e => {
    for (const file of e.target.files) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) { say(file.name + ' is bigger than ' + MAX_FILE_MB + ' MB.'); continue; }
      say('Uploading ' + file.name + '…');
      const safe = file.name.replace(/[^\w.\- ]+/g, '_');
      const { error } = await db.storage.from('student-files').upload(folder + '/' + Date.now() + '-' + safe, file);
      if (error) say(friendly(error)); else say(file.name + ' uploaded.');
    }
    e.target.value = '';
    load();
  });
  list.addEventListener('click', async e => {
    const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
    if (o) {
      const { data, error } = await db.storage.from('student-files').createSignedUrl(folder + '/' + o.dataset.open, 600);
      if (error) return say(friendly(error));
      window.open(data.signedUrl, '_blank', 'noopener');
    }
    if (d) {
      if (!confirm('Delete this file? This can’t be undone.')) return;
      const { error } = await db.storage.from('student-files').remove([folder + '/' + d.dataset.del]);
      if (error) return say(friendly(error));
      say('File deleted.'); load();
    }
  });
}

// ---------- Recordings ----------
function ytId(url) {
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function recCard(r) {
  const id = ytId(r.youtube_url);
  return `<article class="learn rec">
    ${id ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(r.title)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`
         : `<a href="${esc(r.youtube_url)}" target="_blank" rel="noopener" class="rec-link">Watch video</a>`}
    <div class="learn-body"><span class="meta">${esc(r.courses ? r.courses.title : '')}${r.recorded_at ? ' · ' + new Date(r.recorded_at).toLocaleDateString('en-GB') : ''}</span><h4>${esc(r.title)}</h4></div>
  </article>`;
}
async function startRecordings() {
  const { user } = await initShell();
  const en = await db.from('enrollments').select('course_id').eq('user_id', user.id);
  const ids = (en.data || []).map(e => e.course_id);
  const list = document.getElementById('list');
  if (!ids.length) { list.innerHTML = '<div class="empty-box"><p>Join a course to see its recordings here.</p><a class="btn btn-red" href="all-courses.html">Browse courses</a></div>'; return; }
  const { data, error } = await db.from('recordings').select('*, courses(title)').in('course_id', ids).order('recorded_at', { ascending: false });
  if (error) return say(friendly(error));
  list.innerHTML = data.length ? data.map(recCard).join('') : '<p class="empty">No recordings yet for your courses.</p>';
}

// ---------- Certificates ----------
async function startCertificates() {
  const { user } = await initShell();
  const { data, error } = await db.from('certificates').select('*, courses(title)').eq('user_id', user.id).order('issued_at', { ascending: false });
  if (error) return say(friendly(error));
  const list = document.getElementById('list');
  list.innerHTML = data.length ? data.map(c => `<article class="cert panel">
      <span class="cert-ic" aria-hidden="true">🏅</span>
      <h4>${esc(c.title)}</h4>
      <span class="meta">${esc(c.courses ? c.courses.title : '')}${c.issued_at ? ' · ' + new Date(c.issued_at).toLocaleDateString('en-GB') : ''}</span>
      ${c.file_path ? `<button class="btn btn-red btn-small" data-file="${esc(c.file_path)}">Download</button>` : ''}
    </article>`).join('') : '<div class="empty-box"><p>Finish a course to earn your first certificate.</p><a class="btn btn-red" href="my-courses.html">Go to my courses</a></div>';
  list.addEventListener('click', async e => {
    const b = e.target.closest('[data-file]'); if (!b) return;
    const { data: s, error: er } = await db.storage.from('certificates').createSignedUrl(b.dataset.file, 600);
    if (er) return say(friendly(er));
    window.open(s.signedUrl, '_blank', 'noopener');
  });
}

// ---------- Account settings ----------
async function startSettings() {
  const { user, profile } = await initShell();
  const f = document.getElementById('profile-form');
  ['full_name', 'grade', 'curriculum', 'school'].forEach(k => { f[k].value = profile[k] || ''; });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await db.from('profiles').update({ full_name: f.full_name.value.trim(), grade: f.grade.value, curriculum: f.curriculum.value, school: f.school.value.trim() }).eq('id', user.id);
    say(error ? friendly(error) : 'Your details are saved.');
  });
  // Family code for parents
  const fc = document.getElementById('family-code');
  if (fc) {
    fc.textContent = profile.family_code || '—';
    const { data: links } = await db.from('parent_links').select('parent_id').eq('student_id', user.id);
    const n = (links || []).length;
    document.getElementById('family-parents').textContent = n ? n + (n === 1 ? ' parent is' : ' parents are') + ' linked to your account.' : 'No parent linked yet.';
    document.getElementById('new-code').addEventListener('click', async () => {
      if (!confirm('Make a new code? The old code will stop working. Parents already linked stay linked.')) return;
      const { data, error } = await db.rpc('new_family_code');
      if (error) return say(friendly(error));
      fc.textContent = data; say('New family code made.');
    });
  }
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


// ---------- Parent requests (shown on the dashboard and in settings) ----------
async function showParentRequests() {
  const box = document.getElementById('parent-requests'); if (!box) return;
  const { data, error } = await db.rpc('my_parent_requests');
  if (error || !data || !data.length) { box.innerHTML = ''; return; }
  box.innerHTML = data.map(r => `<div class="panel parent-req" data-req="${r.id}">
      <span class="req-ic" aria-hidden="true">👨‍👩‍👧</span>
      <div class="req-text"><b>${esc(r.parent_name || 'Someone')}</b> (${esc(r.parent_email)}) wants to follow your progress as your parent or guardian.
        <span class="meta">They’ll see your courses, progress, classes and certificates, but can’t change anything. Only approve if you know this person.</span></div>
      <div class="req-actions"><button class="pill pill-live" data-ok="1">Approve</button><button class="pill pill-soft" data-ok="0">Decline</button></div>
    </div>`).join('');
  box.onclick = async e => {
    const b = e.target.closest('[data-ok]'); if (!b) return;
    const row = b.closest('[data-req]');
    row.querySelectorAll('button').forEach(x => x.disabled = true);
    const { error: er } = await db.rpc('answer_parent_request', { req: Number(row.dataset.req), ok: b.dataset.ok === '1' });
    if (er) { row.querySelectorAll('button').forEach(x => x.disabled = false); return say(friendly(er)); }
    say(b.dataset.ok === '1' ? 'Approved. Your parent can now follow your progress.' : 'Request declined.');
    row.remove();
    const fp = document.getElementById('family-parents');
    if (fp && b.dataset.ok === '1') fp.textContent = 'A parent is now linked to your account.';
  };
}
