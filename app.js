// ===== Shared helpers =====
const toast = document.getElementById('toast');
let toastTimer;
function say(msg) {
  if (!toast) return alert(msg);
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function soon(what) { say(what + ' is coming soon.'); }
document.querySelectorAll('[data-soon]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); soon(el.dataset.soon); }));
document.querySelectorAll('[data-soon-input]').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') soon(el.dataset.soonInput); }));

// Images: try the "@2x" file name, then hide if missing
document.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
  if (!img.dataset.tried) { img.dataset.tried = '1'; img.src = img.getAttribute('src').replace('.png', '@2x.png'); }
  else img.classList.add('missing');
}));

// Show / hide password
document.querySelectorAll('[data-eye]').forEach(eye => eye.addEventListener('click', () => {
  const pw = document.getElementById(eye.dataset.eye);
  pw.type = pw.type === 'password' ? 'text' : 'password';
  eye.setAttribute('aria-label', pw.type === 'password' ? 'Show password' : 'Hide password');
}));

// Supabase returns a user with no identities when the email is already registered
function alreadyRegistered(data) { return !!(data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0); }
const ALREADY_MSG = 'An account with this email already exists. Please log in, or use “Forgot password?” if you can’t remember the password.';
// Every account must be approved by the Think Nest admin before it can be used
function gateApproval(p) {
  if (p && p.role !== 'admin' && p.account_status && p.account_status !== 'approved' && !/pending\.html$/.test(location.pathname)) {
    location.href = 'pending.html'; throw new Error('waiting for approval');
  }
}
// Admin emails are now sent automatically by Think Nest (database update 39), so nothing to do here
function emailAdmin() {}
function showError(el, msg) { el.textContent = msg; el.hidden = !msg; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function friendly(err) {
  const m = (err && err.message || '').toLowerCase();
  if (m.includes('captcha')) return 'Please wait for the “Verify you are human” box to show a tick, then try again.';
  if (m.includes('invalid login')) return 'That email and password don’t match. Check them and try again, or click “Forgot password?” to choose a new one.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Open the email we sent you and click the link (check spam too).';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try logging in instead.';
  if (m.includes('password')) return 'Choose a password with at least 8 characters.';
  if (m.includes('rate limit')) return 'Too many tries in a short time. Wait a few minutes and try again.';
  if (m.includes('fetch')) return 'Can’t reach Think Nest right now. Check your internet connection and try again.';
  return err && err.message ? err.message : 'Something went wrong. Please try again.';
}

// ===== Choose your role =====
const picks = document.querySelectorAll('.pick');
const nextBtn = document.getElementById('next');
let chosen = null;
picks.forEach(p => p.addEventListener('click', () => {
  picks.forEach(x => x.setAttribute('aria-checked', 'false'));
  p.setAttribute('aria-checked', 'true');
  chosen = p;
  nextBtn.disabled = false;
}));
if (nextBtn) nextBtn.addEventListener('click', () => {
  if (!chosen) return;
  if (chosen.dataset.go) location.href = chosen.dataset.go;
  else soon(chosen.dataset.soon);
});

// ===== Log in =====
async function homeFor(userId) {
  const { data: p } = await db.from('profiles').select('role, requested_role, also_parent, account_status').eq('id', userId).maybeSingle();
  // the parent log in page takes teachers who are also parents to the parent view
  const wantsParent = /parent-login/.test(location.pathname);
  if (p && p.role !== 'admin' && p.account_status && p.account_status !== 'approved' && p.requested_role !== 'teacher') return 'pending.html';
  if (wantsParent && p && p.also_parent && ['teacher', 'school_leader', 'admin'].includes(p.role)) return 'parent-dashboard.html';
  if (p && p.role === 'admin') return 'admin.html';
  if (p && p.role === 'parent') return 'parent-dashboard.html';
  if (p && (p.role === 'teacher' || p.role === 'school_leader')) return 'teacher-dashboard.html';
  if (p && p.requested_role === 'teacher') return 'teacher-pending.html';
  return 'student-dashboard.html';
}
async function startLoginPage() {
  const { data } = await db.auth.getSession();
  const form = document.getElementById('login-form');
  if (data.session) {
    const { data: p } = await db.from('profiles').select('full_name, role').eq('id', data.session.user.id).maybeSingle();
    const who = (p && p.full_name) || data.session.user.email;
    const roleName = { admin: 'admin', parent: 'parent', teacher: 'teacher', school_leader: 'school leader', student: 'student' }[p && p.role] || 'user';
    const box = document.createElement('div');
    box.className = 'note big-note signed-in';
    box.innerHTML = `You’re already logged in as <b>${esc(who)}</b> (${roleName}).<div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" id="switch-acc">Log out and use another account</button><button type="button" class="btn btn-red auth-btn" id="go-home">Continue</button></div>`;
    form.before(box); form.hidden = true;
    document.getElementById('go-home').addEventListener('click', async () => { location.href = await homeFor(data.session.user.id); });
    document.getElementById('switch-acc').addEventListener('click', async () => { await db.auth.signOut(); box.remove(); form.hidden = false; form.email.focus(); });
  }
  const err = document.getElementById('login-error');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    showError(err, '');
    const email = form.email.value.trim(), password = form.password.value;
    if (!email || !password) return showError(err, 'Enter your email and password.');
    if (typeof captchaMissing === 'function' && captchaMissing()) return showError(err, CAPTCHA_MSG);
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Logging in…';
    const { data: d, error } = await db.auth.signInWithPassword({ email, password, options: { captchaToken: (typeof captchaToken === 'function' ? captchaToken() : undefined) } });
    if (typeof captchaReset === 'function') captchaReset();
    btn.disabled = false; btn.textContent = 'Log in';
    if (error) return showError(err, friendly(error));
    location.href = await homeFor(d.user.id);
  });
}

