// ===== Think Nest Teacher Hub and Parent Hub: shared data =====
const HUBS = {
  teachers: { name: 'Beyond the Bell', kicker: 'Teacher Hub', img: 'images/tn-icon-teacher.png', ic: '👩‍🏫', color: '#3E4B94', grad: 'linear-gradient(120deg,#3E4B94,#6A78C9)', tagline: 'Life, growth and fun after the school day.',
    about: 'Workshops, courses and meetups for teachers’ own wellbeing, skills and ambitions, from finding balance to starting something of your own.',
    cats: [['wellbeing', '🌿', 'Wellbeing & balance', 'Stress, energy, boundaries and looking after yourself'], ['career', '🚀', 'Career growth & leadership', 'Leading teams, interviews, CVs and next steps'], ['digital', '🤖', 'AI & digital skills', 'AI tools, Canva, video and working smarter'], ['confidence', '🎤', 'Confidence & public speaking', 'Presenting, storytelling and speaking up'],
           ['venture', '💡', 'Start your own venture', 'Tutoring, content creation and side businesses'], ['creative', '🎨', 'Creativity & hobbies', 'Art, photography, writing and making'], ['languages', '🗣️', 'Languages', 'Arabic, English, French and more'], ['cafe', '☕', 'Teacher Café', 'Meetups, networking and sharing ideas']] },
  parents: { name: 'Beyond the School Run', kicker: 'Parent Hub', img: 'images/tn-icon-parent.png', ic: '👪', color: '#F27A6F', grad: 'linear-gradient(120deg,#F27A6F,#F6A49B)', tagline: 'A place to grow, recharge and connect.',
    about: 'Workshops, talks and classes for parents’ own wellbeing, skills and interests, plus a friendly community of other parents.',
    cats: [['selfcare', '💛', 'Self-care & wellbeing', 'Rest, calm, confidence and finding time for you'], ['family', '🏡', 'Family life & relationships', 'Communication, routines and a happier home'], ['cooking', '🥗', 'Healthy cooking & nutrition', 'Quick family meals, lunchboxes and healthy habits'], ['money', '💰', 'Money & family budgeting', 'Budgets, saving and planning ahead'],
           ['career', '💼', 'Career & side projects', 'Returning to work, new skills and starting a business'], ['creative', '🎨', 'Creative & hobby classes', 'Crafts, photography, baking and more'], ['fitness', '🧘', 'Fitness & mindfulness', 'Yoga, movement, breathing and sleep'], ['circles', '☕', 'Parent Circles', 'Meetups, talks and sharing experiences']] }
};
const hubPic = (H, cls) => `<span class="hub-pic ${cls || ''}"><img src="${H.img}" alt=""></span>`;
const hubCat = (aud, key) => { const h = HUBS[aud]; return h ? (h.cats.find(c => c[0] === key || c[2] === key) || null) : null; };
const hubEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function hubCourseCard(c, aud) {
  const cat = hubCat(aud, c.category);
  return `<a class="hub-course" href="start.html" style="--c:${HUBS[aud].color}">${cat ? `<span class="hub-tag">${cat[1]} ${hubEsc(cat[2])}</span>` : ''}<b>${hubEsc(c.title)}</b>
    <span class="hub-meta">${hubEsc([c.format, c.weeks ? c.weeks + ' weeks' : '', c.teacher_name ? 'with ' + c.teacher_name : ''].filter(Boolean).join(' · '))}</span>
    ${c.description ? `<small>${hubEsc(c.description.slice(0, 120))}${c.description.length > 120 ? '…' : ''}</small>` : ''}<span class="hub-go">Join →</span></a>`;
}

