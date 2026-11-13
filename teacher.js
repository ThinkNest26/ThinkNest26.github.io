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
  (document.getElementById('logout') || document.createElement('a')).addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  const initials = (p.full_name || session.user.email).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  document.querySelectorAll('#me-initials, #me-initials-small').forEach(el => el.textContent = initials);
  if (p.role === 'admin' && !document.querySelector('a[href="admin.html"]')) {
    const ul = document.querySelector('.side nav ul');
    if (ul) ul.insertAdjacentHTML('afterbegin', '<li><a href="admin.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg><span>Approvals</span></a></li>');
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
    if (f.password2 && f.password.value !== f.password2.value) { f.password2.focus(); return showError(err, 'The two passwords don’t match.'); }
    const school = f.school_pick.value === 'A school' ? f.school.value.trim() : f.school_pick.value;
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    if (f.agree_terms && !f.agree_terms.checked) { btn.disabled = false; btn.textContent = 'Send request'; return showError(err, 'Please tick the box to agree to the Terms of use.'); }
    if (typeof captchaMissing === 'function' && captchaMissing()) { btn.disabled = false; btn.textContent = 'Send request'; return showError(err, CAPTCHA_MSG); }
    if (!f.querySelector('input[name=also_parent]:checked')) { document.getElementById('parent-q').scrollIntoView({ behavior: 'smooth', block: 'center' }); btn.disabled = false; btn.textContent = 'Send request'; return showError(err, 'Please answer: are you also a parent at Think Nest?'); }
    const { data: su, error } = await db.auth.signUp({
      email: f.email.value.trim(), password: f.password.value,
      options: { captchaToken: (typeof captchaToken === 'function' ? captchaToken() : undefined), data: { role: 'teacher', full_name: f.full_name.value.trim(), subject: f.subject.value.trim(), school, phone: f.phone.value.trim(),
        grade_levels: f.grade_levels.value, education_degree: f.education_degree.value, teaching_method: f.teaching_method.value,
        curriculum: f.curriculum.value, experience_years: f.experience_years.value, bio: f.bio.value.trim(), also_parent: (f.querySelector('input[name=also_parent]:checked') || {}).value === 'yes', agreed_terms: true, lang: (typeof tnLang === 'function' ? tnLang() : 'en') } }
    });
    if (typeof captchaReset === 'function') captchaReset();
    btn.disabled = false; btn.textContent = 'Send request';
    if (error) return showError(err, friendly(error));
    if (alreadyRegistered(su)) return showError(err, ALREADY_MSG);
    emailAdmin('New teacher account waiting for approval', { Name: (f.full_name ? f.full_name.value.trim() : ''), Email: f.email.value.trim(), Account: 'Teacher' + ((f.querySelector('input[name=also_parent]:checked') || {}).value === 'yes' ? ' (also a parent)' : ''), Subject: (f.subject ? f.subject.value : ''), 'What to do': 'Log in as admin and open Approvals → Teachers to approve.' });
    location.href = 'teacher-pending.html';
  });
}

// ---------- Course form (used on two pages) ----------
// ---------- Extra course information shown on the course details page ----------
const CI_FIELDS = ['intro_video_url', 'start_date', 'end_date', 'registration_deadline', 'class_schedule', 'time_zone', 'lesson_minutes', 'max_students', 'age_range', 'course_language', 'prior_knowledge', 'not_for', 'requirements', 'learning_goals', 'homework_time', 'feedback_info', 'certificate', 'price', 'missed_lesson_policy', 'cancel_policy'];
const CI_NUMBERS = ['lesson_minutes', 'max_students'];

function addCourseInfoFields(f, err) {
  if (!f || f.intro_video_url) return;
  const html = `<details class="ci-more" open style="margin:6px 0 4px">
    <summary style="font-weight:700;cursor:pointer;padding:6px 0">Details for parents (needed before you can publish)</summary>
    <div style="display:grid;gap:12px;padding-top:8px">
      <label>Demo lesson video, about 3 minutes (optional)<input name="intro_video_url" type="url" placeholder="Paste a YouTube, Vimeo or Google Drive link"></label>
      <p class="meta" style="margin:-6px 0 0">Tip: upload to YouTube as “Unlisted”. Your own introduction video goes in 👤 My teacher profile and shows on all your courses.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        <label>Start date<input name="start_date" type="date"></label>
        <label>End date<input name="end_date" type="date"></label>
        <label>Register by<input name="registration_deadline" type="date"></label>
      </div>
      <label>Class days and times (one option per line: students choose one)<textarea name="class_schedule" rows="3" placeholder="e.g.
Sun and Wed, 5–7 pm
Mon and Thu, 6–8 pm"></textarea></label>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        <label>Time zone<input name="time_zone" placeholder="e.g. UAE time (GMT+4)"></label>
        <label>Lesson length (minutes)<input name="lesson_minutes" type="number" min="5" max="300"></label>
        <label>Maximum students (for each time option)<input name="max_students" type="number" min="1" max="500"></label>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        <label>Age range<input name="age_range" placeholder="e.g. 7–8 years"></label>
        <label>Taught in<input name="course_language" placeholder="e.g. English"></label>
      </div>
      <label>By the end, students will be able to…<textarea name="learning_goals" rows="3" placeholder="One goal per line"></textarea></label>
      <label>What students should already know<textarea name="prior_knowledge" rows="2" placeholder="e.g. Can read simple sentences"></textarea></label>
      <label>This course is not suitable for (optional)<textarea name="not_for" rows="2" placeholder="e.g. Students who already read fluently"></textarea></label>
      <label>What students need<textarea name="requirements" rows="2" placeholder="e.g. A laptop or tablet with a camera and microphone, a notebook and coloured pencils"></textarea></label>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
        <label>Homework each week<input name="homework_time" placeholder="e.g. About 30 minutes"></label>
        <label>Certificate at the end<select name="certificate"><option value="">Select</option><option>Yes</option><option>No</option></select></label>
        <label>Price<input name="price" placeholder="e.g. Free"></label>
      </div>
      <label>Feedback and progress<textarea name="feedback_info" rows="2" placeholder="e.g. Written feedback on every task and a progress update for parents every 2 weeks"></textarea></label>
      <label>If a student misses a lesson<textarea name="missed_lesson_policy" rows="2" placeholder="e.g. The recording and resources are available the same day"></textarea></label>
      <label>Cancelling or switching courses<textarea name="cancel_policy" rows="2" placeholder="e.g. Parents can cancel or switch to another course in the first 2 weeks"></textarea></label>
    </div></details>`;
  if (err) err.insertAdjacentHTML('beforebegin', html); else f.insertAdjacentHTML('beforeend', html);
}

function readCourseInfo(f) {
  const row = {};
  CI_FIELDS.forEach(k => {
    if (!f[k]) return;
    const v = f[k].value.trim();
    row[k] = !v ? null : CI_NUMBERS.includes(k) ? Number(v) : v;
  });
  return row;
}

// YouTube or Vimeo link -> embeddable address (null if the link isn't one of those)
function courseVideoEmbed(url) {
  const s = String(url || '');
  const yt = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0';
  const vm = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return 'https://player.vimeo.com/video/' + vm[1];
  const gd = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{20,})/); if (gd) return 'https://drive.google.com/file/d/' + gd[1] + '/preview';
  return null;
}