// ===== Sign up (3 steps) =====
function startSignupPage() {
  try {
    const p = JSON.parse(localStorage.getItem('tn_path') || 'null'), f = document.getElementById('signup-form');
    if (p && f) {
      const label = { british: 'British Curriculum (England / IGCSE)', ib: 'International Baccalaureate (IB)', american: 'American Curriculum' }[p.curriculum];
      if (p.grade && f.grade) f.grade.value = p.grade;
      if (label && f.curriculum) f.curriculum.value = label;
    }
  } catch (_) {}
  if (typeof curriculumHelper === 'function') setTimeout(() => curriculumHelper(document.getElementById('signup-form'), 'cur-help'), 0);
  const form = document.getElementById('signup-form');
  const err = document.getElementById('signup-error');
  const steps = [...form.querySelectorAll('.step')];
  const dots = [...document.querySelectorAll('.steps li')];
  const back = document.getElementById('back'), next = document.getElementById('next-step'), create = document.getElementById('create');
  let i = 0;
  function show(n) {
    i = n;
    steps.forEach((s, k) => s.hidden = k !== n);
    dots.forEach((d, k) => d.classList.toggle('on', k <= n));
    back.hidden = n === 0; next.hidden = n === steps.length - 1; create.hidden = n !== steps.length - 1;
    showError(err, '');
    const first = steps[n].querySelector('input, select'); if (first) first.focus();
  }
  function valid(step) {
    for (const f of step.querySelectorAll('input, select')) {
      if (!f.checkValidity()) {
        f.focus();
        if (f.type === 'checkbox') return showError(err, 'A parent or guardian needs to tick the box to agree.'), false;
        if (f.type === 'email') return showError(err, 'Enter a valid email address.'), false;
        if (f.type === 'password') return showError(err, 'Choose a password with at least 8 characters.'), false;
        return showError(err, 'Please fill in ' + f.closest('label').firstChild.textContent.trim().toLowerCase() + '.'), false;
      }
    }
    return true;
  }
  // Children under 13 need a parent to create their account (unless they came from their parent's invite link)
  const ageSel = document.getElementById('age'), stop = document.getElementById('age-stop');
  const invited = () => new URLSearchParams(location.search).has('parent_email');
  const under13 = () => ageSel && ageSel.value && Number(ageSel.value) < 13 && !invited();
  const ageCheck = () => {
    if (!ageSel) return false;
    const block = under13();
    stop.hidden = !block;
    steps[0].querySelectorAll('label').forEach(l => { if (!l.contains(ageSel)) l.hidden = block; });
    next.hidden = block;
    return block;
  };
  if (ageSel) {
    ageSel.addEventListener('change', ageCheck);
    const sh = document.getElementById('age-share');
    if (sh) sh.addEventListener('click', async () => {
      const url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'parent-signup.html';
      const text = 'Please create my Think Nest account. Sign up as a parent here and add me as your child: ' + url;
      if (navigator.share) { try { await navigator.share({ title: 'Think Nest', text, url }); return; } catch (_) {} }
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
  }
  next.addEventListener('click', () => { if (ageCheck()) return; if (valid(steps[i])) show(i + 1); });
  back.addEventListener('click', () => show(i - 1));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!valid(steps[i])) return;
    const f = form;
    if (f.agree_terms && !f.agree_terms.checked) { f.agree_terms.focus(); return showError(document.getElementById('signup-error') || err, 'Please tick the box to agree to the Terms of use.'); }
    if (f.age && Number(f.age.value) < 13 && !new URLSearchParams(location.search).has('parent_email')) { show(0); ageCheck(); return; }
    if (typeof captchaMissing === 'function' && captchaMissing()) { return showError(document.getElementById('signup-error'), CAPTCHA_MSG); }
    create.disabled = true; create.textContent = 'Creating account…';
    const { data, error } = await db.auth.signUp({
      email: f.email.value.trim(),
      password: f.password.value,
      options: { captchaToken: (typeof captchaToken === 'function' ? captchaToken() : undefined),  data: {
        full_name: f.full_name.value.trim(), role: 'student', age: f.age ? f.age.value : '', agreed_terms: true, lang: (typeof tnLang === 'function' ? tnLang() : 'en'),
        grade: f.grade.value, curriculum: f.curriculum.value, school: f.school.value.trim(),
        parent_name: f.parent_name.value.trim(), parent_email: f.parent_email.value.trim(),
        parent_consent: f.parent_consent.checked
      } }
    });
    if (typeof captchaReset === 'function') captchaReset();
    create.disabled = false; create.textContent = 'Create account';
    if (error) return showError(err, friendly(error));
    if (alreadyRegistered(data)) { if (typeof btn !== 'undefined' && btn) { btn.disabled = false; } return showError(err, ALREADY_MSG); }
    emailAdmin('New student account waiting for approval', { Name: f.full_name.value.trim(), Email: f.email.value.trim(), Account: 'Student', Grade: f.grade.value, Curriculum: f.curriculum.value, School: f.school.value.trim(), 'Parent name': f.parent_name.value.trim(), 'Parent email': f.parent_email.value.trim(), 'What to do': 'Log in as admin and open Approvals → New accounts.' });
    if (data.session) location.href = 'pending.html';
    else { document.getElementById('signup-form').innerHTML = '<div class="note big-note"><b>Almost done! 🎉</b><br>Your account has been created. The Think Nest team will check and approve it, usually within one working day. We’ve also sent an email to <b>' + esc(f.email.value.trim()) + '</b> with a link to confirm your address (check spam too).</div><a class="btn btn-red auth-btn" href="login.html">Go to log in</a>'; }
  });
  show(0);
}