// ---------- The hub page (hub.html?for=teachers or parents) ----------
async function startHub() {
  const qs = new URLSearchParams(location.search), aud = qs.get('for') === 'parents' ? 'parents' : 'teachers';
  const H = HUBS[aud]; let pick = H.cats.some(c => c[0] === qs.get('topic')) ? qs.get('topic') : '';
  document.title = H.name + ' (' + H.kicker + ') – Think Nest';
  let courses = [];
  try { const { data } = await db.from('courses').select('id, title, description, teacher_name, weeks, audience, format, category').eq('audience', aud).order('id', { ascending: false }); courses = data || []; } catch (_) {}
  const other = aud === 'teachers' ? 'parents' : 'teachers';
  function draw() {
    const shown = courses.filter(c => !pick || c.category === pick);
    document.getElementById('hub-page').innerHTML = `
      <section class="hub-hero" style="background:${H.grad}">${hubPic(H, 'big')}<div><span class="hub-kicker">${H.kicker}</span><h1>${H.name}</h1><p class="hub-tagline">${H.tagline}</p><p>${H.about}</p>
        <div class="hub-hero-btns"><a class="btn btn-white" href="${aud === 'teachers' ? 'teacher-signup.html' : 'parent-signup.html'}">Join the ${H.name}</a><a class="btn hub-ghost" href="${aud === 'teachers' ? 'teacher-login.html' : 'parent-login.html'}">Log in</a></div></div></section>
      <h2 class="hub-h">Explore topics</h2>
      <div class="hub-cats">${H.cats.map(([k, ic, n, d]) => `<button type="button" class="hub-cat ${pick === k ? 'on' : ''}" data-hc="${k}" style="--c:${H.color}"><span>${ic}</span><b>${n}</b><small>${d}</small></button>`).join('')}</div>
      <h2 class="hub-h">${pick ? hubCat(aud, pick)[1] + ' ' + hubCat(aud, pick)[2] : 'What’s on'} ${pick ? '<button type="button" class="link-btn" data-hc="">Show all</button>' : ''}</h2>
      ${shown.length ? `<div class="hub-courses">${shown.map(c => hubCourseCard(c, aud)).join('')}</div>`
        : `<div class="hub-empty"><p>${pick ? 'Nothing in this topic yet.' : 'New workshops are being added.'} Join the ${H.name} to hear first, or tell us what you’d love to learn.</p><a class="btn btn-red" href="contact.html">Suggest a workshop</a></div>`}
      <section class="hub-host"><div><h2>Have a skill to share?</h2><p>Run a workshop for the ${H.name}: wellbeing, cooking, coding, crafts, careers, anything people would love to learn.</p></div><a class="btn btn-red" href="contact.html">Become a host</a></section>
      <p class="hub-switch">Looking for something else? <a href="hub.html?for=${other}">Visit ${HUBS[other].name}, the ${HUBS[other].kicker} →</a></p>`;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-hc]'); if (!b) return; pick = b.dataset.hc; draw(); });
  draw();
}