// What still needs filling in before a course can be published
function coursePublishGaps(c, p) {
  const gaps = [];
  if (!String(c.description || '').trim()) gaps.push('a short description');
  if (!c.start_date) gaps.push('the start date');
  if (!String(c.class_schedule || '').trim()) gaps.push('the class days and times');
  if (!c.lesson_minutes) gaps.push('how long each lesson is');
  if (!String(c.age_range || '').trim()) gaps.push('the age range');
  if (!String(c.course_language || '').trim()) gaps.push('the language it’s taught in');
  if (!String(c.learning_goals || '').trim()) gaps.push('what students will be able to do by the end');
  if (!String(c.requirements || '').trim()) gaps.push('what students need');
  if ((c.audience || 'students') === 'students' && !c.max_students) gaps.push('the maximum number of students');
  if (p) {
    if (!String(p.bio || '').trim()) gaps.push('your teacher profile: a short bio');
    if (!String(p.education_degree || '').trim()) gaps.push('your teacher profile: your qualification');
    if (p.experience_years == null || p.experience_years === '') gaps.push('your teacher profile: years of experience');
  }
  return gaps;
}
async function publishCourse(c, p, on) {
  if (on) {
    const gaps = coursePublishGaps(c, p);
    if (gaps.length) {
      const prof = gaps.some(g => g.startsWith('your teacher profile')), det = gaps.some(g => !g.startsWith('your teacher profile'));
      let dlg = document.getElementById('pub-gaps');
      if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'pub-gaps'; dlg.className = 'dlg'; document.body.appendChild(dlg); }
      dlg.innerHTML = `<form method="dialog" style="max-width:460px"><h2 style="margin-top:0">Almost ready to publish</h2><p>Before publishing “${esc(c.title)}”, please add:</p>
        <ul>${gaps.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
        <div class="row" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px">
          ${det ? '<button type="button" class="btn btn-red" data-go="details">✏️ Add the course details</button>' : ''}
          ${prof ? '<a class="btn btn-white outline" href="teacher-settings.html#tprofile-form">👤 Complete my teacher profile</a>' : ''}
          <button class="btn btn-white outline" value="close">Not now</button></div></form>`;
      dlg.querySelector('[data-go="details"]')?.addEventListener('click', () => { dlg.close(); const ed = document.getElementById('edit-course'); if (ed) { ed.click(); setTimeout(() => { const m = document.querySelector('#course-form .ci-more'); if (m) { m.open = true; m.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 150); } });
      dlg.showModal();
      return false;
    }
  } else if (!confirm('Unpublish “' + c.title + '”? It will be hidden from students until you publish it again. Students already registered keep their place.')) return false;
  const { error } = await db.from('courses').update({ published: on }).eq('id', c.id);
  if (error) { say(/published/.test(error.message || '') ? 'Please run the latest database update (Batch 3) first.' : friendly(error)); return false; }
  say(on ? '🎉 Published! Students can now find and register for it.' : 'Unpublished. It’s now a draft.');
  return true;
}
function teacherProfileReady(p) { return !!(p && String(p.bio || '').trim() && String(p.education_degree || '').trim() && p.experience_years != null && p.experience_years !== ''); }

// Lesson visibility: published now, a draft (no date) or scheduled (a date in the future)
function lessonState(l) {
  if (!('publish_at' in l)) return 'live';
  if (!l.publish_at) return 'draft';
  return new Date(l.publish_at) > new Date() ? 'later' : 'live';
}
const lessonObjHtml = t => t ? `<span class="meta lesson-obj">${String(t).split('\n').filter(Boolean).map(o => '🎯 ' + esc(o)).join('<br>')}</span>` : '';
function whenFromForm(sel, at) {
  if (sel === 'draft') return { ok: true, v: null };
  if (sel === 'later') { if (!at) return { ok: false, msg: 'Choose the date and time to publish the lesson.' }; return { ok: true, v: new Date(at).toISOString() }; }
  return { ok: true, v: new Date().toISOString() };
}
const toLocalInput = iso => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

const slotsOf = c => String((c && c.class_schedule) || '').split('\n').map(s => s.trim()).filter(Boolean);

function courseDialog(onSaved) {
  const dlg = document.getElementById('course-dialog'), f = document.getElementById('course-form'), err = document.getElementById('course-error');
  let editing = null, teacher = null;
  addCourseInfoFields(f, err);
  // "All curricula" and "All grades": general courses (wellbeing, skills, critical thinking) show for every student
  if (f.curriculum && f.curriculum.tagName === 'SELECT' && ![...f.curriculum.options].some(o => o.value === 'all')) {
    const o = new Option('All curricula (any student)', 'all'); const first = [...f.curriculum.options].find(x => x.value); f.curriculum.insertBefore(o, first || null);
  }
  if (f.grade && f.grade.tagName === 'SELECT' && ![...f.grade.options].some(o => o.value === 'all')) {
    const o = new Option('All grades', 'all'); const first = [...f.grade.options].find(x => x.value); f.grade.insertBefore(o, first || null);
  }
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    const row = { title: f.title.value.trim(), description: f.description.value.trim() || null, category: f.category.value, level: f.level.value,
                  weeks: f.weeks.value ? Number(f.weeks.value) : null, image_url: f.image_url.value.trim() || null,
                  curriculum: f.curriculum ? f.curriculum.value || null : null, audience: f.audience ? f.audience.value || 'students' : 'students', format: f.format ? f.format.value.trim() || null : null, grade: f.grade ? f.grade.value || null : null, subject: f.subject ? f.subject.value.trim() || null : null };
    Object.assign(row, readCourseInfo(f));
    if (row.intro_video_url && !courseVideoEmbed(row.intro_video_url)) return showError(err, 'The sample lesson video link doesn’t work. Paste a YouTube or Vimeo link, like https://youtu.be/…');
    const forStudents = !f.audience || f.audience.value === 'students';
    if (!forStudents && !f.category.value) return showError(err, 'Choose a hub topic.');
    if (forStudents && f.subject && !row.subject) return showError(err, 'Choose a subject.');
    if (forStudents && f.curriculum && !row.curriculum) return showError(err, 'Choose a curriculum.');
    if (forStudents && f.grade && !row.grade) return showError(err, 'Choose a grade.');
    if (!row.title) return showError(err, 'Give the course a name.');
    const sb = f.querySelector('button[type=submit], button.btn-red:last-of-type'); const sbText = sb ? sb.textContent : '';
    if (sb) { sb.disabled = true; sb.textContent = 'Saving…'; }
    let res;
    try {
      if (editing) res = await db.from('courses').update(row).eq('id', editing.id).select().single();
      else {
        res = await db.from('courses').insert({ ...row, teacher_id: teacher.id, teacher_name: teacher.full_name, published: false }).select().single();
        if (res.error && /published/.test(res.error.message || '')) res = await db.from('courses').insert({ ...row, teacher_id: teacher.id, teacher_name: teacher.full_name }).select().single();
      }
    } catch (x) { res = { error: x }; }
    if (sb) { sb.disabled = false; sb.textContent = sbText; }
    if (res.error) return showError(err, '⚠️ The course couldn’t be saved: ' + (res.error.message || friendly(res.error)));
    dlg.close(); say(editing ? 'Course saved.' : 'Saved as a draft. Add the details and lessons, then press Publish when it’s ready.'); onSaved(res.data);
  });
  return {
    open(course, me) {
      editing = course; teacher = me;
      document.getElementById('course-dlg-title').textContent = course ? 'Edit course' : 'New course';
      f.reset();
      if (course) ['title', 'description', 'category', 'level', 'weeks', 'image_url', 'curriculum', 'grade', 'subject', 'audience', 'format'].concat(CI_FIELDS).forEach(k => { if (f[k]) f[k].value = course[k] ?? ''; });
      else { if (f.time_zone) f.time_zone.value = 'UAE time (GMT+4)'; if (f.price) f.price.value = 'Free'; }
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
  teacherChecklist(user, profile);
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
    let { data, error } = await db.from('courses').select('*, enrollments(count)').eq('teacher_id', user.id).order('id');
    if (error) { const r = await db.from('courses').select('*').eq('teacher_id', user.id).order('id'); data = r.data; if (r.error) error = r.error; else error = null; }
    if (error) { list.innerHTML = `<div class="empty-box"><p>⚠️ Your courses couldn’t be loaded: <b>${esc(error.message || friendly(error))}</b></p><p class="meta">Please send a screenshot of this message to the Think Nest team.</p><button class="btn btn-red" onclick="location.reload()">Try again</button></div>`; return; }
    courses = data || [];
    let waiting = {};
    try { const { data: rq } = await db.from('course_requests').select('course_id').eq('status', 'teacher').in('course_id', courses.map(c => c.id)); (rq || []).forEach(r => waiting[r.course_id] = (waiting[r.course_id] || 0) + 1); } catch (_) {}
    const card = c => `<article class="learn">
        <img src="${tImg(c)}" alt="">
        <div class="learn-body">
          <span class="meta">${c.published === false ? '📝 Draft · ' : ''}${esc(c.category || '')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''} · ${(c.enrollments && c.enrollments[0] ? c.enrollments[0].count : 0)} students</span>
          <h4>${esc(c.title)}</h4><p class="desc">${esc(c.description || '')}</p>
          ${waiting[c.id] ? `<a class="tag tag-now" href="teacher-course.html?id=${c.id}#t-reqs">📝 ${waiting[c.id]} registration${waiting[c.id] === 1 ? '' : 's'} to answer</a>` : ''}
          <div class="row"><button class="pill pill-soft" data-edit="${c.id}">Edit details</button><button class="pill pill-soft" data-dup="${c.id}" title="Copy this course with all its lessons and resources">📄 Duplicate</button>${c.published === false ? `<button class="pill pill-live" data-pub="${c.id}">🚀 Publish</button>` : ''}<a class="pill pill-live" href="teacher-course.html?id=${c.id}">Open</a></div>
        </div></article>`;
    const drafts = courses.filter(c => c.published === false), live = courses.filter(c => c.published !== false);
    list.innerHTML = courses.length
      ? (drafts.length ? `<h2 class="dash-h tc-h">📝 Drafts <span class="count">${drafts.length}</span></h2><p class="hint tc-h">Only you can see drafts. Add the details and lessons, then press Publish.</p>${drafts.map(card).join('')}` : '')
        + (live.length ? `<h2 class="dash-h tc-h">✅ Published <span class="count">${live.length}</span></h2>${live.map(card).join('')}` : '')
      : '<div class="empty-box"><p>You haven’t created any courses yet.</p></div>';
    try {
      const { data: old } = await db.from('study_groups').select('id').eq('owner_id', user.id).eq('kind', 'class').is('course_id', null).limit(1);
      if ((old || []).length) list.insertAdjacentHTML('beforeend', '<p class="hint tc-h">You also have classes from before classes and courses were joined together. <a href="classes.html">Open my older classes</a>.</p>');
    } catch (_) {}
  }
  const dlg = courseDialog(() => load());
  document.getElementById('new-course').addEventListener('click', () => {
    if (!teacherProfileReady(profile)) {
      if (confirm('Before creating a course, please complete your teacher profile (a short bio, your qualification and your years of experience). Parents see it on every course you teach.\n\nOpen your teacher profile now?')) location.href = 'teacher-settings.html#tprofile-form';
      return;
    }
    dlg.open(null, { id: user.id, full_name: profile.full_name });
  });
  list.addEventListener('click', async e => {
    const b = e.target.closest('[data-edit]'); if (b) return dlg.open(courses.find(c => c.id === Number(b.dataset.edit)), { id: user.id, full_name: profile.full_name });
    const p = e.target.closest('[data-pub]'); if (p && await publishCourse(courses.find(c => c.id === Number(p.dataset.pub)), profile, true)) load();
    const du = e.target.closest('[data-dup]');
    if (du) {
      const src = courses.find(c => c.id === Number(du.dataset.dup));
      const name = prompt('Name for the copy? It will be saved as a draft with all the lessons, quizzes, worksheets and resources, but no students.', src.title + ' (copy)');
      if (name === null) return;
      du.disabled = true; du.textContent = 'Copying…';
      const { data: nid, error } = await db.rpc('duplicate_course', { cid: src.id, new_title: name.trim() || src.title + ' (copy)' });
      if (error) { du.disabled = false; du.textContent = '📄 Duplicate'; return say(/duplicate_course/.test(error.message || '') ? 'Please run the latest database update (Batch 3 Part B) first.' : friendly(error)); }
      say('Copied! Change the dates and times, then publish it when it’s ready.'); location.href = 'teacher-course.html?id=' + nid;
    }
  });
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
    const cur = { british: 'British Curriculum', ib: 'IB', american: 'American Curriculum', all: 'All curricula' }[c.curriculum] || '';
    hero.innerHTML = `<img src="${tImg(c)}" alt=""><div><span class="meta">${esc([cur, c.grade === 'all' ? 'All grades' : c.grade, c.subject].filter(Boolean).join(' · ') || 'Set the curriculum, grade and subject in Edit details')}</span><span class="meta">${esc(c.category || '')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''} · ${esc(c.level || '')}</span>
      <h1>${esc(c.title)} ${c.published === false ? '<span class="tag">📝 Draft</span>' : c.published === true ? '<span class="tag tag-now">✅ Published</span>' : ''}</h1><p>${esc(c.description || '')}</p>
      <div class="row start">${c.published === false ? '<button class="pill pill-live big" id="pub-course">🚀 Publish</button>' : c.published === true ? '<button class="pill pill-soft big" id="pub-course">Unpublish</button>' : ''}<button class="pill pill-soft big" id="edit-course">Edit details</button><a class="pill pill-soft big" href="course-details.html?id=${c.id}" target="_blank" rel="noopener">👀 Preview as a parent</a><button class="pill pill-soft big danger" id="del-course">Delete course</button></div></div>`;
    document.getElementById('edit-course').addEventListener('click', () => dlg.open(c, { id: user.id, full_name: profile.full_name }));
    const pb = document.getElementById('pub-course');
    if (pb) pb.addEventListener('click', async () => { if (await publishCourse(c, profile, c.published === false)) { c = Object.assign({}, c, { published: c.published === false }); drawHero(); } });
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
  if (location.hash === '#t-reqs') { const rt = document.querySelector('[data-tab="t-reqs"]'); if (rt) rt.click(); }

  // groups: one for each time option, with community, resources, members, attendance, insights and report cards
  async function loadGroups() {
    const box = document.getElementById('cgroups'); if (!box) return;
    const { data, error } = await db.rpc('course_groups', { cid: id });
    if (error) { box.innerHTML = '<p class="empty">Run the latest database update (merge classes into courses) to see the groups.</p>'; return; }
    const gs = data || [];
    box.innerHTML = `<p class="hint">Each class time is a group. Students join their group automatically when you approve their registration. Take attendance, post, share resources and write reports inside each group.</p>`
      + (gs.length ? gs.map(g => `<article class="panel cgroup">
          <div class="cgroup-top"><span class="group-ic cls">👥</span><div><b>${esc(g.slot || 'All students')}</b><span class="meta">${g.members} student${g.members === 1 ? '' : 's'}</span></div></div>
          <div class="class-links">
            <a class="pill pill-live" href="group.html?id=${g.id}">📣 Community</a>
            <button type="button" class="pill pill-live" data-gatt="${g.id}" data-name="${esc(g.name)}">📋 Attendance</button>
            <a class="pill pill-soft" href="group.html?id=${g.id}#t-res">📚 Resources</a>
            <a class="pill pill-soft" href="group.html?id=${g.id}#t-mem">👥 Students &amp; ⭐ stars</a>
            <a class="pill pill-soft" href="group.html?id=${g.id}#t-rc">📝 Report cards</a>
            <button type="button" class="pill pill-soft" data-sched="${g.id}" data-slot="${esc(g.slot || '')}" data-name="${esc(g.name)}">📅 Schedule live classes</button>
          </div></article>`).join('')
        : '<p class="empty">The groups appear once the first student has a confirmed place.</p>');
  }
  loadGroups();
  document.getElementById('cgroups') && document.getElementById('cgroups').addEventListener('click', e => {
    const a = e.target.closest('[data-gatt]'); if (a && typeof openAttendanceDialog === 'function') openAttendanceDialog({ gid: Number(a.dataset.gatt), title: a.dataset.name });
    const sc = e.target.closest('[data-sched]'); if (sc) scheduleGroupClasses(c, Number(sc.dataset.sched), sc.dataset.slot, sc.dataset.name);
  });
  if (location.hash === '#t-groups') { const gt = document.querySelector('[data-tab="t-groups"]'); if (gt) gt.click(); }

  // registration requests
  async function loadRequests() {
    const box = document.getElementById('reqs'); if (!box) return;
    const { data, error } = await db.from('course_requests').select('*').eq('course_id', id).order('created_at', { ascending: false });
    if (error) { box.innerHTML = '<p class="empty">Run the latest database update (Batch 3) to see registration requests.</p>'; return; }
    const rows = data || [], waiting = rows.filter(r => r.status === 'teacher'), parent = rows.filter(r => r.status === 'parent'), done = rows.filter(r => !['teacher', 'parent'].includes(r.status)).slice(0, 30);
    const n = document.getElementById('reqs-n'); if (n) { n.hidden = !waiting.length; n.textContent = waiting.length; }
    const info = r => { const d = r.details || {}; return `<div class="person-info"><h4>${esc(d.student_name || 'Student')}${d.registered_by_parent ? ' <span class="tag">👪 By parent</span>' : ''}</h4>
        <span class="meta">${esc([d.student_age ? 'Age ' + d.student_age : '', d.student_grade, d.student_curriculum, d.student_country].filter(Boolean).join(' · '))}</span>
        ${d.student_language ? `<span class="meta">Main language: ${esc(d.student_language)}</span>` : ''}
        ${r.time_slot ? `<span class="meta">🕒 ${esc(r.time_slot)}</span>` : ''}
        <span class="meta">Parent: ${esc([d.parent_name, d.parent_email, d.parent_phone].filter(Boolean).join(', ') || 'not given')}</span>
        ${d.notes ? `<span class="meta">Note: ${esc(d.notes)}</span>` : ''}<span class="meta">Asked ${new Date(r.created_at).toLocaleDateString('en-GB')}</span></div>`; };
    box.innerHTML = `<h3>Waiting for you <span class="count">${waiting.length}</span></h3>` + (waiting.length > 1 ? '<p class="meta"><label class="remember" style="display:inline-flex"><input type="checkbox" id="rq-all"> Select all</label> <button type="button" class="pill pill-live" id="rq-bulk">✅ Approve selected</button></p>' : '') + (waiting.length ? waiting.map(r => `<article class="panel person" data-rq="${r.id}">${waiting.length > 1 ? `<input type="checkbox" class="rq-pick" value="${r.id}" aria-label="Select" style="width:20px;height:20px;margin-inline-end:8px">` : ''}${info(r)}
        <div class="person-actions"><button class="pill pill-live" data-rq-ok>✅ Approve</button><button class="pill pill-soft danger" data-rq-no>Decline</button></div></article>`).join('') : '<p class="meta">No requests waiting. 🎉</p>')
      + (parent.length ? `<h3>Waiting for a parent to agree <span class="count">${parent.length}</span></h3>` + parent.map(r => `<article class="panel person" data-rq="${r.id}">${info(r)}<div class="person-actions"><button class="link-btn" data-rq-ok>Approve without waiting</button></div></article>`).join('') : '')
      + (done.length ? `<details class="hubreq-done"><summary>Answered (${done.length})</summary>${done.map(r => `<div class="pending-row"><b>${esc((r.details || {}).student_name || 'Student')}</b><span class="meta">${{ approved: '✅ Approved', declined: '❌ Declined' + (r.decline_reason ? ': ' + esc(r.decline_reason) : ''), cancelled: 'Cancelled by the student' }[r.status] || r.status}</span></div>`).join('')}</details>` : '');
  }
  loadRequests();
  document.getElementById('reqs') && document.getElementById('reqs').addEventListener('click', async e => {
    if (e.target.id === 'rq-all') { document.querySelectorAll('.rq-pick').forEach(x => x.checked = e.target.checked); return; }
    if (e.target.id === 'rq-bulk') {
      const picks = [...document.querySelectorAll('.rq-pick:checked')].map(x => Number(x.value)); if (!picks.length) return say('Tick the students to approve first.');
      if (!confirm('Approve ' + picks.length + ' student' + (picks.length === 1 ? '' : 's') + '?')) return;
      let ok = 0, full = 0;
      for (const rid of picks) { const { error } = await db.rpc('teacher_decide_request', { rid, ok: true, reason: null }); if (!error) ok++; else if (/COURSE_FULL/.test(error.message || '')) full++; }
      say('✅ Approved ' + ok + (full ? '. ' + full + ' couldn’t be approved because their class time is full.' : '.')); loadRequests(); loadGroups(); if (typeof loadStudents === 'function') loadStudents(); return;
    }
    if (e.target.classList.contains('rq-pick')) return;
    const row = e.target.closest('[data-rq]'); if (!row) return;
    const ok = !!e.target.closest('[data-rq-ok]'), no = !!e.target.closest('[data-rq-no]'); if (!ok && !no) return;
    let reason = null;
    if (no) {
      reason = prompt('Why can’t this student join? They’ll see your reason.\n\nFor example: “This course is for Cambridge students” or “This class time is full: please choose another.”', '');
      if (reason === null) return;
    } else if (row.querySelector('[data-rq-ok].link-btn') && !confirm('The parent hasn’t agreed yet. Approve anyway?')) return;
    const { error } = await db.rpc('teacher_decide_request', { rid: Number(row.dataset.rq), ok, reason });
    if (error) return say(/COURSE_FULL/.test(error.message || '') ? 'That class time is full. Raise the maximum in Edit details, or decline with a reason.' : friendly(error));
    say(ok ? '✅ Approved. The student has been told.' : 'Declined. The student has been told why.');
    loadRequests(); loadGroups(); if (typeof loadStudents === 'function') loadStudents();
  });

  // lessons
  let lessons = [];
  let groupDates = {};
  async function loadLessons() {
    const { data } = await db.from('lessons').select('*').eq('course_id', id).order('position');
    lessons = data || [];
    groupDates = {};
    try { const { data: gd } = await db.from('lesson_group_dates').select('lesson_id, group_id, publish_at').in('lesson_id', lessons.map(l => l.id)); (gd || []).forEach(r => (groupDates[r.lesson_id] = groupDates[r.lesson_id] || []).push(r)); } catch (_) {}
    document.getElementById('lessons').innerHTML = lessons.length ? lessons.map((l, k) => `<div class="lesson">
        <b>${String(k + 1).padStart(2, '0')}</b><span class="lesson-title" id="lesson-${l.id}">${esc(l.title)}${(groupDates[l.id] || []).length ? ` <span class="tag">👥 Dates for each group</span>` : lessonState(l) === 'draft' ? ' <span class="tag">📝 Draft</span>' : lessonState(l) === 'later' ? ` <span class="tag">🕒 Publishes ${new Date(l.publish_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>` : ''}${lessonObjHtml(l.objective_text)}</span>
        ${l.video_url ? '<span class="tag">Video</span>' : ''}${l.resource_url ? '<span class="tag">Link</span>' : ''}${l.material_kind ? `<span class="tag tag-kind">${{ worksheet: '📝 Worksheet', test: '✅ Test', activities: '🧩 Activities' }[l.material_kind]}</span>` : ''}
        ${l.material_kind && l.material_kind !== 'activities' ? `<button class="pill pill-live" data-results="${l.id}">Results</button>` : ''}
        <button class="pill pill-soft" data-up="${l.id}" ${k === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="pill pill-soft" data-down="${l.id}" ${k === lessons.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        ${lessonState(l) !== 'live' && !(groupDates[l.id] || []).length ? `<button class="pill pill-live" data-pub-lesson="${l.id}">Publish now</button>` : ''}<button class="pill pill-soft" data-edit-lesson="${l.id}">Edit</button>
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
    const when = whenFromForm(lf.when ? lf.when.value : 'now', lf.publish_at ? lf.publish_at.value : '');
    if (!when.ok) return say(when.msg);
    const btn = lf.querySelector(':scope > button.btn-red'); if (btn) btn.disabled = true;
    const row = { course_id: id, position: lessons.length + 1, title: lf.title.value.trim(), video_url: lf.video_url.value.trim() || null, resource_url: lf.resource_url.value.trim() || null,
      objective_id: extra.objective_id, objective_text: extra.objective_text, material_kind: extra.material_kind, material: extra.material, publish_at: when.v };
    let { data: nl, error } = await db.from('lessons').insert(row).select().single();
    if (error && /publish_at/.test(error.message || '')) { delete row.publish_at; ({ data: nl, error } = await db.from('lessons').insert(row).select().single()); }
    if (!error && extra.key) { const r = await db.from('lesson_keys').upsert({ lesson_id: nl.id, answers: extra.key }); if (r.error) say(friendly(r.error)); }
    if (btn) btn.disabled = false;
    if (error) return say(friendly(error));
    const wv = lf.when ? lf.when.value : 'now';
    lf.reset(); lf.querySelector('.lesson-at') && (lf.querySelector('.lesson-at').hidden = true); if (builder) builder.reset();
    say(wv === 'draft' ? 'Saved as a draft. Only you can see it. Press “Publish now” when it’s ready.' : wv === 'later' ? 'Saved. Students will see it on the date you chose.' : 'Lesson published. Students in this course can see it now.'); loadLessons();
  });
  if (lf.when) lf.when.addEventListener('change', () => { lf.querySelector('.lesson-at').hidden = lf.when.value !== 'later'; });

  // edit a lesson: title, objectives and when students can see it
  async function editLesson(l) {
    let groups = []; try { const { data: cg } = await db.rpc('course_groups', { cid: id }); groups = cg || []; } catch (_) {}
    const gd0 = groupDates[l.id] || [];
    let d = document.getElementById('lesson-edit');
    if (!d) { d = document.createElement('dialog'); d.id = 'lesson-edit'; d.className = 'dlg'; document.body.appendChild(d); }
    const st = lessonState(l);
    d.innerHTML = `<form class="auth-form" id="le-form" style="padding:22px;display:grid;gap:12px;min-width:min(520px,90vw)">
      <h2 style="margin:0">✏️ Edit lesson</h2>
      <label>Lesson title <input name="title" required value="${esc(l.title)}"></label>
      <label>Learning objectives (one per line) <textarea name="objs" rows="4">${esc(l.objective_text || '')}</textarea></label>
      <div class="two"><label>When can students see it?<select name="when"><option value="now" ${st === 'live' && !gd0.length ? 'selected' : ''}>Published</option><option value="draft" ${st === 'draft' && !gd0.length ? 'selected' : ''}>Draft (only you can see it)</option><option value="later" ${st === 'later' && !gd0.length ? 'selected' : ''}>Publish on a date…</option>${groups.length > 1 ? `<option value="groups" ${gd0.length ? 'selected' : ''}>A different date for each group…</option>` : ''}</select></label>
      <label class="le-at" ${st === 'later' && !gd0.length ? '' : 'hidden'}>Publish on <input type="datetime-local" name="publish_at" value="${st === 'later' ? toLocalInput(l.publish_at) : ''}"></label></div>
      <fieldset class="le-groups" ${gd0.length ? '' : 'hidden'} style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend style="font-weight:700;margin-bottom:6px">Publish for each group</legend>
        ${groups.map(g => { const r = gd0.find(x => x.group_id === g.id); return `<label>${esc(g.slot || 'All students')} <input type="datetime-local" data-gdate="${g.id}" value="${r ? toLocalInput(r.publish_at) : ''}"></label>`; }).join('')}
        <p class="meta">Leave a group empty to keep the lesson hidden from that group. Each group is told when its date comes.</p></fieldset>
      <p class="meta">To change the quizzes, worksheets and other things in this lesson, use <b>Edit</b> next to each one under the lesson.</p>
      <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-le-close>Cancel</button><button class="btn btn-red auth-btn">Save changes</button></div></form>`;
    const f = d.querySelector('form');
    f.when.onchange = () => { d.querySelector('.le-at').hidden = f.when.value !== 'later'; d.querySelector('.le-groups').hidden = f.when.value !== 'groups'; };
    d.querySelector('[data-le-close]').onclick = () => d.close();
    f.onsubmit = async e => {
      e.preventDefault();
      if (!f.title.value.trim()) return say('Give the lesson a title.');
      const perGroup = f.when.value === 'groups';
      const keep = f.when.value === 'now' && st === 'live' && !gd0.length;
      const w = perGroup ? { ok: true, v: new Date().toISOString() } : keep ? { ok: true, v: l.publish_at } : whenFromForm(f.when.value, f.publish_at.value);
      if (!w.ok) return say(w.msg);
      const dates = perGroup ? [...d.querySelectorAll('[data-gdate]')].filter(x => x.value).map(x => ({ group_id: Number(x.dataset.gdate), at: new Date(x.value).toISOString() })) : [];
      if (perGroup && !dates.length) return say('Choose a date for at least one group.');
      const objs = f.objs.value.split('\n').map(s => s.trim()).filter(Boolean).join('\n') || null;
      const up = { title: f.title.value.trim(), objective_text: objs };
      if ('publish_at' in l) up.publish_at = w.v;
      if (perGroup) up.announced = true;   // each group is told on its own date instead
      const { error } = await db.from('lessons').update(up).eq('id', l.id);
      if (error) return say(friendly(error));
      if (perGroup || gd0.length) {
        const { error: ge } = await db.rpc('set_lesson_group_dates', { lid: l.id, dates });
        if (ge) return say(/set_lesson_group_dates/.test(ge.message || '') ? 'Please run the latest database update (gap fixes 2) first.' : friendly(ge));
      }
      d.close(); say('Lesson saved.'); loadLessons();
    };
    d.showModal();
  }
  const hm = location.hash.match(/^#lesson-(\d+)$/);
  if (hm) { const l = lessons.find(x => x.id === Number(hm[1])); if (l && l.material_kind && l.material_kind !== 'activities') showLessonResults(l); }
  document.getElementById('lessons').addEventListener('click', async e => {
    const up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]'), del = e.target.closest('[data-del-lesson]'), res = e.target.closest('[data-results]');
    if (res) return showLessonResults(lessons.find(l => l.id === Number(res.dataset.results)));
    const ed = e.target.closest('[data-edit-lesson]'); if (ed) return editLesson(lessons.find(l => l.id === Number(ed.dataset.editLesson)));
    const pub = e.target.closest('[data-pub-lesson]');
    if (pub) { const { error } = await db.from('lessons').update({ publish_at: new Date().toISOString() }).eq('id', Number(pub.dataset.pubLesson)); if (error) return say(friendly(error)); say('Published. Students in this course have been told.'); return loadLessons(); }
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
        <td><b>${esc(r.student_name || (r.profiles ? r.profiles.full_name : '') || 'Student')}</b>${r.parent_name || r.parent_email || r.parent_phone ? `<span class="meta" style="display:block">Parent: ${esc([r.parent_name, r.parent_email, r.parent_phone].filter(Boolean).join(', '))}</span>` : ''}${r.emergency_name || r.emergency_phone ? `<span class="meta" style="display:block">Emergency contact: ${esc([r.emergency_name, r.emergency_phone].filter(Boolean).join(', '))}</span>` : ''}${r.student_age || r.student_language ? `<span class="meta" style="display:block">${esc([r.student_age ? 'Age ' + r.student_age : '', r.student_language ? 'Main language: ' + r.student_language : ''].filter(Boolean).join(', '))}</span>` : ''}${r.notes ? `<span class="meta" style="display:block">Note: ${esc(r.notes)}</span>` : ''}</td><td>${esc(r.student_grade || (r.profiles ? r.profiles.grade || '' : ''))}${slotsOf(c).length > 1 ? `<select class="slot-pick" data-slot-for="${r.user_id}" aria-label="Class time">${r.time_slot ? '' : '<option value="">Choose a time…</option>'}${slotsOf(c).map(sl => `<option ${sl === r.time_slot ? 'selected' : ''}>${esc(sl)}</option>`).join('')}</select>` : r.time_slot ? `<span class="meta" style="display:block">🕒 ${esc(r.time_slot)}</span>` : ''}</td>
        <td>${new Date(r.created_at).toLocaleDateString('en-GB')}</td>
        <td><div class="bar small"><i style="width:${r.progress}%"></i></div> ${r.progress}%</td>
        <td><a class="pill pill-live" href="teacher-certificates.html?course=${id}&student=${r.user_id}">🏅 Award</a> <button type="button" class="link-btn" data-remove-stud="${r.user_id}" data-name="${esc(r.student_name || (r.profiles ? r.profiles.full_name : '') || 'this student')}">Remove</button></td></tr>`).join('')
      : '<tr><td colspan="5" class="empty">No students have registered for this course yet.</td></tr>';
  }
  loadStudents();
  document.getElementById('students').addEventListener('click', async e => {
    const rb = e.target.closest('[data-remove-stud]'); if (!rb) return;
    const why = prompt('Remove ' + rb.dataset.name + ' from this course? They and their parents will be told, with your reason.\n\nReason:', '');
    if (why === null) return;
    if (!why.trim()) return say('Please give a short reason, so the family understands.');
    const { error } = await db.rpc('remove_student', { cid: id, sid: rb.dataset.removeStud, reason: why.trim() });
    if (error) return say(friendly(error));
    say('Removed. The student and their parents have been told.'); loadStudents(); loadGroups();
  });
  // move a student to another class time (and so to that time's group)
  document.getElementById('students').addEventListener('change', async e => {
    const sel = e.target.closest('[data-slot-for]'); if (!sel || !sel.value) return;
    const { error } = await db.rpc('set_student_slot', { cid: id, sid: sel.dataset.slotFor, slot: sel.value });
    if (error) { say(/COURSE_FULL/.test(error.message || '') ? 'That class time is full.' : /set_student_slot/.test(error.message || '') ? 'Please run the latest database update (gap fixes) first.' : friendly(error)); return loadStudents(); }
    say('Moved to ' + sel.value + '. Their group has been updated.'); if (typeof loadGroups === 'function') loadGroups();
  });
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
        <div class="row">${r.video_path ? `<button class="pill pill-soft" data-play-rec="${esc(r.video_path)}">▶ Watch</button>` : `<a class="pill pill-soft" href="${esc(r.youtube_url)}" target="_blank" rel="noopener">Watch</a>`}<button class="pill pill-soft" data-del-rec="${r.id}" data-path="${esc(r.video_path || '')}">Delete</button></div></article>`).join('')
      : '<p class="empty">No recordings yet.</p>';
  }
  loadRecs();
  const rf = document.getElementById('rec-form');
  rf.recorded_at.value = new Date().toISOString().slice(0, 10);
  rf.addEventListener('submit', async e => {
    e.preventDefault();
    const file = rf.video_file && rf.video_file.files[0], url = rf.youtube_url.value.trim();
    if (!rf.title.value.trim()) return say('Give the recording a title.');
    if (!file && !url) return say('Paste a video link, or choose a video file to upload.');
    if (file && file.size > 50 * 1024 * 1024) return say('This video is larger than 50 MB. Please upload it to YouTube (Unlisted) or Google Drive and paste the link instead.');
    const btn = rf.querySelector('button.btn-red'); const bt = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = file ? 'Uploading… (keep this page open)' : 'Saving…'; }
    let video_path = null;
    if (file) {
      video_path = `${id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
      const up = await db.storage.from('recordings').upload(video_path, file, { contentType: file.type || 'video/mp4' });
      if (up.error) { if (btn) { btn.disabled = false; btn.textContent = bt; } return say(/bucket/i.test(up.error.message || '') ? 'Please run the latest database update (Batch 3 Part C) first.' : friendly(up.error)); }
    }
    const row = { course_id: id, title: rf.title.value.trim(), youtube_url: url || '', recorded_at: rf.recorded_at.value || null };
    if (video_path) row.video_path = video_path;
    const { error } = await db.from('recordings').insert(row);
    if (btn) { btn.disabled = false; btn.textContent = bt; }
    if (error) return say(friendly(error));
    rf.reset(); rf.recorded_at.value = new Date().toISOString().slice(0, 10); say('Recording added.'); loadRecs();
  });
  document.getElementById('recs').addEventListener('click', async e => {
    const pl = e.target.closest('[data-play-rec]');
    if (pl) { const { data: s, error: se } = await db.storage.from('recordings').createSignedUrl(pl.dataset.playRec, 3600); if (se) return say(friendly(se)); return window.open(s.signedUrl, '_blank', 'noopener'); }
    const b = e.target.closest('[data-del-rec]'); if (!b || !confirm('Delete this recording?')) return;
    const { error } = await db.from('recordings').delete().eq('id', Number(b.dataset.delRec));
    if (error) return say(friendly(error));
    if (b.dataset.path) db.storage.from('recordings').remove([b.dataset.path]);
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
    const { data: all, error } = await db.from('bookings').select('*, profiles(full_name, grade, curriculum)').eq('mentor_id', m.id).in('status', ['pending', 'accepted']).gte('starts_at', new Date(Date.now() - 30 * 864e5).toISOString()).order('starts_at');
    if (error) return say(friendly(error));
    const cut = Date.now() - 3600000, data = all.filter(b => new Date(b.starts_at) >= cut), past = all.filter(b => b.status === 'accepted' && new Date(b.starts_at) < cut).reverse();
    const pend = data.filter(b => b.status === 'pending'), acc = data.filter(b => b.status === 'accepted');
    document.getElementById('n-pend').textContent = pend.length;
    const nm = b => b.profiles ? b.profiles.full_name : 'A student';
    document.getElementById('pending').innerHTML = pend.length ? pend.map(b => `<article class="panel person">
        <span class="initials">${esc((nm(b) || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
        <div class="person-info"><h4>${esc(nm(b))} has requested a session with you</h4>
          <span class="meta">${esc(when(b.starts_at))}${b.profiles && b.profiles.grade ? ' · ' + esc(b.profiles.grade) : ''}</span>
          ${b.note ? `<span class="meta">“${esc(b.note)}”</span>` : ''}
        ${b.suggested_at ? `<span class="meta">🕒 You suggested ${esc(when(b.suggested_at))}. Waiting for the student to answer.</span>` : ''}
        ${b.parent_ok === false ? '<span class="meta">👪 Waiting for the parent to agree. You can accept once they do.</span>' : ''}</div>
        <div class="person-actions">${b.parent_ok === false ? '' : `<button class="pill pill-live" data-ans="1" data-id="${b.id}">Accept</button>`}<button class="pill pill-soft" data-suggest="${b.id}">🕒 Suggest a different time</button><button class="pill pill-soft" data-thread="${b.id}" data-title="Session with ${esc(nm(b))}" data-when="${esc(b.starts_at)}">💬 Thread</button><button class="pill pill-soft danger" data-ans="0" data-id="${b.id}">Reject</button></div>
        <form class="suggest-form" data-sform="${b.id}" hidden><label>New date and time <input type="datetime-local" name="at" required></label><label>Message (optional) <input name="msg" maxlength="200" placeholder="For example: I’m teaching then. Does this time work?"></label><button class="pill pill-live">Send suggestion</button></form></article>`).join('')
      : '<p class="empty">No requests waiting.</p>';
    document.getElementById('accepted').innerHTML = acc.length ? acc.map(b => {
      const [rel, live] = relative(b.starts_at);
      const soon = new Date(b.starts_at) - Date.now() < 15 * 60e3;
      return `<article class="event ev-book"><div><h4>Session with ${esc(nm(b))}</h4><span class="meta">${esc(b.note || '')}</span><span class="when">${esc(when(b.starts_at))}</span>
        ${m.meeting_link ? `<span class="meta">The student joins with the same link from their calendar. Open it a few minutes early.</span>` : `<span class="meta">⚠️ Add your meeting link (Google Meet or Zoom) in <a href="teacher-settings.html">Account Settings → Mentor sessions</a> so you and the student can join.</span>`}</div>
        <div class="event-actions">${m.meeting_link ? `<a class="pill ${live || soon ? 'pill-live' : 'pill-soft'}" href="${esc(m.meeting_link)}" target="_blank" rel="noopener">${live || soon ? '▶ Join now' : '🔗 Meeting link'}</a>` : ''}<button class="pill pill-soft" data-thread="${b.id}" data-title="Session with ${esc(nm(b))}" data-when="${esc(b.starts_at)}">💬 Session thread</button><span class="tag ${live ? 'tag-now' : ''}">${rel}</span></div></article>`;
    }).join('') : '<p class="empty">No accepted sessions coming up.</p>';
    let pastBox = document.getElementById('past-sessions');
    if (!pastBox) { pastBox = document.createElement('section'); pastBox.id = 'past-sessions'; document.getElementById('accepted').after(pastBox); }
    pastBox.innerHTML = past.length ? `<h2 class="dash-h">Recent sessions (last 30 days)</h2><p class="hint">Write a short summary after each session. The student and their parents see it, and parents get it by email.</p>` + past.map(b => `<article class="event ev-book"><div><h4>Session with ${esc(nm(b))}</h4><span class="when">${esc(when(b.starts_at))}</span></div>
        <div class="event-actions"><button class="pill pill-live" data-thread="${b.id}" data-title="Session with ${esc(nm(b))}" data-when="${esc(b.starts_at)}" data-summary="1">📋 Write a summary</button><button class="pill pill-soft" data-thread="${b.id}" data-title="Session with ${esc(nm(b))}" data-when="${esc(b.starts_at)}">💬 Thread</button></div></article>`).join('') : '';
  }
  load();
  document.addEventListener('click', e => {
    const th = e.target.closest('[data-thread]'); if (!th || typeof openSessionThread !== 'function') return;
    openSessionThread(Number(th.dataset.thread), { title: th.dataset.title, when: th.dataset.when, role: 'mentor', summary: !!th.dataset.summary });
  });
  document.getElementById('pending').addEventListener('click', e => {
    const sg = e.target.closest('[data-suggest]'); if (!sg) return;
    const f = document.querySelector(`[data-sform="${sg.dataset.suggest}"]`); if (f) f.hidden = !f.hidden;
  });
  document.getElementById('pending').addEventListener('submit', async e => {
    const f = e.target.closest('[data-sform]'); if (!f) return; e.preventDefault();
    const at = new Date(f.at.value); if (isNaN(at) || at < new Date()) return say('Choose a date and time in the future.');
    const { error } = await db.rpc('suggest_booking_time', { bid: Number(f.dataset.sform), new_at: at.toISOString(), msg: f.msg.value.trim() || null });
    if (error) return say(/suggest_booking_time/.test(error.message || '') ? 'Please run the latest database update (Batch 3 Part C) first.' : friendly(error));
    say('Suggestion sent. The student will choose to accept it or not.'); load();
  });
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
  ['full_name', 'subject', 'phone', 'school', 'experience_years', 'bio', 'intro_video_url'].forEach(k => { if (f[k]) f[k].value = p[k] ?? ''; });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const row = {}; ['full_name', 'subject', 'phone', 'school', 'bio', 'grade_levels', 'education_degree', 'teaching_method', 'curriculum'].forEach(k => row[k] = f[k].value.trim() || null);
    row.experience_years = f.experience_years.value ? Number(f.experience_years.value) : null;
    if (f.intro_video_url) {
      const iv = f.intro_video_url.value.trim();
      if (iv && typeof courseVideoEmbed === 'function' && !courseVideoEmbed(iv)) return say('The introduction video link doesn’t work. Paste a YouTube, Vimeo or Google Drive link.');
      row.intro_video_url = iv || null;
    }
    let { error } = await db.from('profiles').update(row).eq('id', user.id);
    if (error && /intro_video_url/.test(error.message || '')) { delete row.intro_video_url; ({ error } = await db.from('profiles').update(row).eq('id', user.id)); }
    say(error ? friendly(error) : 'Your profile is saved.');
  });

  const mf = document.getElementById('mentor-form');
  let { data: m } = await db.from('mentors').select('*').eq('teacher_id', user.id).maybeSingle();
  mf.on.checked = !!m;
  if (mf.agree) mf.agree.checked = !!(m && m.agreed_safeguarding_at);
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
    if (mf.agree && !mf.agree.checked) return say('Please read and tick the mentor safeguarding agreement first.');
    if (!mf.meeting_link.value.trim()) return say('Add the meeting link you’ll use for every session.');
    const row = { name: p.full_name || 'Teacher', subject: mf.subject.value.trim() || null, bio: mf.bio.value.trim() || null, meeting_link: mf.meeting_link.value.trim() || null, teacher_id: user.id, agreed_safeguarding_at: new Date().toISOString() };
    let res = m ? await db.from('mentors').update(row).eq('id', m.id).select().single() : await db.from('mentors').insert(row).select().single();
    if (res.error && /agreed_safeguarding_at/.test(res.error.message || '')) { delete row.agreed_safeguarding_at; res = m ? await db.from('mentors').update(row).eq('id', m.id).select().single() : await db.from('mentors').insert(row).select().single(); }
    if (res.error) return say(friendly(res.error));
    m = res.data; say('Mentor settings saved. Students can now request sessions with you.');
  });

  teacherVerification(user, p);
  if (typeof mfaPanel === 'function') mfaPanel(document.getElementById('mfa-body'));
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


