// ===== Think Nest subject paths (home page chooser) =====
// Uses db, say(), friendly(), esc() from app.js and curGet(), curDetailsHtml() from curriculum.js
const PATH_SUBJECTS = {
  english: { name: 'English', icon: 'Aa', color: '#3E4B94', blurb: 'Reading, writing, grammar, speaking and listening.' },
  maths: { name: 'Maths', icon: '+×', color: '#F27A6F', blurb: 'Number, calculation, shape, measures and problem solving.' },
  science: { name: 'Science', icon: '🔬', color: '#2FA08A', blurb: 'Living things, materials, forces, energy and investigating.' },
  arabic: { name: 'Arabic', icon: 'أب', color: '#E3A43B', blurb: 'Reading, writing, grammar and speaking in Arabic.' }
};
const PATH_CURRICULA = {
  default: [['british', 'British Curriculum', 'National Curriculum for England, IGCSE and A Level'], ['ib', 'International Baccalaureate (IB)', 'PYP, MYP and Diploma Programme'], ['american', 'American Curriculum', 'Common Core and US high school courses']],
  arabic: [['arabic_a', 'Arabic A', 'For Arabic speakers (UAE MOE curriculum)'], ['arabic_b', 'Arabic B', 'For learners of Arabic as an additional language (UAE MOE curriculum)']]
};
const PATH_GRADES = ['KG1', 'KG2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const SUBJECT_HEADINGS = { english: ['english', 'communication, language and literacy', 'early literacy'], maths: ['maths', 'math', 'mathematics', 'early math'], science: ['science', 'understanding the world', 'discovery'] };
function pathSubjectKey(s) {
  s = String(s || '').toLowerCase().trim();
  if (['maths', 'math', 'mathematics'].includes(s)) return 'maths';
  if (['english', 'english language arts', 'ela', 'literacy'].includes(s)) return 'english';
  if (s.startsWith('science')) return 'science';
  if (s.startsWith('arabic')) return 'arabic';
  return s;
}
const gradeIndex = g => PATH_GRADES.indexOf(g);
function arabicSummary(cur, grade) {
  const i = gradeIndex(grade);
  const band = i <= 1 ? 'Children learn the Arabic letters and their sounds, listen to stories and songs, and begin to read and write simple words.'
    : i <= 6 ? 'Students build reading fluency and comprehension, write sentences and short texts, and learn core grammar and spelling rules.'
    : i <= 9 ? 'Students read and analyse a range of texts, write for different purposes, and deepen their grammar (النحو) and vocabulary.'
    : 'Students study literature and poetry, write extended essays and arguments, and prepare for final assessments.';
  return cur === 'arabic_a'
    ? `<p class="cur-overview">Arabic for Arabic speakers, following the UAE Ministry of Education curriculum. ${band}</p>`
    : `<p class="cur-overview">Arabic for students learning it as an additional language, following the UAE Ministry of Education curriculum. Lessons build everyday vocabulary and confidence in listening, speaking, reading and writing, step by step and at the right level for each student.</p>`;
}
// Take just this subject's part of the grade summary
function subjectPart(details, subj) {
  const heads = SUBJECT_HEADINGS[subj] || [subj];
  const parts = String(details || '').split(/\n(?=## )/);
  const hit = parts.filter(p => { const h = p.replace(/^## /, '').split('\n')[0].toLowerCase(); return heads.some(x => h.startsWith(x)); });
  return hit.join('\n');
}

let pathState = { subject: null, curriculum: null, grade: null };
async function openPathChooser(subject, start) {
  pathState = Object.assign({ subject, curriculum: null, grade: null }, start || {});
  const dlg = document.getElementById('path-dialog');
  if (!dlg.open) dlg.showModal();
  drawPathStep();
}
function pathCurricula(s) { return s === 'arabic' ? PATH_CURRICULA.arabic : PATH_CURRICULA.default; }
function stepper(n) {
  return `<ol class="path-steps">${['Curriculum', 'Grade', 'Your path'].map((t, i) => `<li class="${i + 1 === n ? 'on' : i + 1 < n ? 'done' : ''}">${i + 1}. ${t}</li>`).join('')}</ol>`;
}
async function drawPathStep() {
  const body = document.getElementById('path-body');
  if (!pathState.subject) {
    document.getElementById('path-title').textContent = 'Find a class';
    body.innerHTML = `<p class="hint">Choose a subject</p><div class="path-options subjects">${Object.entries(PATH_SUBJECTS).map(([k, v]) => `<button type="button" class="path-opt" data-subj="${k}"><span class="path-ic" style="background:${v.color}">${v.icon}</span><b>${esc(v.name)}</b><span>${esc(v.blurb)}</span></button>`).join('')}</div>`;
    return;
  }
  const s = PATH_SUBJECTS[pathState.subject];
  document.getElementById('path-title').innerHTML = `<span class="path-ic" style="background:${s.color}">${s.icon}</span> ${esc(s.name)}`;
  if (!pathState.curriculum) {
    body.innerHTML = stepper(1) + `<p class="hint">Which curriculum does the student follow?</p><div class="path-options">${pathCurricula(pathState.subject).map(([k, n, d]) => `<button type="button" class="path-opt" data-cur="${k}"><b>${esc(n)}</b><span>${esc(d)}</span></button>`).join('')}</div>
      ${pathState.subject !== 'arabic' ? '<p class="note">Not sure? <a href="curriculum.html" target="_blank" rel="noopener">See the curriculum guide ↗</a></p>' : ''}`;
    return;
  }
  if (!pathState.grade) {
    body.innerHTML = stepper(2) + `<p class="hint">Which grade is the student in this school year?</p><div class="cur-grades path-grades">${PATH_GRADES.map(g => `<button type="button" class="chip" data-grade="${g}">${g}</button>`).join('')}</div>
      <button type="button" class="link-btn" data-back="cur">‹ Change curriculum</button>`;
    return;
  }
  const curName = (pathCurricula(pathState.subject).find(c => c[0] === pathState.curriculum) || [])[1];
  body.innerHTML = stepper(3) + `<p class="path-summary"><b>${esc(s.name)}</b> · ${esc(curName)} · ${esc(pathState.grade)} <button type="button" class="link-btn" data-back="grade">Change</button></p><div id="path-learn"><p class="empty">Loading…</p></div><div id="path-classes"></div><div id="path-actions"></div>`;
  // what they'll learn
  let learn = '';
  if (pathState.subject === 'arabic') learn = arabicSummary(pathState.curriculum, pathState.grade);
  else {
    const row = await curGet(pathState.curriculum, pathState.grade);
    if (row) {
      const part = subjectPart(row.details, pathState.subject);
      learn = `<div class="cur-head"><span class="cur-stage">${esc(row.stage || '')}</span><span class="meta">Ages ${esc(row.ages || '')}</span></div>` +
        (part ? `<div class="cur-details one">${curDetailsHtml(part)}</div>` : `<p class="cur-overview">${esc(row.overview || '')}</p>${pathState.curriculum === 'ib' ? '<p class="meta">In the IB, subjects are often taught together through units of inquiry, so each school plans its own topics.</p>' : ''}`);
    }
  }
  document.getElementById('path-learn').innerHTML = `<h3>What you’ll learn</h3>` + (learn || '<p class="meta">A summary for this grade is coming soon.</p>');
  // open classes
  const { data: courses } = await db.from('courses').select('id, title, teacher_name, weeks, subject, curriculum, grade, description').eq('curriculum', pathState.curriculum).eq('grade', pathState.grade);
  const match = (courses || []).filter(c => pathSubjectKey(c.subject) === pathState.subject);
  const { data: { session } } = await db.auth.getSession();
  let role = null, kids = [], joined = new Set();
  if (session) {
    const { data: p } = await db.from('profiles').select('role').eq('id', session.user.id).maybeSingle(); role = p && p.role;
    if (role === 'student' && match.length) { const { data: en } = await db.from('enrollments').select('course_id').eq('user_id', session.user.id); (en || []).forEach(e => joined.add(e.course_id)); }
    if (role === 'parent') { const { data: links } = await db.from('parent_links').select('student_id').eq('parent_id', session.user.id); const ids = (links || []).map(l => l.student_id); if (ids.length) { const { data } = await db.from('profiles').select('id, full_name').in('id', ids); kids = data || []; } }
  }
  const kidPick = role === 'parent' ? (kids.length ? `<label class="kid-pick">For which child? <select id="path-kid">${kids.map(k => `<option value="${k.id}">${esc(k.full_name || 'My child')}</option>`).join('')}</select></label>` : '<p class="note">Link your child to your account first: <a href="add-child.html">Add a child</a>.</p>') : '';
  const canAct = role === 'student' || (role === 'parent' && kids.length);
  document.getElementById('path-classes').innerHTML = `<h3>Classes for this path</h3>` + kidPick + (match.length ? match.map(c => `<div class="path-class"><div><b>${esc(c.title)}</b><span class="meta">${esc(c.teacher_name || '')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''}</span></div>
      ${!session ? '' : joined.has(c.id) ? `<a class="pill pill-soft" href="course.html?id=${c.id}">Joined · Open</a>` : canAct ? `<button type="button" class="btn btn-red" data-join="${c.id}">Join</button>` : ''}</div>`).join('')
    : `<p class="meta">No class is open for this path yet. Join the waiting list and we’ll let you know as soon as one opens.</p>`);
  let actions = '';
  if (!session) {
    actions = `<p class="hint">Create a free account to ${match.length ? 'join' : 'join the waiting list'}. We’ll remember your choice.</p>
      <div class="path-acts"><a class="btn btn-red" href="signup.html" data-save-path>I’m a student</a><a class="btn btn-white outline" href="parent-signup.html" data-save-path>I’m a parent</a></div>
      <p class="switch">Already have an account? <a href="start.html" data-save-path>Log in</a></p>`;
  } else if (canAct && !match.length) {
    actions = `<button type="button" class="btn btn-red" id="path-wait">Join the waiting list</button>`;
  } else if (role && !['student', 'parent'].includes(role)) {
    actions = `<p class="note">You’re logged in as a ${esc(role)}. Teachers can open a class for this path from <a href="teacher-courses.html">My Courses</a>.</p>`;
  }
  document.getElementById('path-actions').innerHTML = actions;
}

function initPaths() {
  const dlg = document.getElementById('path-dialog'); if (!dlg) return;
  document.querySelectorAll('[data-path]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openPathChooser(b.dataset.path); }));
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', async e => {
    const cur = e.target.closest('[data-cur]'), gr = e.target.closest('[data-grade]'), back = e.target.closest('[data-back]');
    const subj = e.target.closest('[data-subj]');
    if (subj) { pathState.subject = subj.dataset.subj; return drawPathStep(); }
    if (cur) { pathState.curriculum = cur.dataset.cur; return drawPathStep(); }
    if (gr) { pathState.grade = gr.dataset.grade; return drawPathStep(); }
    if (back) { if (back.dataset.back === 'cur') pathState.curriculum = null; pathState.grade = null; return drawPathStep(); }
    if (e.target.closest('[data-save-path]')) { try { localStorage.setItem('tn_path', JSON.stringify(pathState)); } catch (_) {} return; }
    const kid = document.getElementById('path-kid');
    const j = e.target.closest('[data-join]');
    if (j) {
      j.disabled = true;
      const cid = Number(j.dataset.join);
      const { data: { session } } = await db.auth.getSession();
      const res = kid ? await db.rpc('parent_enroll', { kid: kid.value, cid }) : await db.from('enrollments').insert({ user_id: session.user.id, course_id: cid });
      if (res.error && !String(res.error.message).includes('duplicate')) { j.disabled = false; return say(friendly(res.error)); }
      try { localStorage.removeItem('tn_path'); } catch (_) {}
      if (kid) { say('Done! Your child has joined the class.'); drawPathStep(); } else location.href = 'course.html?id=' + cid;
    }
    if (e.target.id === 'path-wait') {
      e.target.disabled = true;
      const { error } = await db.rpc('join_waitlist', { subj: pathState.subject, cur: pathState.curriculum, grd: pathState.grade, kid: kid ? kid.value : null });
      if (error) { e.target.disabled = false; return say(friendly(error)); }
      try { localStorage.removeItem('tn_path'); } catch (_) {}
      e.target.outerHTML = '<p class="result-box">✅ You’re on the waiting list. We’ll send a notification as soon as a class opens.</p>';
    }
  });
}

// On the dashboards: continue a path chosen before signing up
function resumePendingPath() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem('tn_path') || 'null'); } catch (_) {}
  if (!p || !p.subject || !document.getElementById('path-dialog')) return;
  openPathChooser(p.subject, p);
}
