// ===== Think Nest: course details page (for parents and students) and registration =====
// Uses db, say(), friendly(), esc(), showError(), initShell(), courseImg() from app.js and student.js

const CD_CUR = { british: 'British curriculum', ib: 'IB', american: 'American curriculum', arabic_a: 'Arabic A (Arabic speakers)', arabic_b: 'Arabic B (Arabic learners)' };

function cdVideoEmbed(url) {
  const s = String(url || '');
  const yt = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0';
  const vm = s.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return 'https://player.vimeo.com/video/' + vm[1];
  const gd = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]{20,})/); if (gd) return 'https://drive.google.com/file/d/' + gd[1] + '/preview';
  return null;
}
const cdDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const cdLines = s => String(s || '').split(/\n+/).map(x => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

async function startCourseDetails() {
  // visitors without an account can look at a course before signing up
  const { data: { session: s0 } } = await db.auth.getSession();
  const guest = !s0;
  let user = { id: '00000000-0000-0000-0000-000000000000' }, profile = {};
  if (guest) {
    document.body.classList.add('guest'); document.body.classList.remove('loading');
    const side = document.getElementById('side'); if (side) side.remove();
    const bar = document.querySelector('.app-bar'); if (bar) bar.innerHTML = '<a href="index.html"><img src="images/tn-logo-dark.png" alt="Think Nest home" style="height:44px"></a><div class="bar-right"><a class="pill pill-soft" href="start.html">Log in</a></div>';
    const bl = document.querySelector('.back-link'); if (bl) { bl.href = 'index.html#paths'; bl.textContent = '‹ Think Paths'; }
  } else ({ user, profile } = await initShell());
  const params = new URLSearchParams(location.search);
  const id = Number(params.get('id'));
  const box = document.getElementById('cd');

  const [c, ls, en, t, pl, rq, sp] = await Promise.all([
    db.from('courses').select('*').eq('id', id).maybeSingle(),
    db.from('lessons').select('id, title, position').eq('course_id', id).order('position'),
    db.from('enrollments').select('*').eq('user_id', user.id).eq('course_id', id).maybeSingle(),
    db.rpc('course_teacher', { cid: id }),
    db.rpc('course_places', { cid: id }),
    db.from('course_requests').select('*').eq('course_id', id).eq('student_id', user.id).order('created_at', { ascending: false }).limit(1),
    db.rpc('course_slot_places', { cid: id })
  ]);
  if (!c.data) { box.innerHTML = '<p class="empty">This course could not be found. <a href="all-courses.html">Go back to all courses</a>.</p>'; return; }
  const course = c.data;
  const lessons = ls.data || [];
  const teacher = (t.data && t.data[0]) || { full_name: course.teacher_name };
  let enrol = en.data;
  let taken = typeof pl.data === 'number' ? pl.data : null;
  let req = (rq.data || [])[0] || null;
  const slotTaken = {}; (sp.data || []).forEach(r => slotTaken[r.slot || ''] = r.taken);
  const slots = cdLines(course.class_schedule);  // one time option per line
  const multi = slots.length > 1;

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
  const slotLeft = sl => course.max_students ? Math.max(course.max_students - (slotTaken[sl || ''] || 0), 0) : null;
  const full = () => !!course.max_students && (multi ? slots.every(sl => slotLeft(sl) === 0) : (taken !== null && taken >= course.max_students));
  const placesText = () => !course.max_students ? '' : multi ? slots.map(sl => slotLeft(sl) + ' left: ' + sl).join(' · ') : (taken !== null ? Math.max(course.max_students - taken, 0) + ' of ' + course.max_students + ' places left' : '');
  const video = cdVideoEmbed(course.intro_video_url);
  const goals = cdLines(course.learning_goals);
  const timeLine = slots.length ? (multi ? 'choose one of ' + slots.join(' | ') : slots[0]) + (course.time_zone ? ' (' + course.time_zone + ')' : '') : '';

  const role = profile.role || 'student', isOwner = course.teacher_id === user.id;
  let kids = [];
  if (role === 'parent' || profile.also_parent) {
    try { const { data: ln } = await db.from('parent_links').select('student_id').eq('parent_id', user.id); const ids = (ln || []).map(l => l.student_id); if (ids.length) { const { data: kp } = await db.from('profiles').select('id, full_name').in('id', ids); kids = kp || []; } } catch (_) {}
  }
  let onWait = null;
  if (!guest) { try { const { data: w } = await db.rpc('my_waitlist_place', { cid: id }); onWait = (w && w[0]) || null; } catch (_) {} }
  function actionHtml() {
    if (guest) {
      if (course.published === false) return '';
      return `<p class="cd-wait">Create a free account to ask for a place. It takes a minute.</p><a class="btn btn-red" href="signup.html" data-after>I’m a student</a> <a class="btn btn-white outline" href="parent-signup.html" data-after>I’m a parent</a> <a class="link-btn" href="start.html" data-after>I already have an account</a>`;
    }
    if (isOwner) return course.published === false ? '<p class="cd-wait">📝 This course is a draft. Only you can see this page until you publish it.</p>' : '<p class="cd-wait">👀 This is your course, as parents and students see it.</p>';
    if (role === 'parent' || (role !== 'student' && kids.length)) {
      if (!kids.length) return '<p class="cd-wait">To ask for a place, first link your child to your account.</p><a class="btn btn-red" href="add-child.html">Add a child</a>';
      if (closed) return `<p class="cd-closed">Registration closed on ${cdDate(course.registration_deadline)}.</p>`;
      if (full()) return `<p class="cd-closed">This course is full.</p>`;
      // parents choose the class time too, with places left for each time
      const pSlots = slots.length ? `<fieldset class="reg-slots-p"><legend>${multi ? 'Choose a class time' : 'Class time'}${course.time_zone ? ' (' + esc(course.time_zone) + ')' : ''}</legend>${slots.map(sl => { const left = slotLeft(sl), off = left === 0;
        return `<label class="reg-slot ${off ? 'off' : ''}"><input type="radio" name="p_time_slot" value="${esc(sl)}" ${off ? 'disabled' : ''} ${!multi && !off ? 'checked' : ''}> <span>${esc(sl)}${left !== null ? ` <small>${off ? 'full' : left + (left === 1 ? ' place left' : ' places left')}</small>` : ''}</span></label>`; }).join('')}</fieldset>` : '';
      return `<label class="kid-pick">For which child? <select data-kid>${kids.map(k => `<option value="${k.id}">${esc(k.full_name || 'My child')}</option>`).join('')}</select></label>${pSlots}<button class="btn btn-red" data-parent-ask>Ask for a place</button>${!slots.length && placesText() ? `<span class="cd-places">${placesText()}</span>` : ''}`;
    }
    if (role !== 'student') return '<p class="cd-wait">This course is for students. Students register from their own account.</p>';
    if (enrol) return `<p class="cd-done">✅ Your place is confirmed${enrol.time_slot ? ' (' + esc(enrol.time_slot) + ')' : ''}.</p><a class="btn btn-red" href="course.html?id=${id}">Go to the course</a>`;
    if (req && req.status === 'parent') return `<p class="cd-wait">⏳ Request sent. Waiting for your parent or guardian to agree. We emailed ${esc(req.parent_email || 'them')}.</p><button class="link-btn" data-cancel-req="${req.id}">Cancel my request</button>`;
    if (req && req.status === 'teacher') return `<p class="cd-wait">⏳ Request sent. Waiting for the teacher to confirm your place${req.time_slot ? ' (' + esc(req.time_slot) + ')' : ''}.</p><button class="link-btn" data-cancel-req="${req.id}">Cancel my request</button>`;
    const declined = req && req.status === 'declined' ? `<p class="cd-closed">Your last request wasn’t approved${req.decline_reason ? ': ' + esc(req.decline_reason) : '.'}</p>` : '';
    if (course.published === false) return '<p class="cd-wait">📝 This course is a draft. Only you can see this page until you publish it.</p>';
    if (closed) return `<p class="cd-closed">Registration closed on ${cdDate(course.registration_deadline)}.</p>`;
    if (onWait) return `<p class="cd-wait">📋 You’re on the waiting list${onWait.slot ? ' for ' + esc(onWait.slot) : ''} (number ${onWait.place}). If a place opens, we’ll send your request to the teacher straight away.</p><button class="link-btn" data-leave-wait>Leave the waiting list</button>`;
    if (full()) return `<p class="cd-closed">This course is full.</p><button class="btn btn-red" data-register data-wait>📋 Join the waiting list</button>`;
    return declined + `<button class="btn btn-red" data-register>${req && req.status === 'declined' ? 'Register again' : 'Register for this course'}</button>${placesText() ? `<span class="cd-places">${placesText()}</span>` : ''}${course.registration_deadline ? `<span class="cd-places">Register by ${cdDate(course.registration_deadline)}</span>` : ''}`;
  }
  const sec = (title, inner) => inner ? `<section class="panel cd-sec"><h2>${title}</h2>${inner}</section>` : '';
  const para = s => s ? `<p class="cd-text">${esc(s)}</p>` : '';
  const sub = (title, s) => s ? `<h3>${title}</h3>${para(s)}` : '';

  box.innerHTML = `
    <section class="cd-hero panel">
      <img src="${courseImg(course, 0)}" alt="">
      <div>
        <h1>${esc(course.title)}</h1>
        ${course.teacher_name ? `<p class="by">Taught by <a href="teacher-profile.html?id=${esc(course.teacher_id || '')}" style="color:inherit">${esc(course.teacher_name)}</a></p>` : ''}
        <dl class="cd-facts">
          ${fact('Subject', course.subject)}
          ${fact('Curriculum', CD_CUR[course.curriculum] || course.curriculum)}
          ${fact(course.curriculum === 'british' ? 'Year' : 'Grade', course.curriculum === 'british' && typeof tnYearLabel === 'function' ? tnYearLabel(course.grade) : course.grade)}
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
          <div><b>${esc(teacher.full_name || 'Teacher')}</b>${teacher.verified ? '<span class="tag tag-now" title="Think Nest checked this teacher’s ID, qualification and good conduct certificate">✅ Verified teacher</span>' : ''}${teacher.subject ? `<span class="meta">Teaches ${esc(teacher.subject)}</span>` : ''}</div></div>
        ${teacher.bio ? `<p class="cd-text">${esc(teacher.bio)}</p>` : ''}
        ${cdVideoEmbed(teacher.intro_video_url) ? `<div class="cd-video" style="margin-top:12px"><iframe src="${esc(cdVideoEmbed(teacher.intro_video_url))}" title="Meet ${esc(teacher.full_name || 'the teacher')}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>` : ''}
        <dl class="cd-facts cd-facts-col">
          ${fact('Qualification', teacher.education_degree)}
          ${fact('Experience', teacher.experience_years ? teacher.experience_years + ' years' : '')}
          ${fact('Curriculum', teacher.curriculum)}
          ${fact('Grades', teacher.grade_levels)}
          ${fact('Teaches', teacher.teaching_method)}
        </dl>
        ${course.teacher_id ? `<p style="margin:14px 0 0"><a class="pill pill-soft" href="teacher-profile.html?id=${esc(course.teacher_id)}">See ${esc((teacher.full_name || 'the teacher').split(' ')[0])}’s profile and all their courses →</a></p>` : ''}
      </aside>
    </div>

    <div class="cd-action cd-bottom" id="cd-action-bottom">${actionHtml()}</div>`;

  // ---- share this course (WhatsApp, or the phone's share menu) ----
  {
    const top = document.getElementById('cd-action-top');
    if (top && course.published !== false) {
      const url = location.origin + location.pathname + '?id=' + id;
      const msg = course.title + ' on Think Nest' + (course.teacher_name ? ' with ' + course.teacher_name : '') + ': ' + url;
      top.insertAdjacentHTML('afterend', `<p class="cd-share"><a class="pill pill-soft" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">💬 Share on WhatsApp</a> <button type="button" class="pill pill-soft" id="cd-share-btn">🔗 Share or copy link</button></p>`);
      document.getElementById('cd-share-btn').onclick = async () => {
        if (navigator.share) { try { await navigator.share({ title: course.title + ' – Think Nest', text: msg.replace(': ' + url, ''), url }); return; } catch (_) { return; } }
        try { await navigator.clipboard.writeText(url); say('Link copied. Paste it anywhere to share.'); } catch (_) { prompt('Copy this link:', url); }
      };
    }
  }
  // ---- registration form ----
  const dlg = document.getElementById('reg-dialog'), f = document.getElementById('reg-form'), err = document.getElementById('reg-error');
  document.getElementById('reg-course').textContent = course.title;
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
  const redraw = () => ['cd-action-top', 'cd-action-bottom'].forEach(k => document.getElementById(k).innerHTML = actionHtml());

  const sum = document.getElementById('reg-summary');
  if (sum) sum.innerHTML = [course.teacher_name ? 'Teacher: ' + esc(course.teacher_name) : '', course.start_date ? 'Starts ' + cdDate(course.start_date) + (course.end_date ? ', ends ' + cdDate(course.end_date) : '') : '',
    course.lesson_minutes ? course.lesson_minutes + ' minutes per lesson' : '', 'Price: ' + esc(course.price || 'Free')].filter(Boolean).map(x => `<span>${x}</span>`).join('') + (course.description ? `<p>${esc(course.description.slice(0, 240))}${course.description.length > 240 ? '…' : ''}</p>` : '');
  const slotBox = document.getElementById('reg-slots');
  if (slotBox) {
    slotBox.hidden = !slots.length;
    slotBox.innerHTML = slots.length ? `<legend>${multi ? 'Choose a class time' : 'Class time'}${course.time_zone ? ' (' + esc(course.time_zone) + ')' : ''}</legend>` + slots.map((sl, i) => {
      const left = slotLeft(sl), off = left === 0;
      return `<label class="reg-slot ${off ? 'off' : ''}"><input type="radio" name="time_slot" value="${esc(sl)}" ${off ? 'disabled' : ''} ${!multi && !off ? 'checked' : ''}> <span>${esc(sl)}${left !== null ? ` <small>${off ? 'full' : left + ' places left'}</small>` : ''}</span></label>`;
    }).join('') : '';
  }
  let waitMode = false;
  function openForm() {
    f.reset(); showError(err, '');
    document.getElementById('reg-title').textContent = waitMode ? 'Join the waiting list' : 'Ask for a place on this course';
    f.querySelectorAll('input[name=time_slot]').forEach(r => { if (waitMode) r.disabled = false; });
    if (!multi && slots.length) { const r0 = f.querySelector('input[name=time_slot]:not([disabled])'); if (r0) r0.checked = true; }
    f.student_name.value = profile.full_name || '';
    if (profile.country) f.student_country.value = profile.country;
    if (profile.curriculum) { const o = [...f.student_curriculum.options].find(x => x.value === profile.curriculum); if (o) f.student_curriculum.value = profile.curriculum; }
    { const g0 = profile.grade || course.grade || ''; f.student_grade.value = /british/i.test(profile.curriculum || '') || course.curriculum === 'british' ? (typeof tnYearLabel === 'function' ? tnYearLabel(g0) : g0) : g0; }
    dlg.showModal();
  }
  box.addEventListener('click', async e => {
    if (e.target.closest('[data-after]')) { try { sessionStorage.setItem('tn_after_login', 'course-details.html?id=' + id); sessionStorage.setItem('tn_return', 'course-details.html?id=' + id); } catch (_) {} return; }
    if (e.target.closest('[data-leave-wait]')) { const { error } = await db.rpc('leave_waitlist', { cid: id }); if (error) return say(friendly(error)); onWait = null; redraw(); return say('You’ve left the waiting list.'); }
    if (e.target.closest('[data-register]')) { waitMode = !!e.target.closest('[data-wait]'); return openForm(); }
    const pa = e.target.closest('[data-parent-ask]');
    if (pa) {
      const sel = pa.parentElement.querySelector('[data-kid]');
      const pts = pa.parentElement.querySelector('input[name=p_time_slot]:checked');
      if (slots.length && !pts) return say('Choose a class time first.');
      pa.disabled = true;
      const { data, error } = await db.rpc('parent_request_course', { kid: sel.value, cid: id });
      if (error) { pa.disabled = false; return say(friendly(error)); }
      // save the chosen time on the request (checks the time still has places)
      if (pts && data !== 'approved') {
        const { error: se } = await db.rpc('set_request_slot', { kid: sel.value, cid: id, slot: pts.value });
        if (se && /SLOT_FULL/.test(se.message || '')) { pa.disabled = false; return say('Sorry, that class time has just become full. Please choose another time.'); }
        if (se) say('Request sent. The teacher will choose a class time with you.');
      }
      pa.disabled = false;
      pa.outerHTML = '<p class="cd-wait">' + (data === 'approved' ? '✅ Your child already has a place.' : '⏳ Request sent. The teacher will confirm your child’s place, and you’ll both be told.') + '</p>';
      return;
    }
    const cr = e.target.closest('[data-cancel-req]');
    if (cr && confirm('Cancel your registration request?')) {
      const { error } = await db.rpc('cancel_course_request', { rid: Number(cr.dataset.cancelReq) });
      if (error) return say(friendly(error));
      req = Object.assign({}, req, { status: 'cancelled' }); redraw(); say('Request cancelled.');
    }
  });
  if (!guest && params.get('register') === '1' && role === 'student' && !isOwner && !enrol && !(req && ['parent', 'teacher'].includes(req.status)) && !closed && !full() && course.published !== false) openForm();

  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    const v = k => f[k].value.trim();
    const row = {
      user_id: user.id, course_id: id,
      student_name: v('student_name'), student_grade: v('student_grade') || null,
      student_age: v('student_age') ? Number(v('student_age')) : null, student_language: v('student_language') || null,
      student_country: v('student_country'), student_curriculum: v('student_curriculum'),
      parent_name: v('parent_name'), parent_email: v('parent_email'), parent_phone: v('parent_phone') || null,
      emergency_name: v('emergency_name') || null, emergency_phone: v('emergency_phone') || null,
      heard_from: v('heard_from') || null, notes: v('notes') || null, privacy_agreed: f.privacy.checked
    };
    if (!row.student_name) return showError(err, 'Write the student’s full name.');
    if (!row.student_age || row.student_age < 2 || row.student_age > 19) return showError(err, 'Write the student’s age in years.');
    if (!row.student_country) return showError(err, 'Write which country the student lives in.');
    if (!row.student_curriculum) return showError(err, 'Choose the curriculum the student follows at school.');
    if (!row.parent_name) return showError(err, 'Write the parent or guardian’s name.');
    if (!/^\S+@\S+\.\S+$/.test(row.parent_email)) return showError(err, 'Write a parent email address, like name@example.com.');
    if (!row.parent_phone) return showError(err, 'Write a parent phone number, so the teacher can reach you.');
    if (!f.agree.checked) return showError(err, 'Tick the box to confirm a parent or guardian agrees to this registration.');
    if (!f.privacy.checked) return showError(err, 'Tick the box to agree to the privacy policy.');
    const ts = f.querySelector('input[name=time_slot]:checked');
    if (slots.length && !ts) return showError(err, 'Choose a class time.');
    row.time_slot = ts ? ts.value : null;
    const sb = f.querySelector('button[type=submit]'); sb.disabled = true; sb.textContent = 'Sending…';
    const details = Object.assign({}, row); delete details.user_id; delete details.course_id;
    if (waitMode) {
      const { data: wp, error: we } = await db.rpc('join_course_waitlist', { cid: id, d: details });
      sb.disabled = false; sb.textContent = 'Send my request';
      if (we) return showError(err, '⚠️ ' + (we.message || friendly(we)));
      dlg.close(); onWait = { slot: details.time_slot, place: wp }; redraw();
      return say('You’re on the waiting list. If a place opens, your request goes to the teacher automatically.');
    }
    const { data, error } = await db.rpc('request_course', { cid: id, d: details });
    sb.disabled = false; sb.textContent = 'Send my request';
    if (error) {
      const m = String(error.message || '');
      if (m.includes('duplicate')) { dlg.close(); say('You’re already registered for this course.'); return; }
      if (m.includes('COURSE_FULL')) { dlg.close(); say(multi ? 'Sorry, that class time has just become full. Choose another, or join the waiting list.' : 'Sorry, this course has just become full. You can join the waiting list.'); return; }
      if (m.includes('REGISTRATION_CLOSED')) { dlg.close(); say('Registration for this course has closed.'); return; }
      return showError(err, '⚠️ The registration couldn’t be saved: ' + (m || friendly(error)));
    }
    dlg.close();
    if (data === 'approved') { location.href = 'course.html?id=' + id; return; }
    req = { id: null, status: data, parent_email: row.parent_email, time_slot: row.time_slot };
    const { data: fresh } = await db.from('course_requests').select('*').eq('course_id', id).eq('student_id', user.id).order('created_at', { ascending: false }).limit(1);
    if (fresh && fresh[0]) req = fresh[0];
    redraw();
    say(data === 'parent' ? 'Request sent! We’ve emailed your parent or guardian to agree, then the teacher will confirm your place.' : 'Request sent! The teacher will confirm your place soon.');
  });
}