// ---------- Teacher verification documents and safeguarding code ----------
async function teacherVerification(user, p) {
  const box = document.getElementById('verify-box'); if (!box) return;
  const list = document.getElementById('vdocs'), code = document.getElementById('sg-code');
  const names = { id: 'Photo ID', qualification: 'Teaching qualification', conduct: 'Good conduct certificate' };
  async function draw() {
    const { data, error } = await db.from('teacher_docs').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false });
    if (error) { list.innerHTML = '<p class="meta">Run the latest database update (Batch 6) to upload documents.</p>'; return; }
    const { data: me } = await db.from('profiles').select('verified_at, safeguarding_agreed_at').eq('id', user.id).maybeSingle();
    code.checked = !!(me && me.safeguarding_agreed_at);
    list.innerHTML = (me && me.verified_at ? '<p class="cd-done" style="color:#2FA08A;font-weight:800">✅ You’re a verified teacher.</p>' : '<p class="meta">⏳ Not verified yet.</p>')
      + ((data || []).length ? '<ul class="meta">' + data.map(d => `<li>📎 ${esc(names[d.kind] || d.kind)}: uploaded ${new Date(d.uploaded_at).toLocaleDateString('en-GB')}</li>`).join('') + '</ul>' : '');
  }
  draw();
  document.getElementById('vsave').onclick = async () => {
    const files = [...box.querySelectorAll('[data-vdoc]')].filter(i => i.files[0]);
    for (const i of files) {
      const f = i.files[0]; if (f.size > 10 * 1024 * 1024) { say('Each file must be smaller than 10 MB.'); return; }
      const path = `${user.id}/${i.dataset.vdoc}-${Date.now()}-${f.name.replace(/[^\w.\-]+/g, '_')}`;
      const up = await db.storage.from('teacher-docs').upload(path, f); if (up.error) return say(friendly(up.error));
      const { error } = await db.from('teacher_docs').insert({ user_id: user.id, kind: i.dataset.vdoc, path }); if (error) return say(friendly(error));
      i.value = '';
    }
    const { error: ce } = await db.rpc('agree_safeguarding_code', { ok: code.checked }); if (ce) return say(friendly(ce));
    say(files.length ? 'Uploaded. The Think Nest team will check your documents.' : 'Saved.'); draw();
  };
}


