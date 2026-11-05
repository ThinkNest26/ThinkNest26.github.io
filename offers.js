// ===== Think Nest home page: courses for students, teachers and parents =====
(function () {
  const OFFERS = {
    students: { intro: 'Live classes and courses that follow the British, IB and American curricula, from KG1 to Grade 12.',
      types: [['📘', 'Subject classes', 'English, Maths, Science and Arabic for every grade'], ['🎓', 'IGCSE & A Level', 'Exam preparation, revision and past-paper practice'], ['💻', 'Coding & STEM', 'Coding, robotics and hands-on projects'], ['🧠', 'Study skills', 'Planning, note-taking and revision strategies']],
      cta: [['#paths', 'Choose your path', 'btn-red'], ['signup.html', 'Sign up as a student', 'btn-white']] },
    _teachers: { intro: 'Professional development workshops and courses to help teachers grow, led by experienced educators.',
      types: [['🔍', 'Inquiry-based learning', 'Planning and teaching through inquiry'], ['🤖', 'AI in the classroom', 'Using AI tools safely and effectively'], ['📊', 'Assessment for learning', 'Feedback, rubrics and tracking progress'], ['🌈', 'Inclusion & differentiation', 'Meeting the needs of every learner']],
      cta: [['teacher-signup.html', 'Join as a teacher', 'btn-red'], ['teacher-login.html', 'Teacher log in', 'btn-white']] },
    _parents: { intro: 'Friendly workshops that help parents support their children’s learning and wellbeing at home.',
      types: [['📚', 'Reading at home', 'Phonics, reading together and building a love of books'], ['🗺️', 'Understanding the curriculum', 'What your child learns and how they are assessed'], ['🛡️', 'Online safety', 'Screen time, social media and staying safe online'], ['💛', 'Wellbeing & exams', 'Supporting confidence, routines and exam stress']],
      cta: [['parent-signup.html', 'Sign up as a parent', 'btn-red'], ['parent-login.html', 'Parent log in', 'btn-white']] }
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let courses = null;
  async function getCourses() {
    if (courses) return courses;
    try {
      if (typeof db === 'undefined') return (courses = []);
      const { data } = await db.from('courses').select('id, title, description, teacher_name, weeks, audience, format, subject, grade').order('id', { ascending: false }).limit(60);
      courses = data || [];
    } catch (_) { courses = []; }
    return courses;
  }
  async function show(aud) {
    document.querySelectorAll('[data-aud]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aud === aud)));
    const body = document.getElementById('offer-body');
    if (aud !== 'students' && typeof HUBS !== 'undefined') {
      const H = HUBS[aud], list = (await getCourses()).filter(c => c.audience === aud).slice(0, 3);
      body.innerHTML = `<div class="home-hub" style="background:${H.grad}"><div class="home-hub-top"><span class="hub-hero-ic">${H.ic}</span><div><h3>${H.name}</h3><p class="hub-tagline">${H.tagline}</p><p>${H.about}</p></div></div>
        <div class="home-hub-cats">${H.cats.map(([k, ic, n]) => `<a href="hub.html?for=${aud}" class="home-hub-cat"><span>${ic}</span>${n}</a>`).join('')}</div>
        ${list.length ? `<div class="hub-courses">${list.map(c => hubCourseCard(c, aud)).join('')}</div>` : ''}
        <div class="offer-cta"><a class="btn btn-white btn-big" href="hub.html?for=${aud}">Explore the ${H.name} →</a></div></div>`;
      return;
    }
    const o = OFFERS[aud];
    const list = (await getCourses()).filter(c => (c.audience || 'students') === aud).slice(0, 6);
    body.innerHTML = `<p class="offer-intro">${o.intro}</p>
      <div class="offer-types">${o.types.map(([ic, n, d]) => `<div class="offer-type"><span>${ic}</span><b>${n}</b><span>${d}</span></div>`).join('')}</div>
      ${list.length ? `<h3 class="offer-h">Available now</h3><div class="offer-courses">${list.map(c => `<a class="offer-course" href="start.html"><b>${esc(c.title)}</b><span>${esc([c.format, c.subject, c.grade, c.weeks ? c.weeks + ' weeks' : ''].filter(Boolean).join(' · ') || (c.teacher_name ? 'With ' + c.teacher_name : ''))}</span>${c.description ? `<small>${esc(c.description.slice(0, 110))}${c.description.length > 110 ? '…' : ''}</small>` : ''}</a>`).join('')}</div>`
        : `<p class="offer-soon">${aud === 'students' ? 'New classes are opening all the time.' : 'New ' + (aud === 'teachers' ? 'teacher' : 'parent') + ' workshops are coming soon.'} Create a free account to hear first.</p>`}
      <div class="offer-cta">${o.cta.map(([h, l, c]) => `<a href="${h}" class="btn ${c} btn-big">${l}</a>`).join('')}</div>`;
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('offer-body')) return;
    document.querySelectorAll('[data-aud]').forEach(b => b.addEventListener('click', () => show(b.dataset.aud)));
    show('students');
  });
})();
