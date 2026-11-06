// ===== Think Nest sidebar: a few main sections with drop-down sub-menus =====
// Uses db from supabase-config.js
(function () {
  const MENUS = {
    student: [
      { ic: '🏠', label: 'Dashboard', href: 'student-dashboard.html' },
      { ic: '📚', label: 'Learning', items: [['my-courses.html', 'My Courses'], ['all-courses.html', 'All Courses'], ['calendar.html', 'My Calendar'], ['revision.html', 'Revision Hub'], ['mentors.html', 'Mentors'], ['recordings.html', 'My Recordings'], ['files.html', 'My Files']] },
      { ic: '🏆', label: 'My Progress', items: [['rewards.html', 'My Rewards'], ['certificates.html', 'My Certificates']] },
      { ic: '💬', label: 'Community', items: [['community.html', 'Community'], ['classes.html', 'My Classes'], ['groups.html', 'Study Groups'], ['friends.html', 'My Friends'], ['messages.html', 'Messages']] },
      { ic: '⚙️', label: 'Account', items: [['settings.html', 'Account Settings'], ['help.html', 'Help Centre'], ['contact.html', 'Contact Us'], ['#logout', 'Log out']] }
    ],
    teacher: [
      { ic: '🏠', label: 'Dashboard', href: 'teacher-dashboard.html' },
      { ic: '📚', label: 'Teaching', items: [['teacher-courses.html', 'My Courses'], ['teacher-calendar.html', 'Live Classes'], ['teacher-insights.html', '📊 Class Insights'], ['revision.html', 'Revision Hub'], ['teacher-hub.html', 'Beyond the Bell (hub)']] },
      { ic: '🏫', label: 'My Classes', items: [['classes.html', 'My Classes'], ['teacher-attendance.html', 'Attendance'], ['groups.html', 'Study Groups']] },
      { ic: '🏅', label: 'Certificates', href: 'teacher-certificates.html' },
      { ic: '💬', label: 'Community', items: [['community.html', 'Community'], ['teacher-cafe.html', '☕ Teacher Café'], ['teacher-connect.html', '🤝 Coffee & Connections'], ['messages.html', 'Messages'], ['teacher-requests.html', 'Session Requests']] },
      { ic: '⚙️', label: 'Account', items: [['teacher-settings.html', 'Account Settings'], ['help.html', 'Help Centre'], ['contact.html', 'Contact Us'], ['index.html', 'Think Nest website'], ['#logout', 'Log out']] }
    ],
    parent: [
      { ic: '🏠', label: 'My children', href: 'parent-dashboard.html' },
      { ic: '➕', label: 'Add a child', href: 'add-child.html' },
      { ic: '📅', label: 'Family calendar', href: 'parent-calendar.html' },
      { ic: '🪺', label: 'Beyond the School Run', href: 'parent-hub.html' },
      { ic: '☕', label: 'Parent Café', href: 'parent-cafe.html' },
      { ic: '🤝', label: 'Parent Connections', href: 'parent-connect.html' },
      { ic: '💬', label: 'Community', href: 'community.html' },
      { ic: '⚙️', label: 'Account', items: [['parent-settings.html', 'Account Settings'], ['help.html', 'Help Centre'], ['contact.html', 'Contact Us'], ['#logout', 'Log out']] }
    ]
  };
  MENUS.admin = [{ ic: '🛡️', label: 'Admin', items: [['admin.html', 'Admin dashboard'], ['admin-curriculum.html', 'Curriculum editor'], ['admin-founders.html', 'Founders page']] }].concat(MENUS.teacher);
  // pages that aren't in the menu, and which menu item they belong to
  const ALIAS = { 'course.html': 'my-courses.html', 'teacher-course.html': 'teacher-courses.html', 'group.html': 'groups.html', 'child.html': 'parent-dashboard.html' };

  async function roleNow() {
    const nav = document.querySelector('.side nav'); if (!nav) return null;
    try {
      const { data: { session } } = await db.auth.getSession();
      if (session) {
        const { data } = await db.from('profiles').select('role, also_parent').eq('id', session.user.id).maybeSingle();
        window.TN_ALSO_PARENT = !!(data && data.also_parent);
        if (data && data.role) return data.role === 'school_leader' ? 'teacher' : data.role;
      }
    } catch (_) {}
    const label = nav.getAttribute('aria-label') || '';
    return label.includes('Teacher') ? 'teacher' : label.includes('Parent') ? 'parent' : 'student';
  }

  function build(role) {
    const nav = document.querySelector('.side nav'); if (!nav) return;
    let menu = MENUS[role] || MENUS.student;
    if (window.TN_ALSO_PARENT && (role === 'teacher' || role === 'admin')) {
      const acc = menu[menu.length - 1];
      menu = menu.slice(0, -1).concat([{ ic: '👪', label: 'Parent', items: [['parent-dashboard.html', 'My children'], ['add-child.html', 'Add a child'], ['parent-calendar.html', 'Family calendar'], ['parent-hub.html', 'Beyond the School Run'], ['parent-cafe.html', '☕ Parent Café'], ['parent-connect.html', '🤝 Parent Connections']] }, acc]);
    }
    let here = location.pathname.split('/').pop() || 'index.html';
    if (ALIAS[here]) here = ALIAS[here];
    if (here === 'group.html' && document.querySelector('.class-flag')) here = 'classes.html';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('tn_nav_open') || '{}'); } catch (_) {}
    nav.classList.add('nav2');
    const parentPages = ['parent-dashboard.html', 'add-child.html', 'parent-hub.html', 'parent-cafe.html', 'child.html', 'parent-settings.html'];
    const inParent = parentPages.includes(location.pathname.split('/').pop());
    const switcher = window.TN_ALSO_PARENT && (role === 'teacher' || role === 'admin')
      ? `<a class="nav2-switch" href="${inParent ? 'teacher-dashboard.html' : 'parent-dashboard.html'}">${inParent ? '👩‍🏫 Switch to teacher view' : '👪 Switch to parent view'}</a>` : '';
    nav.innerHTML = switcher + menu.map((sec, i) => {
      if (sec.href) {
        const on = sec.href === here;
        return `<a class="nav2-top ${on ? 'active' : ''}" href="${sec.href}" ${on ? 'aria-current="page"' : ''}><span class="nav2-ic" aria-hidden="true">${sec.ic}</span><span>${sec.label}</span></a>`;
      }
      const hasHere = sec.items.some(([h]) => h === here);
      const open = hasHere || saved[sec.label] === true;
      return `<div class="nav2-sec ${hasHere ? 'has-active' : ''}">
        <button type="button" class="nav2-top nav2-toggle" aria-expanded="${open}" aria-controls="nav2-${i}"><span class="nav2-ic" aria-hidden="true">${sec.ic}</span><span>${sec.label}</span><span class="nav2-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span></button>
        <ul class="nav2-sub" id="nav2-${i}" ${open ? '' : 'hidden'}>${sec.items.map(([h, l]) => h === '#logout'
          ? `<li><a href="#" id="logout">${l}</a></li>`
          : `<li><a href="${h}" class="${h === here ? 'active' : ''}" ${h === here ? 'aria-current="page"' : ''}>${l}${h === 'messages.html' ? '<i class="nav-dot" id="nav-unread" hidden></i>' : ''}</a></li>`).join('')}</ul></div>`;
    }).join('');
    nav.querySelectorAll('.nav2-toggle').forEach(b => b.addEventListener('click', () => {
      const ul = document.getElementById(b.getAttribute('aria-controls'));
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open)); ul.hidden = !open;
      const label = b.querySelector('span:nth-child(2)').textContent;
      try { saved[label] = open; localStorage.setItem('tn_nav_open', JSON.stringify(saved)); } catch (_) {}
    }));
    const lo = document.getElementById('logout');
    if (lo) lo.addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  }

  // ----- Welcome tour (first visit, once per role) -----
  const TOURS = {
    student: [['👋', 'Welcome to Think Nest!', 'This is your learning nest. Here’s a quick tour of the best bits. It takes 30 seconds.'],
      ['📚', 'Your courses', 'Find and join courses in <b>Learning → All Courses</b>. Inside each lesson you’ll find quizzes, worksheets, videos and activities.'],
      ['🏆', 'Earn Nest Points', 'Hand in work, come to class and help others to earn points and badges. Grow from 🥚 Hatchling to 🏆 Eagle in <b>My Progress</b>!'],
      ['💬', 'Learn together', 'Make friends, join study groups and post in the <b>Community</b>. Be kind, and use <b>Report</b> if something isn’t right.']],
    parent: [['👋', 'Welcome to Think Nest!', 'Here’s a quick tour to help you follow your children’s learning.'],
      ['👧👦', 'Your children', '<b>My children</b> shows each child’s courses, progress, certificates and attendance. Waiting for a child to join? Copy their <b>invite link</b>.'],
      ['🧭', 'Find a class', 'On the home page, choose a subject under <b>Think Paths</b> to see classes for your child’s curriculum and grade.'],
      ['🚗', 'Something for you too', '<b>Beyond the School Run</b> is our Parent Hub: workshops just for you, and the private <b>Parent Café</b>.']],
    teacher: [['👋', 'Welcome to Think Nest!', 'Thank you for teaching with us. Here’s a quick tour of your toolkit.'],
      ['📘', 'Courses and lessons', '<b>Teaching → My Courses</b>: create a course, add lessons, then <b>+ Add to this lesson</b> for 10 tools, many with AI help.'],
      ['📋', 'Classes, attendance and certificates', 'Create a class in <b>My Classes</b>, take the register from your dashboard, and award designed certificates from <b>🏅 Certificates</b>.'],
      ['🔔', 'Beyond the Bell', 'Our Teacher Hub is for <i>you</i>: workshops, the <b>Teacher Café</b> and <b>Coffee &amp; Connections</b>.']]
  };
  TOURS.admin = TOURS.teacher;
  const TOURS_AR = {
    student: [['👋', 'أهلًا بك في ثينك نست!', 'هذا عشّك التعليمي. إليك جولة سريعة على أجمل ما فيه، تستغرق 30 ثانية فقط.'],
      ['📚', 'دوراتك', 'ابحث عن الدورات وانضم إليها من <b>التعلّم ← جميع الدورات</b>. ستجد داخل كل درس اختبارات وأوراق عمل وفيديوهات وأنشطة.'],
      ['🏆', 'اجمع نقاط نست', 'سلّم أعمالك، واحضر حصصك، وساعد الآخرين لتجمع النقاط والأوسمة. انتقل من 🥚 فرخ صغير إلى 🏆 نسر في <b>تقدّمي</b>!'],
      ['💬', 'تعلّموا معًا', 'كوّن صداقات، وانضم إلى مجموعات الدراسة، وشارك في <b>المجتمع</b>. كن لطيفًا، واستخدم <b>إبلاغ</b> إذا رأيت شيئًا غير مناسب.']],
    parent: [['👋', 'أهلًا بك في ثينك نست!', 'إليك جولة سريعة تساعدك على متابعة تعلّم أبنائك.'],
      ['👧👦', 'أبناؤك', 'تعرض صفحة <b>أبنائي</b> دورات كل طفل وتقدّمه وشهاداته وحضوره. تنتظر انضمام أحد أبنائك؟ انسخ <b>رابط الدعوة</b> الخاص به.'],
      ['🧭', 'ابحث عن فصل', 'من الصفحة الرئيسية، اختر مادة ضمن <b>مسارات التفكير</b> لترى الفصول المناسبة لمنهج طفلك وصفه.'],
      ['🚗', 'شيء لك أنت أيضًا', '<b>ما بعد مشوار المدرسة</b> هو مجتمع أولياء الأمور: ورش مخصّصة لك، و<b>مقهى أولياء الأمور</b> الخاص.']],
    teacher: [['👋', 'أهلًا بك في ثينك نست!', 'شكرًا لتدريسك معنا. إليك جولة سريعة على أدواتك.'],
      ['📘', 'الدورات والدروس', '<b>التدريس ← دوراتي</b>: أنشئ دورة، وأضف دروسًا، ثم <b>+ أضف إلى هذا الدرس</b> لتختار من 10 أدوات، كثير منها بمساعدة الذكاء الاصطناعي.'],
      ['📋', 'الفصول والحضور والشهادات', 'أنشئ فصلًا من <b>فصولي</b>، وسجّل الحضور من لوحة التحكم، وامنح شهادات مصمّمة من <b>🏅 الشهادات</b>.'],
      ['🔔', 'ما بعد الجرس', 'مجتمع المعلمين لدينا مخصّص <i>لك</i>: ورش عمل، و<b>مقهى المعلمين</b>، و<b>قهوة وتواصل</b>.']]
  };
  TOURS_AR.admin = TOURS_AR.teacher;

  async function welcomeTour(role) {
    const steps = ((typeof tnLang === 'function' && tnLang() === 'ar') ? TOURS_AR : TOURS)[role]; if (!steps || document.getElementById('tn-tour')) return;
    let uid = 'x'; try { const { data } = await db.auth.getSession(); uid = data.session ? data.session.user.id : 'x'; } catch (_) {}
    const key = 'tn_tour_' + role + '_' + uid, forced = /[?&]tour=1/.test(location.search);
    try { if (!forced && localStorage.getItem(key)) return; } catch (_) { if (!forced) return; }
    let i = 0;
    const d = document.createElement('dialog'); d.id = 'tn-tour'; d.className = 'tour'; d.setAttribute('aria-labelledby', 'tour-title');
    document.body.appendChild(d);
    const done = () => { try { localStorage.setItem(key, '1'); } catch (_) {} d.close(); d.remove(); };
    function draw() {
      const [ic, title, text] = steps[i], last = i === steps.length - 1;
      d.innerHTML = `<div class="tour-ic" aria-hidden="true">${ic}</div><h2 id="tour-title">${title}</h2><p>${text}</p>
        <div class="tour-dots" aria-hidden="true">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="tour-btns">${i ? '<button type="button" class="link-btn" data-tb="back">‹ Back</button>' : '<button type="button" class="link-btn" data-tb="skip">Skip tour</button>'}
          <button type="button" class="btn btn-red" data-tb="next">${last ? 'Let’s go! 🚀' : 'Next ›'}</button></div>
        ${last ? ((typeof tnLang === 'function' && tnLang() === 'ar') ? '<p class="tour-help">تحتاج إلى مساعدة لاحقًا؟ ستجد <a href="help.html">مركز المساعدة</a> ضمن ⚙️ الحساب.</p>' : '<p class="tour-help">Need help later? Find the <a href="help.html">Help Centre</a> under ⚙️ Account.</p>') : ''}`;
      d.querySelector('[data-tb=next]').focus();
    }
    d.addEventListener('click', e => { const b = e.target.closest('[data-tb]'); if (!b) return;
      if (b.dataset.tb === 'next') { if (i === steps.length - 1) return done(); i++; draw(); }
      else if (b.dataset.tb === 'back') { i--; draw(); } else done(); });
    d.addEventListener('cancel', e => { e.preventDefault(); done(); });
    draw(); d.showModal();
  }

  window.buildNav = build;
  window.TN_MENUS = MENUS;
  window.TN_ROLE = null;
  document.addEventListener('DOMContentLoaded', async () => {
    if (!document.querySelector('.side nav') || typeof db === 'undefined') return;
    const role = await roleNow();
    window.TN_ROLE = role;
    build(role);
    setTimeout(() => welcomeTour(role), 900);
    // other scripts may redraw the menu while the page loads; put ours back
    setTimeout(() => { if (!document.querySelector('.side nav.nav2 .nav2-top')) build(role); }, 1500);
  });
})();

