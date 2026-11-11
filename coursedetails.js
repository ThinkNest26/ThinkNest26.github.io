// ===== Think Nest: course details page (for parents and students) and registration =====
// Uses db, say(), friendly(), esc(), showError(), initShell(), courseImg() from app.js and student.js

const CD_CUR = { british: 'British curriculum', ib: 'IB', american: 'American curriculum', arabic_a: 'Arabic A (Arabic speakers)', arabic_b: 'Arabic B (Arabic learners)' };

function cdVideoEmbed(url) {
  const s = String(url || '');
  const yt = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0';
  const vm = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return 'https://player.vimeo.com/video/' + vm[1];
  return null;
}
const cdDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const cdLines = s => String(s || '').split(/\n+/).map(x => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

async function startCourseDetails() {
  const { user, profile } = await initShell();
  const params = new URLSearchParams(location.search);
  const id = Number(params.get('id'));
  const box = document.getElementById('cd');

  const [c, ls, en, t, pl] = await Promise.all([
    db.from('courses').select('*').eq('id', id).maybeSingle(),
    db.from('lessons').select('id, title, position').eq('course_id', id).order('position'),
    db.from('enrollments').select('*').eq('user_id', user.id).eq('course_id', id).maybeSingle(),
    db.rpc('course_teacher', { cid: id }),
    db.rpc('course_places', { cid: id })
  ]);
  if (!c.data) { box.innerHTML = '<p class="empty">This course could not be found. <a href="all-courses.html">Go back to all courses</a>.</p>'; return; }
  const course = c.data;
  const lessons = ls.data || [];
  const teacher = (t.data && t.data[0]) || { full_name: course.teacher_name };
  let enrol = en.data;
  let taken = typeof pl.data === 'number' ? pl.data : null;

  let sessions = [];
  try {
    const s = await db.from('sessions').select('title, starts_at').eq('course_id', id).gte('starts_at', new Date().toISOString()).order('starts_at').limit(5);
    sessions = s.data || [];
  } catch (_) {}

  document.title = course.title + ' – Think Nest';
  const fact = (label, value) => value ? `<div class="cd-fact"><dt>${label}</dt><dd>${esc(String(value))}</dd></div>` : '';
  const day = d => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const initials = (teacher.full_name || 'T').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const closed = course.registration_deadline && course.registration_deadline < today;
  const full = () => course.max_students && taken !== null && taken >= course.max_students;
  const placesText = () => course.max_students && taken !== null ? Math.max(course.max_students - taken, 0) + ' of ' + course.max_students + ' places left' : '';
  const video = cdVideoEmbed(course.intro_video_url);
  const goals = cdLines(course.learning_goals);
  const timeLine = [course.class_schedule, course.time_zone].filter(Boolean).join(', ');

  function actionHtml() {
    if (enrol) return `<p class="cd-done">✅ You’re registered for this course.</p><a class="btn btn-red" href="course.html?id=${id}">Go to the course</a>`;
    if (closed) return `<p class="cd-closed">Registration closed on ${cdDate(course.registration_deadline)}.</p>`;
    if (full()) return `<p class="cd-closed">This course is full.</p>`;
    return `<button class="btn btn-red" data-register>Register for this course</button>${placesText() ? `<span class="cd-places">${placesText()}</span>` : ''}${course.registration_deadline ? `<span class="cd-places">Register by ${cdDate(course.registration_deadline)}</span>` : ''}`;
  }
  const sec = (title, inner) => inner ? `<section class="panel cd-sec"><h2>${title}</h2>${inner}</section>` : '';
  const para = s => s ? `<p class="cd-text">${esc(s)}</p>` : '';
  const sub = (title, s) => s ? `<h3>${title}</h3>${para(s)}` : '';

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
          ${fact('Age', course.age_range)}
          ${fact('Level', course.level)}
          ${fact('Taught in', course.course_language)}
          ${fact('Starts', cdDate(course.start_date))}
          ${fact('Ends', cdDate(course.end_date))}
          ${fact('Length', course.weeks ? course.weeks + ' weeks' : '')}
          ${fact('Lessons', lessons.length || '')}
          ${fact('Each lesson', course.lesson_minutes ? course.lesson_minutes + ' minutes' : '')}
          ${fact('Price', course.price || 'Free')}
        </dl>
        ${timeLine ? `<p class="cd-when"><b>When:</b> ${esc(timeLine)}</p>` : ''}
        <div class="cd-action" id="cd-action-top">${actionHtml()}</div>
      </div>
    </section>

    <div class="cd-cols">
      <div>
        ${video ? `<section class="panel cd-sec"><h2>Watch a sample lesson</h2>
          <div class="cd-video"><iframe src="${esc(video)}" title="Sample lesson for ${esc(course.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div></section>` : ''}

        ${sec('About this course', para(course.description || 'The teacher hasn’t added a description yet.'))}

        ${sec('By the end of the course, students will be able to', goals.length ? `<ul class="cd-list">${goals.map(g => `<li>${esc(g)}</li>`).join('')}</ul>` : '')}

        ${sec('What students will learn', lessons.length ? `<ol class="cd-lessons">${lessons.map(l => `<li>${esc(l.title)}</li>`).join('')}</ol>`
            : '<p class="cd-text">The lesson list will appear here once the teacher adds lessons.</p>')}

        ${sec('Is this course right for your child?', sub('Students should already be able to', course.prior_knowledge) + sub('Not suitable for', course.not_for) + (!course.prior_knowledge && !course.not_for && course.age_range ? para('This course is for students aged ' + course.age_range + '.') : ''))}

        ${sec('What your child needs', para(course.requirements || 'A laptop, tablet or phone with internet. A camera and microphone help during live classes.') + sub('Homework', course.homework_time))}

        <section class="panel cd-sec"><h2>How the course works</h2>
          <ul class="cd-list">
            <li>Lessons are online on Think Nest. Students open each lesson, watch the videos and download the resources.</li>
            <li>Live classes appear in the student’s calendar with a link to join.</li>
            <li>Recordings of live classes are saved, so lessons can be watched again.</li>
          </ul>
          ${sessions.length ? `<h3>Next live classes</h3><ul class="cd-sessions">${sessions.map(s => `<li><b>${esc(s.title || 'Live class')}</b><span>${day(s.starts_at)}</span></li>`).join('')}</ul>` : ''}
        </section>

        <section class="panel cd-sec"><h2>Progress and feedback</h2>
          ${para(course.feedback_info)}
          <ul class="cd-list">
            <li>Parents linked with the family code can follow their child’s courses, progress, classes and certificates.</li>
            ${course.certificate === 'Yes' ? '<li>Students receive a certificate when they finish the course.</li>' : ''}
          </ul>
        </section>

        <section class="panel cd-sec"><h2>Good to know</h2>
          ${sub('If your child misses a lesson', course.missed_lesson_policy || 'Lesson videos, resources and recordings stay available, so your child can catch up.')}
          ${sub('Cancelling or switching courses', course.cancel_policy)}
          <h3>Keeping children safe online</h3>
          <p class="cd-text">Teachers and students don’t chat privately, and parents can see their child’s chats.</p>
          <h3>Questions?</h3>
          <p class="cd-text"><a href="contact.html">Contact the Think Nest team</a> and we’ll help you before you register.</p>
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
  const redraw = () => ['cd-action-top', 'cd-action-bottom'].forEach(k => document.getElementById(k).innerHTML = actionHtml());

  function openForm() {
    f.reset(); showError(err, '');
    f.student_name.value = profile.full_name || '';
    f.student_grade.value = profile.grade || course.grade || '';
    dlg.showModal();
  }
  box.addEventListener('click', e => { if (e.target.closest('[data-register]')) openForm(); });
  if (params.get('register') === '1' && !enrol && !closed && !full()) openForm();

  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    const v = k => f[k].value.trim();
    const row = {
      user_id: user.id, course_id: id,
      student_name: v('student_name'), student_grade: v('student_grade') || null,
      student_age: v('student_age') ? Number(v('student_age')) : null, student_language: v('student_language') || null,
      parent_name: v('parent_name'), parent_email: v('parent_email'), parent_phone: v('parent_phone') || null,
      emergency_name: v('emergency_name') || null, emergency_phone: v('emergency_phone') || null,
      heard_from: v('heard_from') || null, notes: v('notes') || null, privacy_agreed: f.privacy.checked
    };
    if (!row.student_name) return showError(err, 'Write the student’s full name.');
    if (!row.student_age || row.student_age < 2 || row.student_age > 19) return showError(err, 'Write the student’s age in years.');
    if (!row.parent_name) return showError(err, 'Write the parent or guardian’s name.');
    if (!/^\S+@\S+\.\S+$/.test(row.parent_email)) return showError(err, 'Write a parent email address, like name@example.com.');
    if (!row.parent_phone) return showError(err, 'Write a parent phone number, so the teacher can reach you.');
    if (!f.agree.checked) return showError(err, 'Tick the box to confirm a parent or guardian agrees to this registration.');
    if (!f.privacy.checked) return showError(err, 'Tick the box to agree to the privacy policy.');
    const sb = f.querySelector('button[type=submit]'); sb.disabled = true; sb.textContent = 'Registering…';
    const { data, error } = await db.from('enrollments').insert(row).select().single();
    sb.disabled = false; sb.textContent = 'Register';
    if (error) {
      const m = String(error.message || '');
      if (m.includes('duplicate')) { dlg.close(); say('You’re already registered for this course.'); return; }
      if (m.includes('COURSE_FULL')) { taken = course.max_students; dlg.close(); redraw(); say('Sorry, this course has just become full.'); return; }
      if (m.includes('REGISTRATION_CLOSED')) { dlg.close(); say('Registration for this course has closed.'); return; }
      return showError(err, '⚠️ The registration couldn’t be saved: ' + (m || friendly(error)));
    }
    enrol = data; if (taken !== null) taken++; dlg.close(); redraw();
    say('You’re registered for the course! You’ll find it in My Courses.');
  });
}
