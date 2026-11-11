// ===== Preview as a role (Think Nest for Schools): from the top bar of every page, full access leaders see any role's screens =====
// The screens follow the chosen role; the database still uses your real access.
(function () {
  if (typeof db === 'undefined' || !db.rpc) return;
  let pv = null; try { pv = JSON.parse(sessionStorage.getItem('tn_preview') || 'null'); } catch (_) {}
  const orig = db.rpc.bind(db);
  if (pv) {
    db.rpc = (fn, args, opts) => {
      const q = orig(fn, args, opts);
      if (fn !== 'my_schools') return q;
      return Promise.resolve(q).then(r => { if (r && Array.isArray(r.data)) r.data = r.data.map(s => s.id === pv.sid ? Object.assign({}, s, { my_role: pv.role, scope_grades: pv.grades || [], scope_subjects: pv.subjects || [] }) : s); return r; });
    };
    window.TN_PREVIEW = pv;
    pv.name = 'Sample ' + String(pv.label || 'Teacher').replace(/\s*\(.*\)$/, '').replace(/^School /, '');
  }
  const FULL = ['principal', 'vice_principal', 'assistant_principal', 'it', 'inclusion_lead'];
  const ROLES = [['teacher', '👩‍🏫', 'Teacher'], ['coordinator', '🎓', 'Grade level leader'], ['head_of_department', '📚', 'Subject coordinator'], ['inclusion_team', '🤝', 'Inclusion team (LSA)'],
    ['admin_staff', '🗂️', 'School admin'], ['inclusion_lead', '🧩', 'Inclusion lead'], ['it', '💻', 'IT'], ['assistant_principal', '🌍', 'PYP coordinator']];
  const E = s => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const exit = () => { sessionStorage.removeItem('tn_preview'); location.reload(); };
  document.addEventListener('DOMContentLoaded', async () => {
    if (pv) {
      const bar = document.createElement('div'); bar.className = 'tn-pv-bar'; bar.setAttribute('role', 'status');
      bar.innerHTML = `<span>👁️ <b>Previewing as ${E(pv.label || pv.role)}</b> · screens as this role sees them (the data is still yours)</span><button type="button" id="tn-pv-exit">Exit preview</button>`;
      document.body.appendChild(bar); document.documentElement.classList.add('tn-pv');
      document.getElementById('tn-pv-exit').onclick = exit;
      const ini = pv.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const setIni = () => { const pic = document.getElementById('me-initials-small') || document.querySelector('.bar-right .initials'); if (pic && pic.textContent !== ini) pic.textContent = ini; };
      setIni(); setTimeout(setIni, 800); setTimeout(setIni, 2000);
    }
    // the 👁️ button: only for a school's full access leaders (their real role)
    let sess = null; try { sess = (await db.auth.getSession()).data.session; } catch (_) {}
    if (!sess) return;
    const { data: scs } = await orig('my_schools');
    const S = (scs || []).find(s => FULL.includes(s.my_role)); if (!S) return;
    let spot = null; for (let k = 0; k < 30 && !(spot = document.querySelector('.bar-right')); k++) await new Promise(r => setTimeout(r, 120));
    if (!spot || document.getElementById('tn-pv-btn')) return;
    const cur = pv && ROLES.find(x => x[0] === pv.role);
    const wrap = document.createElement('div'); wrap.className = 'tn-pv-wrap';
    wrap.innerHTML = `<button type="button" class="tn-pv-btn ${pv ? 'on' : ''}" id="tn-pv-btn" aria-expanded="false" aria-haspopup="true" title="Preview Think Nest as another role">👁️ ${pv ? E(cur ? cur[2] : 'Preview') : 'Preview'}</button>
      <div class="tn-pv-menu" id="tn-pv-menu" hidden><b>👁️ Preview as a role</b><small>See any page as this role sees it. Only you see the preview.</small>
        <label>Role <select id="tn-pv-role">${ROLES.map(([k, ic, l]) => `<option value="${k}" ${pv && pv.role === k ? 'selected' : ''}>${ic} ${l}</option>`).join('')}</select></label>
        <label id="tn-pv-gl" hidden>Grade <select id="tn-pv-grade">${(S.grades || []).map(g => `<option ${pv && (pv.grades || [])[0] === g ? 'selected' : ''}>${E(g)}</option>`).join('')}</select></label>
        <label id="tn-pv-sl" hidden>Subject <select id="tn-pv-subj"><option>Maths</option></select></label>
        <button type="button" class="tn-pv-go" id="tn-pv-go">👁️ Preview this page</button>${pv ? '<button type="button" class="tn-pv-out" id="tn-pv-out">Exit preview</button>' : ''}</div>`;
    const lang = document.getElementById('tn-lang');
    if (lang && lang.parentNode === spot) spot.insertBefore(wrap, lang); else spot.prepend(wrap);
    const btn = wrap.querySelector('#tn-pv-btn'), menu = wrap.querySelector('#tn-pv-menu'), role = wrap.querySelector('#tn-pv-role');
    let subjLoaded = false;
    const sync = async () => {
      wrap.querySelector('#tn-pv-gl').hidden = role.value !== 'coordinator'; wrap.querySelector('#tn-pv-sl').hidden = role.value !== 'head_of_department';
      if (role.value === 'head_of_department' && !subjLoaded) {
        subjLoaded = true; const { data } = await db.from('schools').select('curriculum_map').eq('id', S.id).maybeSingle();
        const map = (data && data.curriculum_map) || {}, subs = Object.keys(map).filter(k => map[k] !== 'none');
        wrap.querySelector('#tn-pv-subj').innerHTML = (subs.length ? subs : ['English', 'Maths', 'Science']).map(x => `<option ${pv && (pv.subjects || [])[0] === x ? 'selected' : ''}>${E(x)}</option>`).join('');
      }
    };
    role.onchange = sync; sync();
    btn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    wrap.querySelector('#tn-pv-go').onclick = () => {
      const r = role.value, l = ROLES.find(x => x[0] === r)[2], g = wrap.querySelector('#tn-pv-grade').value, sj = wrap.querySelector('#tn-pv-subj').value;
      sessionStorage.setItem('tn_preview', JSON.stringify({ sid: S.id, role: r, grades: r === 'coordinator' ? [g] : [], subjects: r === 'head_of_department' ? [sj] : [],
        label: r === 'coordinator' ? `${l} (${g})` : r === 'head_of_department' ? `${l} (${sj})` : l }));
      location.reload();
    };
    const out = wrap.querySelector('#tn-pv-out'); if (out) out.onclick = exit;
  });
})();
// ===== Shared helpers =====
const toast = document.getElementById('toast');
let toastTimer;
function say(msg) {
  if (!toast) return alert(msg);
  // show the message on top of any open pop-up window, not hidden behind it
  const open = [...document.querySelectorAll('dialog[open]')].pop();
  const host = open || document.body;
  if (toast.parentElement !== host) host.appendChild(toast);
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
const ALREADY_MSG = 'An account with this email already exists. Please log in, or use “Forgot password?” if you can’t remember the password. Already a teacher and also a parent (or the other way round)? You don’t need a second account: log in, open Account settings and switch on “I’m also a parent” or “Apply to teach”.';
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
  if (m.includes('captcha')) return 'The “Verify you are human” check didn’t finish, so we couldn’t log you in. Click “🔄 Try the check again”, or try another browser. A privacy or ad-blocking extension can stop this check.';
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
  // one tap is enough: go straight to the right log in page
  if (p.dataset.go) location.href = p.dataset.go; else if (nextBtn) nextBtn.disabled = false;
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
  if (p && p.role === 'school_leader') return 'school.html';
  if (p && p.role === 'teacher') return 'teacher-dashboard.html';
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
    let email = form.email.value.trim(); const password = form.password.value;
    if (!email || !password) return showError(err, 'Enter your email (or username) and password.');
    // students created by a teacher log in with a username, for example zahra.n27
    if (!email.includes('@')) email = email.toLowerCase().replace(/\s+/g, '') + '@students.thinknestonline.com';
    if (typeof captchaMissing === 'function' && captchaMissing()) return showError(err, CAPTCHA_MSG);
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Logging in…';
    const { data: d, error } = await db.auth.signInWithPassword({ email, password, options: { captchaToken: (typeof captchaToken === 'function' ? captchaToken() : undefined) } });
    if (typeof captchaReset === 'function') captchaReset();
    btn.disabled = false; btn.textContent = 'Log in';
    if (error) return showError(err, friendly(error));
    // the School Leader log in page is only for school leaders and admins
    if (/school-login\.html$/.test(location.pathname)) {
      const [{ data: p }, { data: lead }, { data: req }] = await Promise.all([
        db.from('profiles').select('role').eq('id', d.user.id).maybeSingle(),
        db.from('school_members').select('role').eq('user_id', d.user.id).not('role', 'in', '(student,parent)'),
        db.from('school_requests').select('id').eq('user_id', d.user.id).limit(1)]);
      const asLeader = new URLSearchParams(location.search).get('as') === 'leader';
      const LEAD = ['principal', 'vice_principal', 'assistant_principal', 'it', 'coordinator', 'head_of_department', 'inclusion_lead', 'admin_staff'];
      const roles = (lead || []).map(x => x.role), isLeader = roles.some(r => LEAD.includes(r)) || (p && p.role === 'admin') || (req && req.length);
      if (asLeader && !isLeader && roles.length) { await db.auth.signOut(); return showError(err, 'This is a school staff account. Please go back and choose Schools → School Staff.'); }
      if (!asLeader && isLeader && !roles.some(r => !LEAD.includes(r)) && roles.length) { /* leaders may also use the staff door */ }
      const ok = (p && ['school_leader', 'admin'].includes(p.role)) || roles.length || (req && req.length);
      if (!ok) {
        await db.auth.signOut();
        const r = (p && p.role) || 'student';
        return showError(err, r === 'teacher'
          ? 'This account isn’t part of a school. If you teach online with Think Nest, go back and choose Log in → Online Teacher. If your school added you, check you’re using your school email.'
          : `This is a ${r} account, not a school staff account. Please go back and choose Log in → ${r === 'parent' ? 'Parent' : 'Student'}. (If your browser filled in a saved login, check the email.)`);
      }
    }
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
    { const ag = document.querySelector('#signup-final .agree-box'); if (ag) ag.style.setProperty('display', n === steps.length - 1 ? 'flex' : 'none', 'important'); }
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
  next.addEventListener('click', () => { if (ageCheck()) return; const f2 = form.password2; if (f2 && steps[i].contains(f2) && form.password.value !== f2.value) { f2.focus(); return showError(document.getElementById('signup-error') || err, 'The two passwords don’t match.'); } if (valid(steps[i])) show(i + 1); });
  back.addEventListener('click', () => show(i - 1));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!valid(steps[i])) return;
    const f = form;
    if (f.password2 && f.password.value !== f.password2.value) { show(steps.findIndex(s => s.contains(f.password2))); f.password2.focus(); return showError(document.getElementById('signup-error') || err, 'The two passwords don’t match.'); }
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

  (document.getElementById('logout') || document.createElement('a')).addEventListener('click', async e => {
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
  await liveProgress(uid, myEnr);
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
              : `<a class="btn btn-red btn-small" href="course-details.html?id=${c.id}">View course details</a>`}
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

// ----- Safety filter: check text before it's shared (blocked posts never appear; the teacher is told)
async function tnBlocked(body, place, gid) {
  try {
    const { data, error } = await db.rpc('check_post_text', { body, place, gid: gid || null });
    if (error || !data) return false;
  } catch (_) { return false; }
  const ar = typeof tnLang === 'function' && tnLang() === 'ar';
  say(ar ? '🙅 لم تتم المشاركة لأنها تحتوي على كلمات غير مسموح بها في ثينك نست. استخدم كلمات لطيفة من فضلك. تم إبلاغ معلّمك.'
         : '🙅 This wasn’t shared because it contains words that aren’t allowed on Think Nest. Please use kind words. Your teacher has been told.');
  return true;
}

// ----- Remember where a sign-up started (e.g. Beyond the Bell), so "Back" returns there -----
(function () {
  try {
    const page = location.pathname.split('/').pop();
    if (/^(teacher-signup|parent-signup|signup)\.html$/.test(page) && document.referrer) {
      const r = new URL(document.referrer);
      if (r.origin === location.origin && /(hub|teacher-hub|parent-hub|index|path|wellbeing)\.html|\/$/.test(r.pathname)) sessionStorage.setItem('tn_return', r.pathname.split('/').pop() + r.search + r.hash);
    }
    if (/^(teacher-pending|pending)\.html$/.test(page)) {
      const back = sessionStorage.getItem('tn_return');
      document.addEventListener('DOMContentLoaded', () => {
        if (!back) return;
        const a = document.querySelector('.step-buttons a[href="index.html"]'); if (!a) return;
        a.href = back; a.textContent = /hub/.test(back) ? '‹ Back to the workshops' : '‹ Back to where you were';
      });
    }
  } catch (_) {}
})();

// ----- Course progress worked out from the lessons a student has finished (so new lessons lower the %) -----
async function liveProgress(uid, enrolls) {
  try {
    const ids = [...new Set((enrolls || []).map(e => e.course_id))]; if (!ids.length) return enrolls;
    const [ls, lp] = await Promise.all([db.from('lessons').select('id, course_id').in('course_id', ids), db.from('lesson_progress').select('lesson_id').eq('user_id', uid)]);
    if (ls.error || lp.error) return enrolls;
    const done = new Set((lp.data || []).map(x => x.lesson_id)), by = {};
    (ls.data || []).forEach(l => (by[l.course_id] = by[l.course_id] || []).push(l.id));
    enrolls.forEach(e => {
      const L = by[e.course_id] || []; if (!L.length) return;
      const p = Math.round(L.filter(x => done.has(x)).length / L.length * 100);
      // only lower a stored 100% when there are unfinished lessons; never wipe progress made before lessons were tracked
      if (p < e.progress && L.some(x => !done.has(x)) && done.size) { e.progress = p; db.from('enrollments').update({ progress: p }).eq('id', e.id).then(() => {}); }
      else if (p > e.progress) { e.progress = p; db.from('enrollments').update({ progress: p }).eq('id', e.id).then(() => {}); }
    });
  } catch (_) {}
  return enrolls;
}

// ----- Grade boxes: ask for the curriculum first, then show Year levels for British (Grade 1 = Year 2) -----
function tnYearLabel(g) {
  if (g === 'KG1') return 'Reception (KG1)';
  if (g === 'KG2') return 'Year 1 (KG2)';
  const m = /^Grade (\d+)$/.exec(g || '');
  return m ? 'Year ' + (Number(m[1]) + 1) + ' (Grade ' + m[1] + ')' : g;
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach(f => {
    const g = f.querySelector('select[name=grade]'), c = f.querySelector('select[name=curriculum]');
    if (!g || !c) return;
    const gl = g.closest('label'), cl = c.closest('label');
    if (gl && cl && gl.parentNode === cl.parentNode && gl.compareDocumentPosition(cl) & Node.DOCUMENT_POSITION_FOLLOWING) gl.parentNode.insertBefore(cl, gl);
    [...g.options].forEach(o => { if (o.value) { o.value = o.value; o.dataset.grade = o.value; } });
    const relabel = () => {
      const british = /british/i.test(c.value);
      [...g.options].forEach(o => { if (o.dataset.grade) o.textContent = british ? tnYearLabel(o.dataset.grade) : o.dataset.grade; else o.textContent = british ? 'Select your year' : 'Select your grade'; });
      if (gl && gl.firstChild && gl.firstChild.nodeType === 3 && /\S/.test(gl.firstChild.textContent)) gl.firstChild.textContent = (british ? 'Year' : 'Grade') + ' ';
    };
    c.addEventListener('change', relabel);
    relabel(); setTimeout(relabel, 1500); // again after saved details load
  });
});