// ---------- Teacher: create all the live classes for one group from its days and time ----------
function scheduleGroupClasses(c, gid, slot, gname) {
  let d = document.getElementById('sched-dlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'sched-dlg'; d.className = 'dlg'; document.body.appendChild(d); }
  const guessDays = s => { const m = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }; return Object.keys(m).filter(k => new RegExp('\\b' + k, 'i').test(s || '')).map(k => m[k]); };
  const gd = guessDays(slot), names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().toISOString().slice(0, 10);
  d.innerHTML = `<form class="auth-form" style="display:grid;gap:12px;min-width:min(520px,88vw)">
    <h2 style="margin:0">📅 Live classes for ${esc(slot || gname)}</h2>
    <p class="meta" style="margin:0">Think Nest makes a live class for every chosen day between the two dates. Students in this group see them in their calendar and get a reminder.</p>
    <fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:700;margin-bottom:6px">Days</legend><div style="display:flex;flex-wrap:wrap;gap:8px">${names.map((n, i) => `<label class="remember"><input type="checkbox" name="day" value="${i}" ${gd.includes(i) ? 'checked' : ''}> ${n}</label>`).join('')}</div></fieldset>
    <div class="two"><label>Start time <input type="time" name="time" required value="17:00"></label><label>Length (minutes) <input type="number" name="mins" min="10" max="240" value="${c.lesson_minutes || 60}"></label></div>
    <div class="two"><label>From <input type="date" name="from" required value="${c.start_date && c.start_date > today ? c.start_date : today}"></label><label>Until <input type="date" name="to" required value="${c.end_date || ''}"></label></div>
    <label>Meeting link (Google Meet or Zoom) <input type="url" name="link" required placeholder="https://meet.google.com/..."></label>
    <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-x>Cancel</button><button class="btn btn-red auth-btn">Create live classes</button></div></form>`;
  const f = d.querySelector('form');
  d.querySelector('[data-x]').onclick = () => d.close();
  f.onsubmit = async e => {
    e.preventDefault();
    const days = [...f.querySelectorAll('input[name=day]:checked')].map(x => Number(x.value));
    if (!days.length) return say('Choose at least one day.');
    if (!f.to.value || f.to.value < f.from.value) return say('Choose an end date after the start date.');
    const [hh, mm] = f.time.value.split(':').map(Number), mins = Number(f.mins.value) || 60, rows = [];
    for (let dt = new Date(f.from.value + 'T00:00:00'); dt <= new Date(f.to.value + 'T00:00:00'); dt.setDate(dt.getDate() + 1)) {
      if (!days.includes(dt.getDay())) continue;
      const st = new Date(dt); st.setHours(hh, mm, 0, 0);
      if (st < new Date()) continue;
      rows.push({ course_id: c.id, group_id: gid, title: c.title + (slot ? ' · ' + slot : ''), starts_at: st.toISOString(), ends_at: new Date(st.getTime() + mins * 60e3).toISOString(), meeting_link: f.link.value.trim() });
    }
    if (!rows.length) return say('No class dates fall between those dates.');
    if (rows.length > 120) return say('That’s more than 120 classes. Please choose a shorter date range.');
    if (!confirm('Create ' + rows.length + ' live classes for this group?')) return;
    let { error } = await db.from('sessions').insert(rows);
    if (error && /group_id/.test(error.message || '')) return say('Please run the latest database update (Batch 7) first.');
    if (error) return say(friendly(error));
    d.close(); say('📅 ' + rows.length + ' live classes created. They’re in Live classes and in each student’s calendar.');
  };
  d.showModal();
}

