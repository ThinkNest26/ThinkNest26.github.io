// ===== Think Nest: "Your path" page (path.html?s=maths&c=british&g=Grade 4) =====
// Uses PATH_* and helpers from paths.js, curGet/curDetailsHtml from curriculum.js, db/esc/say/friendly from app.js
// make text safe to show (defined here too, in case no other script on this page has it)
if (typeof esc !== 'function') var esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PP_ICONS = [
  [/fraction|decimal|percent/i, '🍕'], [/place value|number|counting/i, '🔢'], [/addition|subtraction|calculation|mental/i, '➕'], [/multiplication|times table/i, '✖️'],
  [/division/i, '➗'], [/shape|geometry|angle|position|symmetry/i, '🔺'], [/measure|length|mass|capacity|perimeter|area|volume/i, '📏'], [/time\b|clock/i, '⏰'],
  [/money|financ/i, '💰'], [/data|statistic|graph|chart/i, '📊'], [/algebra|equation|pattern|sequence/i, '🔣'], [/probability|chance/i, '🎲'], [/ratio|proportion/i, '⚖️'],
  [/phonics|spelling|letter/i, '🔤'], [/reading|comprehension|book/i, '📖'], [/writing|composition|handwriting/i, '✍️'], [/grammar|punctuation|vocabulary/i, '📝'],
  [/speaking|listening|oracy|spoken/i, '🗣️'], [/poetry|poem|drama|shakespeare|literature|novel/i, '🎭'],
  [/plant|seed|flower/i, '🌱'], [/animal|living|habitat|ecosystem|classification/i, '🐾'], [/human|body|health|nutrition|teeth|skeleton/i, '🫀'],
  [/material|state of matter|solid|liquid|gas|mixture/i, '🧪'], [/force|magnet|motion|gravity/i, '🧲'], [/light|shadow/i, '💡'], [/sound/i, '🔊'], [/electric|circuit/i, '⚡'],
  [/earth|space|planet|sun|moon|solar/i, '🪐'], [/rock|soil|fossil/i, '🪨'], [/evolution|inherit|genetic|cell/i, '🧬'], [/chemi|reaction|atom|element/i, '⚗️'], [/energy/i, '🔋'],
  [/investigat|enquiry|inquiry|scientific/i, '🔍']
];
const ppIcon = (t, subj) => (PP_ICONS.find(([re]) => re.test(t)) || [null, PATH_SUBJECTS[subj] ? PATH_SUBJECTS[subj].icon : '📘'])[1];