// ---------- Inside the parent or teacher account ----------
async function startHubInApp(aud) {
  const init = aud === 'parents' ? initParent : initTeacher;
  const ctx = await init();
  const uid = (ctx.user || ctx.me || {}).id || (await db.auth.getSession()).data.session.user.id;
  const H = HUBS[aud]; let pick = '';
  const box = document.getElementById('hub-app');
  const [{ data: cs }, { data: en }] = await Promise.all([
    db.from('courses').select('id, title, description, teacher_name, weeks, audience, format, category').eq('audience', aud).order('id', { ascending: false }),
    db.from('enrollments').select('course_id').eq('user_id', uid)
  ]);
  const courses = cs || [], joined = new Set((en || []).map(e => e.course_id));
  const { data: mem } = await db.from('hub_members').select('status').eq('user_id', uid).eq('hub', aud).maybeSingle();
  const isAdmin = ((ctx.profile || ctx.me || {}).role) === 'admin';
  let status = isAdmin ? 'approved' : (mem && mem.status) || 'none';
  const me = ctx.profile || ctx.me || {};
  const card = c => { const cat = hubCat(aud, c.category);
    return `<article class="hub-course" style="--c:${H.color}">${cat ? `<span class="hub-tag">${cat[1]} ${hubEsc(cat[2])}</span>` : ''}<b>${hubEsc(c.title)}</b>
      <span class="hub-meta">${hubEsc([c.format, c.weeks ? c.weeks + ' weeks' : '', c.teacher_name ? 'with ' + c.teacher_name : ''].filter(Boolean).join(' · '))}</span>
      ${c.description ? `<small>${hubEsc(c.description.slice(0, 140))}${c.description.length > 140 ? '…' : ''}</small>` : ''}
      ${joined.has(c.id) ? `<a class="btn btn-white outline hub-btn" href="course.html?id=${c.id}">✅ Joined · Open</a>` : status === 'approved' ? `<button type="button" class="btn btn-red hub-btn" data-hjoin="${c.id}">Join</button>` : '<span class="hub-lock">🔒 Members only</span>'}</article>`; };
  const cafe = aud === 'teachers' ? 'teacher-cafe.html' : 'parent-cafe.html', cafeName = aud === 'teachers' ? 'Teacher' : 'Parent';
  const memberBox = () => status === 'approved' ? `<div class="hub-hero-btns"><a class="btn btn-white" href="${cafe}">☕ Go to the ${cafeName} Café</a></div>`
    : status === 'pending' ? `<div class="hub-status pending">⏳ Your request to join is waiting for approval. We’ll let you know as soon as you’re in!</div>`
    : `<div class="hub-status">${status === 'declined' ? 'Your last request wasn’t approved. You can ask again, or contact us. ' : 'Join to take part in workshops and the ' + cafeName + ' Café. It’s free! '}<button type="button" class="btn btn-white" data-hreq>Request to join</button></div>`;
  function draw() {
    const mine = courses.filter(c => joined.has(c.id)), shown = courses.filter(c => !pick || c.category === pick);
    box.innerHTML = `<section class="hub-hero" style="background:${H.grad}">${hubPic(H, 'big')}<div><span class="hub-kicker">${H.kicker}</span><h1>${H.name}</h1><p class="hub-tagline">${H.tagline}</p><p>${H.about}</p>${memberBox()}</div></section>
      ${mine.length ? `<h2 class="hub-h">My workshops</h2><div class="hub-courses">${mine.map(card).join('')}</div>` : ''}
      <h2 class="hub-h">Explore topics</h2>
      <div class="hub-cats">${H.cats.map(([k, ic, n, d]) => `<button type="button" class="hub-cat ${pick === k ? 'on' : ''}" data-hc="${k}" style="--c:${H.color}"><span>${ic}</span><b>${n}</b><small>${d}</small></button>`).join('')}</div>
      <h2 class="hub-h">${pick ? hubCat(aud, pick)[1] + ' ' + hubCat(aud, pick)[2] : 'What’s on'} ${pick ? '<button type="button" class="link-btn" data-hc="">Show all</button>' : ''}</h2>
      ${shown.length ? `<div class="hub-courses">${shown.map(card).join('')}</div>` : `<div class="hub-empty"><p>${pick ? 'Nothing in this topic yet.' : 'New workshops are being added.'} Tell us what you’d love to learn!</p><a class="btn btn-red" href="contact.html">Suggest a workshop</a></div>`}
      <section class="hub-host"><div><h2>Have a skill to share?</h2><p>Run a workshop for the ${H.name}: wellbeing, cooking, careers, crafts, anything people would love to learn.</p></div><a class="btn btn-red" href="contact.html">Become a host</a></section>`;
  }
  box.addEventListener('click', async e => {
    const c = e.target.closest('[data-hc]'); if (c) { pick = c.dataset.hc; return draw(); }
    const rq = e.target.closest('[data-hreq]');
    if (rq) {
      rq.disabled = true; rq.textContent = 'Sending…';
      const { data, error } = await db.rpc('request_hub', { h: aud });
      if (error) { rq.disabled = false; rq.textContent = 'Request to join'; return say(friendly(error)); }
      status = data || 'pending';
      emailAdmin('New request to join ' + H.name, { Name: me.full_name || '', Email: (ctx.user || {}).email || '', Account: aud === 'teachers' ? 'Teacher' : 'Parent', Hub: H.name + ' (' + H.kicker + ')', 'What to do': 'Log in as admin and open Approvals → Hub requests to approve or decline.' });
      say('Request sent! Think Nest will approve it soon.'); return draw();
    }
    const j = e.target.closest('[data-hjoin]'); if (!j) return;
    j.disabled = true; j.textContent = 'Joining…';
    const { error } = await db.from('enrollments').insert({ user_id: uid, course_id: Number(j.dataset.hjoin) });
    if (error && !String(error.message).includes('duplicate')) { j.disabled = false; j.textContent = 'Join'; return say(friendly(error)); }
    joined.add(Number(j.dataset.hjoin)); say('You’ve joined! Find it under My workshops.'); draw();
  });
  draw();
}
// Small banner for the dashboards
function hubBanner(aud, hostId) {
  const b = document.getElementById(hostId); if (!b || typeof HUBS === 'undefined') return;
  const H = HUBS[aud], page = aud === 'parents' ? 'parent-hub.html' : 'teacher-hub.html';
  b.innerHTML = `<a class="hub-banner" href="${page}" style="background:${H.grad}">${hubPic(H)}<div><span class="hub-kicker">${H.kicker}</span><b>${H.name}</b><span>${H.tagline} ${H.cats.slice(0, 4).map(c => c[1]).join(' ')}</span></div><span class="hub-banner-go">Open →</span></a>`;
}