// ---------- Teacher dashboard: getting-started checklist ----------
async function teacherChecklist(user, p) {
  const host = document.querySelector('.panel.profile'); if (!host) return;
  const { data: cs } = await db.from('courses').select('*').eq('teacher_id', user.id);
  const courses = cs || [];
  let lessonsN = 0;
  try { if (courses.length) { const { count } = await db.from('lessons').select('id', { count: 'exact', head: true }).in('course_id', courses.map(x => x.id)); lessonsN = count || 0; } } catch (_) {}
  let verified = false; try { const { data: me } = await db.from('profiles').select('verified_at').eq('id', user.id).maybeSingle(); verified = !!(me && me.verified_at); } catch (_) {}
  const steps = [
    [teacherProfileReady(p), 'Complete your teacher profile', 'teacher-settings.html#tprofile-form'],
    [verified, 'Get verified (upload your documents)', 'teacher-settings.html#verify-box'],
    [courses.length > 0, 'Create your first course', 'teacher-courses.html'],
    [courses.some(x => !coursePublishGaps(x).length), 'Add the details parents need', 'teacher-courses.html'],
    [lessonsN > 0, 'Add your first lesson', courses[0] ? 'teacher-course.html?id=' + courses[0].id : 'teacher-courses.html'],
    [courses.some(x => x.published !== false), 'Publish a course', 'teacher-courses.html']
  ];
  const done = steps.filter(s => s[0]).length;
  if (done === steps.length) return;
  host.insertAdjacentHTML('afterend', `<section class="panel getting-started"><h2 class="dash-h">🚀 Getting started <span class="count">${done} of ${steps.length}</span></h2>
    <div class="bar" style="margin:4px 0 14px"><i style="width:${Math.round(done / steps.length * 100)}%"></i></div>
    <ol class="steps-list">${steps.map(([ok, label, href]) => `<li class="${ok ? 'done' : ''}">${ok ? '✅ ' + esc(label) : `<a href="${href}"><b>${esc(label)}</b></a>`}</li>`).join('')}</ol></section>`);
}