// ===== Student dashboard =====
const PHOTOS = ['tn-demo-learn-1', 'tn-demo-learn-2', 'tn-demo-learn-3', 'tn-demo-learn-4', 'tn-demo-code-1', 'tn-demo-code-2', 'tn-demo-code-3'];
function when(ts) {
  return new Date(ts).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}
function relative(ts) {
  const mins = Math.round((new Date(ts) - Date.now()) / 60000);
  if (mins <= 0 && mins > -60) return ['Now', true];
  if (mins < 60) return ['In ' + mins + ' mins', false];
  if (mins < 60 * 24) { const h = Math.round(mins / 60); return ['In ' + h + (h === 1 ? ' hour' : ' hours'), false]; }
  { const n = Math.round(mins / 1440); return [n === 1 ? 'Tomorrow' : 'In ' + n + ' days', false]; }
}

async function startDashboard() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'login.html'; return; }
  const { data: gp } = await db.from('profiles').select('role, account_status').eq('id', session.user.id).maybeSingle();
  gateApproval(gp);
  document.body.classList.remove('loading');
  const uid = session.user.id;

  document.getElementById('logout').addEventListener('click', async e => {
    e.preventDefault(); await db.auth.signOut(); location.href = 'index.html';
  });
  const side = document.getElementById('side'), shade = document.getElementById('side-shade'), st = document.getElementById('side-toggle');
  st.addEventListener('click', () => { side.classList.add('open'); shade.classList.add('show'); });
  shade.addEventListener('click', () => { side.classList.remove('open'); shade.classList.remove('show'); });
  document.querySelectorAll('.arrows').forEach(a => {
    const row = document.getElementById(a.dataset.target);
    const [prev, nxt] = a.querySelectorAll('button');
    prev.addEventListener('click', () => row.scrollBy({ left: -row.clientWidth * 0.8, behavior: 'smooth' }));
    nxt.addEventListener('click', () => row.scrollBy({ left: row.clientWidth * 0.8, behavior: 'smooth' }));
  });

  const [prof, courses, mentors, sessions, enr, lessons] = await Promise.all([
    db.from('profiles').select('*').eq('id', uid).maybeSingle(),
    db.from('courses').select('*').order('id'),
    db.from('mentors').select('*').order('id'),
    db.from('sessions').select('*, courses(title), mentors(name)').gte('starts_at', new Date(Date.now() - 3600000).toISOString()).order('starts_at').limit(6),
    db.from('enrollments').select('*').eq('user_id', uid),
    db.from('lessons').select('*, courses(title, teacher_name, weeks, level)').order('position')
  ]);
  const anyErr = [prof, courses, mentors, sessions, enr, lessons].find(r => r.error);
  if (anyErr) say(friendly(anyErr.error));

  // Profile
  const p = prof.data || {};
  const name = p.full_name || session.user.email;
  document.getElementById('me-name').textContent = name;
  document.getElementById('me-sub').textContent = [p.grade, p.curriculum, p.school].filter(Boolean).join(' · ') || 'Student';
  const initials = (p.full_name || session.user.email).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('me-initials').textContent = initials;
  document.getElementById('me-initials-small').textContent = initials;
  const first = (p.full_name || '').split(' ')[0];
  if (first) document.getElementById('me-first').textContent = ', ' + first;

  // Stats
  const myEnr = enr.data || [];
  document.getElementById('st-enrolled').textContent = myEnr.length;
  document.getElementById('st-active').textContent = myEnr.filter(e => e.progress < 100).length;
  document.getElementById('st-done').textContent = myEnr.filter(e => e.progress >= 100).length;
  document.getElementById('st-mentors').textContent = (mentors.data || []).length;

  // Upcoming live classes
  const ses = sessions.data || [];
  document.getElementById('next-class').textContent = ses[0] ? when(ses[0].starts_at) : 'No classes scheduled yet';
  document.getElementById('journeys').innerHTML = ses.length ? ses.map((s, k) => {
    const [rel, live] = relative(s.starts_at);
    const join = s.meeting_link ? `<a class="pill ${live ? 'pill-live' : 'pill-soft'}" href="${esc(s.meeting_link)}" target="_blank" rel="noopener">Join session</a>`
                                : `<button class="pill pill-soft" data-msg="The joining link will appear here before the class starts.">Join session</button>`;
    return `<article class="journey">
      <img src="images/tn-demo-journey-${(k % 2) + 1}.png" alt="">
      <div>
        <span class="meta">${esc(s.courses ? s.courses.title : 'Live class')}${s.mentors ? ' · with ' + esc(s.mentors.name) : ''}</span>
        <h4>${esc(s.title)}</h4>
        <div class="row"><span class="when">${esc(when(s.starts_at))}</span></div>
        <div class="row">${join}<span class="tag ${live ? 'tag-now' : ''}">${rel}</span></div>
      </div></article>`;
  }).join('') : '<p class="empty">No live classes scheduled yet. Check back soon.</p>';

  // Mentors
  const ms = mentors.data || [];
  document.getElementById('mentors').innerHTML = ms.length ? ms.map(m => `<article class="mentor">
      <div class="mentor-top"><img src="${m.photo_url ? esc(m.photo_url) : 'images/tn-demo-mentor.png'}" alt=""><div><h4>${esc(m.name)}</h4><span>${esc(m.subject || '')}</span></div></div>
      <span class="when">${esc(m.bio || '')}</span>
      <div class="row"><a class="pill pill-soft" href="mentors.html#m${m.id}">Book a session</a></div>
    </article>`).join('') : '<p class="empty">Mentors will appear here soon.</p>';

  // Courses
  const enrolledIds = new Set(myEnr.map(e => e.course_id));
  const cs = courses.data || [];
  function renderCourses() {
    document.getElementById('learning').innerHTML = cs.length ? cs.map((c, k) => {
      const e = myEnr.find(x => x.course_id === c.id);
      return `<article class="learn">
        <img src="${c.image_url ? esc(c.image_url) : 'images/' + PHOTOS[k % PHOTOS.length] + '.png'}" alt="">
        <div class="learn-body">
          <span class="meta">${esc(c.category || '')}${c.weeks ? ' · ' + c.weeks + ' weeks' : ''} · ${esc(c.level || '')}</span>
          <h4>${esc(c.title)}</h4>
          <p class="desc">${esc(c.description || '')}</p>
          ${e ? `<div class="row"><a class="pill pill-soft" href="course.html?id=${c.id}">Continue</a><span class="done">${e.progress}% completed</span></div>`
              : `<button class="btn btn-red btn-small" data-join="${c.id}">Join course</button>`}
        </div></article>`;
    }).join('') : '<p class="empty">Courses will appear here soon.</p>';
  }
  renderCourses();
  document.getElementById('learning').addEventListener('click', async e => {
    const b = e.target.closest('[data-join]'); if (!b) return;
    b.disabled = true; b.textContent = 'Joining…';
    const { data, error } = await db.from('enrollments').insert({ user_id: uid, course_id: Number(b.dataset.join) }).select().single();
    if (error) { b.disabled = false; b.textContent = 'Join course'; return say(friendly(error)); }
    myEnr.push(data); enrolledIds.add(data.course_id);
    document.getElementById('st-enrolled').textContent = myEnr.length;
    document.getElementById('st-active').textContent = myEnr.filter(x => x.progress < 100).length;
    renderCourses(); say('You’ve joined the course!');
  });

  // Code. Build. Imagine – curriculum from the coding course lessons
  const ls = (lessons.data || []).filter(l => l.courses && l.courses.title === 'Introduction to Coding');
  document.getElementById('curriculum').innerHTML = ls.map(l => `<li><b>${String(l.position).padStart(2, '0')}</b>${esc(l.title)}</li>`).join('');
  if (ls[0] && ls[0].courses.teacher_name) document.getElementById('code-teacher').textContent = 'By ' + ls[0].courses.teacher_name;

  // Small messages for buttons that aren't built yet
  document.body.addEventListener('click', e => {
    const m = e.target.closest('[data-msg]'); if (m) say(m.dataset.msg);
    const s = e.target.closest('[data-soon-msg]'); if (s) soon(s.dataset.soonMsg);
  });
}