// ===== Top search bar: live results for courses and pages =====
(function () {
  const esc3 = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EXTRA = { teacher: [['teacher-certificates.html', 'Award a certificate'], ['teacher-attendance.html', 'Take attendance'], ['teacher-courses.html', 'Create a new course']],
                  student: [['rewards.html', 'Nest Points and badges'], ['certificates.html', 'Download my certificates']], parent: [['add-child.html', 'Enrol another child']], admin: [] };
  function pages(role) {
    const m = (window.TN_MENUS || {})[role] || [];
    const out = [];
    m.forEach(s => s.href ? out.push([s.href, s.label, s.ic]) : (s.items || []).forEach(([h, l]) => h !== '#logout' && out.push([h, l, s.ic])));
    (EXTRA[role] || []).concat(role === 'admin' ? EXTRA.teacher : []).forEach(([h, l]) => out.push([h, l, '✨']));
    return out;
  }
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form.search'), input = form && form.querySelector('input'); if (!input) return;
    input.setAttribute('autocomplete', 'off'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-controls', 'search-results');
    const box = document.createElement('div'); box.className = 'search-results'; box.id = 'search-results'; box.setAttribute('role', 'listbox'); box.hidden = true;
    form.style.position = 'relative'; form.appendChild(box);
    let items = [], pick = -1, timer = null, uid = null;
    db.auth.getSession().then(({ data }) => { uid = data.session && data.session.user.id; });
    const draw = () => {
      box.hidden = !items.length && !input.value.trim();
      box.innerHTML = items.length ? items.map((it, i) => `<a href="${esc3(it.href)}" role="option" class="sr-item ${i === pick ? 'on' : ''}" aria-selected="${i === pick}"><span class="sr-ic">${it.ic}</span><span><b>${esc3(it.title)}</b>${it.sub ? `<small>${esc3(it.sub)}</small>` : ''}</span></a>`).join('')
        : `<p class="sr-none">No results for “${esc3(input.value.trim())}”. Try a subject, course name or teacher.</p>`;
    };
    async function run() {
      const q = input.value.trim(); pick = -1;
      if (q.length < 2) { items = []; box.hidden = true; return; }
      const role = window.TN_ROLE || 'student', ql = q.toLowerCase();
      const pg = pages(role).filter(([, l]) => l.toLowerCase().includes(ql)).slice(0, 4).map(([h, l, ic]) => ({ href: h, title: l, sub: 'Page', ic: ic || '📄' }));
      let cs = [];
      try {
        const safe = q.replace(/[%,()]/g, ' ');
        const { data } = await db.from('courses').select('id, title, teacher_name, teacher_id, subject, grade, audience').or(`title.ilike.%${safe}%,teacher_name.ilike.%${safe}%,subject.ilike.%${safe}%`).limit(6);
        cs = (data || []).map(c => ({ href: (c.teacher_id && c.teacher_id === uid ? 'teacher-course.html?id=' : 'course.html?id=') + c.id, title: c.title, ic: c.audience === 'teachers' ? '🔔' : c.audience === 'parents' ? '🚗' : '📘',
          sub: [c.subject, c.grade, c.teacher_name ? 'with ' + c.teacher_name : ''].filter(Boolean).join(' · ') || 'Course' }));
      } catch (_) {}
      items = cs.concat(pg); draw();
    }
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 220); });
    input.addEventListener('focus', () => { if (items.length) box.hidden = false; });
    input.addEventListener('keydown', e => {
      if (box.hidden || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); pick = (pick + 1) % items.length; draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pick = (pick - 1 + items.length) % items.length; draw(); }
      else if (e.key === 'Escape') { box.hidden = true; }
    });
    form.addEventListener('submit', e => { e.preventDefault(); const it = items[pick >= 0 ? pick : 0]; if (it) location.href = it.href; else if (input.value.trim()) location.href = 'all-courses.html?q=' + encodeURIComponent(input.value.trim()); });
    document.addEventListener('click', e => { if (!form.contains(e.target)) box.hidden = true; });
    input.placeholder = 'Search courses, teachers or pages';
  });
})();
