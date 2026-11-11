// ===== Think Nest: course details page (for parents and students) and registration =====
// Uses db, say(), friendly(), esc(), showError(), initShell(), courseImg() from app.js and student.js

const CD_CUR = { british: 'British curriculum', ib: 'IB', american: 'American curriculum', arabic_a: 'Arabic A (Arabic speakers)', arabic_b: 'Arabic B (Arabic learners)' };

async function startCourseDetails() {
  const { user, profile } = await initShell();
  const params = new URLSearchParams(location.search);
  const id = Number(params.get('id'));
  const box = document.getElementById('cd');

  const [c, ls, en, t] = await Promise.all([
    db.from('courses').select('*').eq('id', id).maybeSingle(),
    db.from('lessons').select('id, title, position').eq('course_id', id).order('position'),
    db.from('enrollments').select('*').eq('user_id', user.id).eq('course_id', id).maybeSingle(),
    db.rpc('course_teacher', { cid: id })
  ]);
  if (!c.data) { box.innerHTML = '<p class="empty">This course could not be found. <a href="all-courses.html">Go back to all courses</a>.</p>'; return; }
  const course = c.data;
  const lessons = ls.data || [];
  const teacher = (t.data && t.data[0]) || { full_name: course.teacher_name };
  let enrol = en.data;

  // upcoming live classes (only shown if the course has some the visitor is allowed to see)
  let sessions = [];
  try {
    const s = await db.from('sessions').select('title, starts_at, ends_at').eq('course_id', id).gte('starts_at', new Date().toISOString()).order('starts_at').limit(5);
    sessions = s.data || [];
  } catch (_) {}

  document.title = course.title + ' – Think Nest';
  const fact = (label, value) => value ? `<div class="cd-fact"><dt>${label}</dt><dd>${esc(String(value))}</dd></div>` : '';
  const day = d => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const initials = (teacher.full_name || 'T').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  function actionHtml() {
    return enrol
      ? `<p class="cd-done">✅ You’re registered for this course.</p><a class="btn btn-red" href="course.html?id=${id}">Go to the course</a>`
      : `<button class="btn btn-red" data-register>Register for this course</button>`;
  }

  box.innerHTML = `
    <section class="cd-hero panel">
      <img src="${courseImg(course, 0)}" alt="">
      <div>
        <h1>${esc(course.title)}</h1>
        ${course.teacher_name ? `<p class="by">Taught by ${esc(course.teacher_name)}</p>` : ''}
        <dl class="cd-facts">
          ${fact('Subject', course.subject)}
          ${fact('Curriculum', CD_CUR[course.curriculum] || course.curriculum)}
          ${fact('Grade', course.grade)}
          ${fact('Level', course.level)}
          ${fact('Length', course.weeks ? course.weeks + ' weeks' : '')}
          ${fact('Lessons', lessons.length || '')}
          ${fact('How it’s taught', course.format)}
        </dl>
        <div class="cd-action" id="cd-action-top">${actionHtml()}</div>
      </div>
    </section>

    <div class="cd-cols">
      <div>
        <section class="panel cd-sec">
          <h2>About this course</h2>
          <p class="cd-text">${course.description ? esc(course.description) : 'The teacher hasn’t added a description yet.'}</p>
        </section>

        <section class="panel cd-sec">
          <h2>What students will learn</h2>
          ${lessons.length ? `<ol class="cd-lessons">${lessons.map(l => `<li>${esc(l.title)}</li>`).join('')}</ol>`
            : '<p class="cd-text">The lesson list will appear here once the teacher adds lessons.</p>'}
        </section>

        <section class="panel cd-sec">
          <h2>How the course works</h2>
          <ul class="cd-how">
            <li>Lessons are online on Think Nest. Your child can open each lesson, watch the videos and download the resources.</li>
            <li>Live classes appear in your child’s calendar with a link to join.</li>
            <li>Recordings of live classes are saved, so lessons can be watched again.</li>
            <li>Parents linked with the family code can follow progress and see certificates.</li>
          </ul>
          ${sessions.length ? `<h3>Next live classes</h3><ul class="cd-sessions">${sessions.map(s => `<li><b>${esc(s.title || 'Live class')}</b><span>${day(s.starts_at)}</span></li>`).join('')}</ul>` : ''}
        </section>
      </div>

      <aside class="panel cd-sec cd-teacher">
        <h2>Meet the teacher</h2>
        <div class="cd-t-head"><span class="cd-avatar" aria-hidden="true">${esc(initials)}</span>
          <div><b>${esc(teacher.full_name || 'Teacher')}</b>${teacher.subject ? `<span class="meta">Teaches ${esc(teacher.subject)}</span>` : ''}</div></div>
        ${teacher.bio ? `<p class="cd-text">${esc(teacher.bio)}</p>` : ''}
        <dl class="cd-facts cd-facts-col">
          ${fact('Qualification', teacher.education_degree)}
          ${fact('Experience', teacher.experience_years ? teacher.experience_years + ' years' : '')}
          ${fact('Curriculum', teacher.curriculum)}
          ${fact('Grades', teacher.grade_levels)}
          ${fact('Teaches', teacher.teaching_method)}
        </dl>
      </aside>
    </div>

    <div class="cd-action cd-bottom" id="cd-action-bottom">${actionHtml()}</div>`;

  // ---- registration form ----
  const dlg = document.getElementById('reg-dialog'), f = document.getElementById('reg-form'), err = document.getElementById('reg-error');
  document.getElementById('reg-course').textContent = course.title;
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));

  function openForm() {
    f.reset(); showError(err, '');
    f.student_name.value = profile.full_name || '';
    f.student_grade.value = profile.grade || course.grade || '';
    dlg.showModal();
  }
  box.addEventListener('click', e => { if (e.target.closest('[data-register]')) openForm(); });
  if (params.get('register') === '1' && !enrol) openForm();

  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    const row = {
      user_id: user.id, course_id: id,
      student_name: f.student_name.value.trim(), student_grade: f.student_grade.value.trim() || null,
      parent_name: f.parent_name.value.trim(), parent_email: f.parent_email.value.trim(),
      parent_phone: f.parent_phone.value.trim() || null, notes: f.notes.value.trim() || null
    };
    if (!row.student_name) return showError(err, 'Write the student’s full name.');
    if (!row.parent_name) return showError(err, 'Write the parent or guardian’s name.');
    if (!/^\S+@\S+\.\S+$/.test(row.parent_email)) return showError(err, 'Write a parent email address, like name@example.com.');
    if (!f.agree.checked) return showError(err, 'Tick the box to confirm a parent or guardian agrees to this registration.');
    const sb = f.querySelector('button[type=submit]'); sb.disabled = true; sb.textContent = 'Registering…';
    const { data, error } = await db.from('enrollments').insert(row).select().single();
    sb.disabled = false; sb.textContent = 'Register';
    if (error) {
      if (String(error.message).includes('duplicate')) { dlg.close(); say('You’re already registered for this course.'); return; }
      return showError(err, '⚠️ The registration couldn’t be saved: ' + (error.message || friendly(error)));
    }
    enrol = data; dlg.close();
    document.getElementById('cd-action-top').innerHTML = actionHtml();
    document.getElementById('cd-action-bottom').innerHTML = actionHtml();
    say('You’re registered for the course! You’ll find it in My Courses.');
  });
}