async function startPathPage() {
  const host = document.getElementById('pp');
  const q = new URLSearchParams(location.search);
  const st = { subject: q.get('s'), curriculum: q.get('c'), grade: q.get('g') };
  const S = PATH_SUBJECTS[st.subject];
  const curOk = S && pathCurricula(st.subject).some(c => c[0] === st.curriculum), gradeOk = PATH_GRADES.includes(st.grade);
  if (!S || !curOk || !gradeOk) {
    host.innerHTML = `<div class="pp-empty"><div class="pp-empty-ic">🧭</div><h1>Let’s find your path</h1><p>Choose a subject, curriculum and grade on the home page.</p><a class="btn btn-red" href="index.html#paths">Go to Think Paths</a></div>`;
    return;
  }
  const curName = (pathCurricula(st.subject).find(c => c[0] === st.curriculum) || [])[1] || '';
  document.title = `${S.name} · ${st.grade} – Think Nest`;
  host.innerHTML = `<section class="pp-hero" style="--c:${S.color}">
      <a class="pp-back" href="index.html#paths">‹ Change path</a>
      <div class="pp-hero-in">
        <span class="pp-ic" aria-hidden="true" data-no-tr dir="ltr">${S.icon}</span>
        <div><p class="pp-kicker">Your path</p><h1>${esc(S.name)} · ${esc(st.grade)}</h1>
          <p class="pp-chips"><span>${esc(curName)}</span><span id="pp-stage" hidden></span><span id="pp-ages" hidden></span></p></div>
      </div>
      <div class="pp-share"><button type="button" class="pp-btn" id="pp-share">📤 Share this path</button><a class="pp-btn ghost" id="pp-wa" target="_blank" rel="noopener">WhatsApp</a></div>
    </section>
    <div class="pp-grid">
      <section class="pp-main"><h2>📚 What you’ll learn</h2><div id="pp-learn"><p class="empty">Loading…</p></div></section>
      <aside class="pp-side"><section class="pp-card"><h2>🏫 Classes you can join</h2><div id="pp-classes"><p class="empty">Loading…</p></div></section>
        <section class="pp-card pp-next" id="pp-next"></section></aside>
    </div>`;
  // share
  const url = location.href, text = `${S.name} · ${st.grade} (${curName}) on Think Nest`;
  document.getElementById('pp-wa').href = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
  document.getElementById('pp-share').addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Think Nest', text, url }); return; } catch (_) { return; } }
    try { await navigator.clipboard.writeText(url); say('Link copied. Paste it anywhere to share.'); } catch (_) { prompt('Copy this link:', url); }
  });
  // what you'll learn
  const learn = document.getElementById('pp-learn');
  if (st.subject === 'arabic') {
    learn.innerHTML = `<div class="pp-overview">${arabicSummary(st.curriculum, st.grade)}</div>`;
  } else {
    const [row, objs] = await Promise.all([
      curGet(st.curriculum, st.grade),
      db.from('objectives').select('subject, topic, text').eq('curriculum', st.curriculum).eq('grade', st.grade).eq('source', 'bank').order('id')
    ]);
    if (!row) { learn.innerHTML = '<p class="meta">The details for this grade are coming soon.</p>'; }
    else {
      if (row.stage) { const e = document.getElementById('pp-stage'); e.textContent = row.stage; e.hidden = false; }
      if (row.ages) { const e = document.getElementById('pp-ages'); e.textContent = 'Ages ' + row.ages; e.hidden = false; }
      const prog = programmeDetail(st.curriculum, st.grade, st.subject), part = subjectPart(row.details, st.subject);
      const mine = (objs.data || []).filter(o => pathSubjectKey(o.subject) === st.subject || (SUBJECT_HEADINGS[st.subject] || []).some(h => String(o.subject).toLowerCase().startsWith(h)));
      const list = mine.length ? mine : (st.curriculum === 'ib' ? (objs.data || []) : []);
      const groups = {}; list.forEach(o => { const t = o.topic || o.subject; (groups[t] = groups[t] || []).push(o.text); });
      const topics = Object.entries(groups);
      learn.innerHTML = `<p class="pp-overview">${esc(row.overview || '')}</p>
        ${prog ? `<div class="pp-this-year"><h3>${esc(S.name)} this year</h3><p>${esc(prog)}</p></div>` : ''}
        ${topics.length ? `<h3 class="pp-h3">Topics <span class="meta">(${topics.length} topics · ${list.length} objectives)</span></h3>
          <div class="pp-topics">${topics.map(([t, os]) => `<details class="pp-topic" style="--c:${S.color}"><summary><span class="pp-tic" aria-hidden="true">${ppIcon(t, st.subject)}</span><b>${esc(t)}</b><span class="pp-count">${os.length}</span></summary>
            <ul>${os.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}</div>`
          : (part ? `<div class="cur-details one">${curDetailsHtml(part)}</div>` : '')}
        <p class="pp-guide"><a href="curriculum.html?c=${encodeURIComponent(st.curriculum)}&g=${encodeURIComponent(st.grade)}">See the full ${esc(st.grade)} curriculum guide ↗</a></p>`;
    }
  }
  // classes + next live class
  const { data: courses } = await db.from('courses').select('id, title, teacher_name, weeks, subject, description').eq('curriculum', st.curriculum).eq('grade', st.grade);
  const match = (courses || []).filter(c => pathSubjectKey(c.subject) === st.subject);
  const nextBy = {};
  if (match.length) {
    const { data: ses } = await db.from('sessions').select('course_id, starts_at').in('course_id', match.map(c => c.id)).gte('starts_at', new Date().toISOString()).order('starts_at');
    (ses || []).forEach(s => { if (!nextBy[s.course_id]) nextBy[s.course_id] = new Date(s.starts_at); });
  }
  const { data: { session } } = await db.auth.getSession();
  let role = null, kids = [], joined = new Set();
  if (session) {
    const { data: p } = await db.from('profiles').select('role, also_parent').eq('id', session.user.id).maybeSingle(); role = p && p.role;
    if (role === 'student') { const { data: en } = await db.from('enrollments').select('course_id').eq('user_id', session.user.id); (en || []).forEach(e => joined.add(e.course_id)); }
    if (role === 'parent' || (p && p.also_parent)) { const { data: links } = await db.from('parent_links').select('student_id').eq('parent_id', session.user.id); const ids = (links || []).map(l => l.student_id); if (ids.length) { const { data } = await db.from('profiles').select('id, full_name').in('id', ids); kids = data || []; } if (role !== 'student') role = 'parent'; }
  }
  const canAct = role === 'student' || (role === 'parent' && kids.length);
  const box = document.getElementById('pp-classes');
  box.innerHTML = (role === 'parent' && kids.length ? `<label class="pp-kid">For which child? <select id="pp-kid">${kids.map(k => `<option value="${k.id}">${esc(k.full_name || 'My child')}</option>`).join('')}</select></label>` : '')
    + (match.length ? match.map(c => `<article class="pp-class" style="--c:${S.color}">
        <div class="pp-class-top"><span class="pp-tic" aria-hidden="true" data-no-tr dir="ltr">${S.icon}</span><div><b>${esc(c.title)}</b><span class="meta">${esc(c.teacher_name || 'Think Nest teacher')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''}</span></div></div>
        ${c.description ? `<p class="pp-desc">${esc(String(c.description).slice(0, 140))}${String(c.description).length > 140 ? '…' : ''}</p>` : ''}
        <p class="pp-when">${nextBy[c.id] ? '📅 Next live class: ' + nextBy[c.id].toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '📅 Live classes to be announced'}</p>
        ${!session ? '' : joined.has(c.id) ? `<a class="btn btn-white outline pp-act" href="course.html?id=${c.id}">✓ Joined · Open</a>` : canAct ? `<button type="button" class="btn btn-red pp-act" data-join="${c.id}">Join this class</button>` : ''}
      </article>`).join('')
    : `<div class="pp-none"><span aria-hidden="true">🌱</span><p><b>No class is open for this path yet.</b><br>Join the waiting list and we’ll tell you as soon as one opens.</p></div>`);
  // next step
  const next = document.getElementById('pp-next');
  if (!session) {
    next.innerHTML = `<h2>👉 Your next step</h2><p>Create a free account to ${match.length ? 'join a class' : 'join the waiting list'}. We’ll remember this path for you.</p>
      <div class="pp-acts"><a class="btn btn-red" href="signup.html" data-save>I’m a student</a><a class="btn btn-white outline" href="parent-signup.html" data-save>I’m a parent</a></div>
      <p class="meta">Already have an account? <a href="start.html" data-save>Log in</a></p>`;
  } else if (canAct && !match.length) {
    next.innerHTML = `<h2>👉 Your next step</h2><p>Be the first to know when a class opens.</p><button type="button" class="btn btn-red" id="pp-wait">Join the waiting list</button>`;
  } else if (role === 'parent' && !kids.length) {
    next.innerHTML = `<h2>👉 Your next step</h2><p>Link your child to your account first, then come back to join.</p><a class="btn btn-red" href="add-child.html">Add a child</a>`;
  } else if (role && !['student', 'parent'].includes(role)) {
    next.innerHTML = `<h2>👩‍🏫 For teachers</h2><p>Want to teach this path? Open a class for it from My Courses: everyone on the waiting list is told automatically.</p><a class="btn btn-red" href="teacher-courses.html">Open a class</a>`;
  } else next.hidden = true;
  // actions
  document.body.addEventListener('click', async e => {
    if (e.target.closest('[data-save]')) { try { localStorage.setItem('tn_path', JSON.stringify(st)); } catch (_) {} return; }
    const kid = document.getElementById('pp-kid');
    const j = e.target.closest('[data-join]');
    if (j) {
      j.disabled = true;
      const cid = Number(j.dataset.join);
      const res = kid ? await db.rpc('parent_enroll', { kid: kid.value, cid }) : await db.from('enrollments').insert({ user_id: session.user.id, course_id: cid });
      if (res.error && !String(res.error.message).includes('duplicate')) { j.disabled = false; return say(friendly(res.error)); }
      try { localStorage.removeItem('tn_path'); } catch (_) {}
      if (kid) { say('Done! Your child has joined the class.'); j.outerHTML = '<span class="pp-done">✅ Joined</span>'; } else location.href = 'course.html?id=' + cid;
    }
    if (e.target.id === 'pp-wait') {
      e.target.disabled = true;
      const { error } = await db.rpc('join_waitlist', { subj: st.subject, cur: st.curriculum, grd: st.grade, kid: kid ? kid.value : null });
      if (error) { e.target.disabled = false; return say(friendly(error)); }
      try { localStorage.removeItem('tn_path'); } catch (_) {}
      e.target.outerHTML = '<p class="pp-done">✅ You’re on the waiting list. We’ll send a notification as soon as a class opens.</p>';
    }
  });
}
