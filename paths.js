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
  if (s.startsWith('science') || ['biology', 'chemistry', 'physics'].includes(s)) return 'science';
  if (s.startsWith('arabic')) return 'arabic';
  return s;
}
const gradeIndex = g => PATH_GRADES.indexOf(g);
// British schools use Year levels (Grade 1 = Year 2). Other curricula keep grades.
function gradeLabel(cur, g) {
  if (cur !== 'british' || !g) return g;
  if (g === 'KG1') return 'Reception (KG1)';
  if (g === 'KG2') return 'Year 1 (KG2)';
  const m = /^Grade (\d+)$/.exec(g);
  return m ? 'Year ' + (Number(m[1]) + 1) + ' (Grade ' + m[1] + ')' : g;
}
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


// Extra subject detail where the grade summary is organised differently (IB programmes, British exam years)
function programmeDetail(cur, grade, subj) {
  const i = gradeIndex(grade);
  const T = {
    ib: {
      pyp: { english: 'In the PYP, language is taught through and alongside the units of inquiry: listening and speaking, reading (phonics, fluency and understanding) and writing for real purposes, with an additional language as well.',
             maths: 'In the PYP, maths covers number, pattern and function, measurement, shape and space, and data handling, often linked to the units of inquiry and real-life problems.',
             science: 'In the PYP, science is part of the units of inquiry: observing, asking questions, testing ideas and explaining how the natural and physical world works.' },
      myp: { english: 'MYP Language and literature: analysing literary and non-literary texts, organising ideas, producing text and using language accurately. Assessed on four criteria (A to D), each marked 1 to 8.',
             maths: 'MYP Mathematics: number, algebra, geometry and trigonometry, and statistics and probability, with investigating patterns and real-life applications. Assessed on four criteria (A to D), each marked 1 to 8.',
             science: 'MYP Sciences: biology, chemistry and physics through inquiry, designing and carrying out investigations, and reflecting on the impact of science. Assessed on four criteria (A to D), each marked 1 to 8.' },
      dp: { english: 'DP Studies in language and literature: courses such as Language A: Literature or Language and Literature, at standard or higher level, with oral and written assessments.',
            maths: 'DP Mathematics: either Analysis and Approaches or Applications and Interpretation, at standard or higher level, with an internal exploration and final exams.',
            science: 'DP Sciences: for example biology, chemistry or physics at standard or higher level, with practical work, a scientific investigation and final exams.' }
    },
    british: {
      ks4: { english: 'GCSE or IGCSE English Language (reading, analysing and writing fiction and non-fiction) and usually English Literature (a Shakespeare play, a 19th-century novel, modern texts and poetry).',
             maths: 'GCSE or IGCSE Mathematics: number, algebra, ratio and proportion, geometry and measures, probability and statistics, at Foundation or Higher tier.',
             science: 'GCSE or IGCSE Combined Science, or separate Biology, Chemistry and Physics, including required practical experiments.' },
      ks5: { english: 'A Level English Literature or English Language: studying texts in depth and writing extended essays, plus coursework.',
             maths: 'A Level Mathematics (pure maths, statistics and mechanics), and for some students A Level Further Mathematics.',
             science: 'A Level Biology, Chemistry or Physics, with practical skills and a strong base for science and medicine at university.' }
    }
  };
  if (cur === 'ib') return (T.ib[i <= 6 ? 'pyp' : i <= 11 ? 'myp' : 'dp'] || {})[subj] || '';
  if (cur === 'british' && i >= 10) return (T.british[i <= 11 ? 'ks4' : 'ks5'] || {})[subj] || '';
  return '';
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
    body.innerHTML = stepper(2) + `<p class="hint">Which grade is the student in this school year?</p><div class="cur-grades path-grades">${PATH_GRADES.map(g => `<button type="button" class="chip" data-grade="${g}">${esc(gradeLabel(pathState.curriculum, g))}</button>`).join('')}</div>
      <button type="button" class="link-btn" data-back="cur">‹ Change curriculum</button>`;
    return;
  }
  const curName = (pathCurricula(pathState.subject).find(c => c[0] === pathState.curriculum) || [])[1];
  body.innerHTML = stepper(3) + `<p class="path-summary"><b>${esc(s.name)}</b> · ${esc(curName)} · ${esc(gradeLabel(pathState.curriculum, pathState.grade))} <button type="button" class="link-btn" data-back="grade">Change</button> · <a href="path.html?s=${encodeURIComponent(pathState.subject)}&c=${encodeURIComponent(pathState.curriculum)}&g=${encodeURIComponent(pathState.grade)}">Open as a full page ↗</a></p><div id="path-learn"><p class="empty">Loading…</p></div><div id="path-classes"></div><div id="path-actions"></div>`;
  // what they'll learn
  let learn = '';
  if (pathState.subject === 'arabic') learn = arabicSummary(pathState.curriculum, pathState.grade);
  else {
    const [row, objs] = await Promise.all([
      curGet(pathState.curriculum, pathState.grade),
      db.from('objectives').select('subject, topic, text').eq('curriculum', pathState.curriculum).eq('grade', pathState.grade).eq('source', 'bank').order('id')
    ]);
    if (row) {
      const part = subjectPart(row.details, pathState.subject), prog = programmeDetail(pathState.curriculum, pathState.grade, pathState.subject);
      const also = String(row.details || '').split(/\n(?=## )/).filter(x => /^## (also studied|how it works|how learning works|how children learn|the dp core|the pyp exhibition|looking ahead)/i.test(x)).join('\n');
      const myObjs = (objs.data || []).filter(o => pathSubjectKey(o.subject) === pathState.subject || (SUBJECT_HEADINGS[pathState.subject] || []).some(h => String(o.subject).toLowerCase().startsWith(h)));
      const ibObjs = pathState.curriculum === 'ib' ? (objs.data || []) : [];
      const list = myObjs.length ? myObjs : ibObjs;
      learn = `<div class="cur-head"><span class="cur-stage">${esc(row.stage || '')}</span><span class="meta">Ages ${esc(row.ages || '')}</span></div>
        <p class="cur-overview">${esc(row.overview || '')}</p>
        ${prog ? `<div class="cur-sub"><h4>${esc(PATH_SUBJECTS[pathState.subject].name)} this year</h4><p>${esc(prog)}</p></div>` : ''}
        ${part ? `<div class="cur-details one">${curDetailsHtml(part)}</div>` : ''}
        ${list.length ? (() => {
          const groups = {}; list.forEach(o => { const t = o.topic || o.subject; (groups[t] = groups[t] || []).push(o); });
          const entries = Object.entries(groups);
          const block = es => es.map(([t, os]) => `<h5>${esc(t)}</h5><ul>${os.map(o => `<li>${esc(o.text)}</li>`).join('')}</ul>`).join('');
          return `<div class="cur-sub obj-sub"><h4>${myObjs.length ? 'Learning objectives this year' : 'Skills students develop'} <span class="meta">(${list.length})</span></h4>
            ${block(entries.slice(0, 2))}${entries.length > 2 ? `<details><summary>Show all ${entries.length} topics</summary>${block(entries.slice(2))}</details>` : ''}</div>`;
        })() : ''}
        ${also ? `<details class="also"><summary>More about this grade</summary>${curDetailsHtml(also)}</details>` : ''}
        <p class="meta"><a href="curriculum.html?c=${pathState.curriculum}&g=${encodeURIComponent(pathState.grade)}" target="_blank" rel="noopener">See the full ${esc(gradeLabel(pathState.curriculum, pathState.grade))} guide ↗</a></p>`;
    }
  }
  document.getElementById('path-learn').innerHTML = `<h3>What you’ll learn</h3>` + (learn || '<p class="meta">The details for this grade are not available yet. Please ask the Think Nest team to run the curriculum guide update.</p>');
  // open classes
  const { data: courses } = await db.from('courses').select('id, title, teacher_name, weeks, subject, curriculum, grade, description').in('curriculum', [pathState.curriculum, 'all']).in('grade', [pathState.grade, 'all']);
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
      ${!session ? `<a class="pill pill-soft" href="course-details.html?id=${c.id}">View details</a>` : joined.has(c.id) ? `<a class="pill pill-soft" href="course.html?id=${c.id}">Joined · Open</a>` : canAct ? (role === 'parent' ? `<button type="button" class="btn btn-red" data-join="${c.id}">Ask for a place</button>` : `<a class="btn btn-red" href="course-details.html?id=${c.id}">View details</a>`) : ''}</div>`).join('')
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
      if (!kid) { location.href = 'course-details.html?id=' + cid; return; }
      const res = await db.rpc('parent_request_course', { kid: kid.value, cid });
      if (res.error && !String(res.error.message).includes('duplicate')) { j.disabled = false; return say(friendly(res.error)); }
      try { localStorage.removeItem('tn_path'); } catch (_) {}
      say(res.data === 'approved' ? 'Your child already has a place.' : 'Request sent! The teacher will confirm your child’s place, and you’ll be told.'); drawPathStep();
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
  if (!p || !p.subject) return;
  // continue the path chosen before signing up, on its own page
  if (p.curriculum && p.grade) { try { localStorage.removeItem('tn_path'); } catch (_) {} location.href = 'path.html?s=' + encodeURIComponent(p.subject) + '&c=' + encodeURIComponent(p.curriculum) + '&g=' + encodeURIComponent(p.grade); return; }
  if (!document.getElementById('path-dialog')) return;
  openPathChooser(p.subject, p);
}

// ===== Home page finder: subject → curriculum → grade → the path =====
function initPathFinder() {
  const box = document.querySelector('.pf-box'); if (!box) return;
  const st = { subject: null, curriculum: null };
  const more = document.getElementById('pf-more'), cur = document.getElementById('pf-cur'), grade = document.getElementById('pf-grade'), go = document.getElementById('pf-go');
  const ready = () => { go.disabled = !(st.subject && st.curriculum && grade.value); };
  box.querySelectorAll('[data-pf]').forEach(b => b.addEventListener('click', () => {
    st.subject = b.dataset.pf; st.curriculum = null;
    box.querySelectorAll('[data-pf]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    const list = pathCurricula(st.subject);
    cur.innerHTML = list.map(([k, n]) => `<button type="button" class="pf-chip" role="radio" aria-checked="false" data-cur="${k}">${esc(n.replace(' Curriculum', '').replace('International Baccalaureate (IB)', 'IB'))}</button>`).join('');
    if (list.length === 1) cur.firstElementChild.click();
    more.hidden = false; ready();
    if (window.matchMedia('(max-width: 700px)').matches) more.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  cur.addEventListener('click', e => { const c = e.target.closest('[data-cur]'); if (!c) return; st.curriculum = c.dataset.cur; cur.querySelectorAll('[data-cur]').forEach(x => x.setAttribute('aria-checked', String(x === c)));
    // show Year levels for British, grades for the others
    [...grade.options].forEach(o => { if (o.value) o.textContent = gradeLabel(st.curriculum, o.value); });
    if (grade.options[0] && !grade.options[0].value) grade.options[0].textContent = st.curriculum === 'british' ? 'Choose a year…' : 'Choose a grade…';
    ready(); });
  grade.addEventListener('change', ready);
  go.addEventListener('click', () => { if (!go.disabled) location.href = 'path.html?s=' + encodeURIComponent(st.subject) + '&c=' + encodeURIComponent(st.curriculum) + '&g=' + encodeURIComponent(grade.value); });
  // live "classes open" badges
  db.from('courses').select('subject, audience').then(({ data }) => {
    const n = {}; (data || []).filter(c => !c.audience || c.audience === 'students').forEach(c => { const k = pathSubjectKey(c.subject); n[k] = (n[k] || 0) + 1; });
    document.querySelectorAll('[data-open]').forEach(el => { const k = n[el.dataset.open] || 0; el.textContent = k ? `🟢 ${k} class${k === 1 ? '' : 'es'} open` : '✨ New classes soon'; });
  }).catch(() => {});
}
document.addEventListener('DOMContentLoaded', () => { try { initPathFinder(); } catch (e) { console.error(e); } });