// Ask before logging out (from the design's "Are you sure you want to log out?" pop-up)
document.addEventListener('click', e => {
  const lo = e.target.closest('#logout');
  if (lo && !confirm('Are you sure you want to log out? Logging out will end your current session.')) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);


// ===== Forgot / reset password =====
const SITE = 'https://thinknestonline.com/';
function startForgot() {
  const f = document.getElementById('forgot-form'), err = document.getElementById('forgot-error');
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    if (!f.email.checkValidity()) return showError(err, 'Enter a valid email address.');
    if (typeof captchaMissing === 'function' && captchaMissing()) return showError(err, CAPTCHA_MSG);
    const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending…';
    const { error } = await db.auth.resetPasswordForEmail(f.email.value.trim(), { redirectTo: SITE + 'reset.html', captchaToken: (typeof captchaToken === 'function' ? captchaToken() : undefined) });
    if (typeof captchaReset === 'function') captchaReset();
    btn.disabled = false; btn.textContent = 'Send reset link';
    if (error) return showError(err, friendly(error));
    document.getElementById('forgot-done').hidden = false;
  });
}
function startReset() {
  const f = document.getElementById('reset-form'), err = document.getElementById('reset-error'), sub = document.getElementById('reset-sub');
  let ready = false;
  const show = () => { if (ready) return; ready = true; sub.textContent = 'Type your new password below.'; f.hidden = false; f.password.focus(); };
  db.auth.onAuthStateChange((ev, session) => { if (ev === 'PASSWORD_RECOVERY' || (session && location.hash.includes('type=recovery'))) show(); });
  db.auth.getSession().then(({ data }) => { if (data.session) show(); });
  setTimeout(() => { if (!ready) { sub.textContent = 'This reset link has expired or was already used.'; document.getElementById('reset-again').hidden = false; } }, 4000);
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    if (f.password.value.length < 8) return showError(err, 'Choose a password with at least 8 characters.');
    if (f.password.value !== f.password2.value) return showError(err, 'The two passwords don’t match.');
    const { data, error } = await db.auth.updateUser({ password: f.password.value });
    if (error) return showError(err, friendly(error));
    say('Password changed. Taking you to your account…');
    setTimeout(async () => { location.href = await homeFor(data.user.id); }, 1200);
  });
}

// Privacy notice and Terms of use in every footer
function addLegalLinks() {
  document.querySelectorAll('.footer-links').forEach(ul => {
    [['help.html', 'Help Centre'], ['privacy.html', 'Privacy notice'], ['terms.html', 'Terms of use']].forEach(([h, t]) => {
      if (!ul.querySelector(`a[href="${h}"]`)) { const li = document.createElement('li'); li.innerHTML = `<a href="${h}">${t}</a>`; ul.appendChild(li); }
    });
  });
}
document.addEventListener('DOMContentLoaded', addLegalLinks);
