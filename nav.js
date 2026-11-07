// ===== Think Nest sidebar: a few main sections with drop-down sub-menus =====
// Uses db from supabase-config.js
(function () {
  // Each role has its own menu, built around what they came to do.
  // 'dyn' sections are filled with the person's own classes or children.
  const MENUS = {
    student: [
      { ic: '🏠', label: 'Home', href: 'student-dashboard.html' },
      { ic: '🏫', label: 'My Classes', dyn: 'classes', items: [['classes.html', 'All my classes']] },
      { ic: '📘', label: 'Online Courses', items: [['my-courses.html', 'My courses'], ['all-courses.html', 'Find a course'], ['calendar.html', 'My calendar'], ['recordings.html', 'Recordings'], ['mentors.html', 'Mentors'], ['files.html', 'My files']] },
      { ic: '🏆', label: 'My Progress', items: [['rewards.html', 'My rewards'], ['certificates.html', 'My certificates'], ['reports.html', 'My reports']] },
      { ic: '💬', label: 'Friends & Community', items: [['community.html', 'Community'], ['friends.html', 'My friends'], ['groups.html', 'Study groups'], ['messages.html', 'Messages']] },
      { ic: '🧰', label: 'Revision Hub', href: 'revision.html' }
    ],
    teacher: [
      { ic: '🏠', label: 'Home', href: 'teacher-dashboard.html' },
      { ic: '🏫', label: 'My Classes', dyn: 'classes', items: [['classes.html', 'All my classes'], ['classes.html?new=1', '➕ New class'], ['teacher-attendance.html', 'Attendance overview'], ['groups.html', 'Study groups']] },
      { ic: '📘', label: 'Online Courses', items: [['teacher-courses.html', 'My courses'], ['teacher-calendar.html', 'Live classes'], ['teacher-requests.html', 'Session requests'], ['teacher-certificates.html', '🏅 Certificates'], ['teacher-insights.html', '📊 Course insights']] },
      { ic: '💬', label: 'Messages & Community', items: [['messages.html', 'Messages'], ['community.html', 'Community']] },
      { ic: '☕', label: 'For me', items: [['teacher-hub.html', 'Beyond the Bell workshops'], ['teacher-cafe.html', '☕ Teacher Café'], ['teacher-connect.html', '🤝 Coffee & Connections']] },
      { ic: '🧰', label: 'Resources', items: [['revision.html', 'Revision Hub'], ['curriculum.html', 'Curriculum guide']] }
    ],
    parent: [
      { ic: '🏠', label: 'My Children', dyn: 'kids', items: [['parent-dashboard.html', 'All my children'], ['add-child.html', '➕ Add a child']] },
      { ic: '📅', label: 'Family calendar', href: 'parent-calendar.html' },
      { ic: '📝', label: 'Reports', href: 'reports.html' },
      { ic: '🌟', label: 'For me', items: [['parent-hub.html', 'Beyond the School Run workshops'], ['parent-cafe.html', '☕ Parent Café'], ['parent-connect.html', '🤝 Parent Connections'], ['community.html', 'Community']] }
    ]
  };
  MENUS.school_leader = [
    { ic: '🏠', label: 'Home', href: 'school.html', roles: '*' },
    { head: 'Manage school', roles: 'principal vice_principal assistant_principal admin_staff' },
    { ic: '👥', label: 'People and staff', href: 'school.html#people', roles: 'principal vice_principal assistant_principal admin_staff' },
    { ic: '📥', label: 'Import', href: 'school.html#import', roles: 'principal vice_principal assistant_principal admin_staff' },
    { ic: '⚙️', label: 'School settings', href: 'school.html#settings', roles: 'principal vice_principal assistant_principal admin_staff' },
    { head: 'My classes', roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead' },
    { flat: true, dyn: 'classes', items: [['classes.html?new=1', '➕ New class']], roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead' },
    { head: 'My teaching', roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead' },
    { ic: '🌅', label: 'My school day', href: 'school-teacher.html', roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead' },
    { ic: '📅', label: 'My weekly plans', href: 'planner.html?mode=weeks', roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead' },
    { ic: '🗂️', label: 'Unit plans', href: 'planner.html?mode=units', roles: 'principal vice_principal assistant_principal coordinator head_of_department' },
    { ic: '📘', label: 'Lessons and quizzes', href: 'teacher-courses.html', roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead' },
    { ic: '📥', label: 'My observation feedback', href: 'observe.html?mode=mine', roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead' },
    { head: 'Leadership', roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead admin_staff' },
    { ic: '📊', label: 'Dashboard', href: 'school.html#dashboard', roles: 'principal vice_principal assistant_principal coordinator head_of_department' },
    { ic: '📋', label: 'Attendance', href: 'school.html#attendance', roles: 'principal vice_principal assistant_principal coordinator inclusion_lead admin_staff' },
    { ic: '🗺️', label: 'Coverage', href: 'school.html#coverage', roles: 'principal vice_principal assistant_principal coordinator head_of_department' },
    { ic: '👀', label: 'Observe lessons', href: 'observe.html', roles: 'principal vice_principal assistant_principal coordinator head_of_department inclusion_lead' },
    { ic: '✅', label: 'Plans to review', href: 'planner.html?mode=weeks&all=1', roles: 'principal vice_principal assistant_principal coordinator' },
    { ic: '📝', label: 'Reports', href: 'school.html#reports', roles: 'principal vice_principal assistant_principal coordinator' },
    { ic: '📂', label: 'Evidence', href: 'school.html#evidence', roles: 'principal vice_principal assistant_principal coordinator' },
    { ic: '🧩', label: 'Inclusion', href: 'inclusion.html', roles: 'principal vice_principal assistant_principal coordinator inclusion_lead' },
    { ic: '💛', label: 'Wellbeing', href: 'wellbeing.html', roles: 'principal vice_principal assistant_principal coordinator inclusion_lead' },
    { head: 'School', roles: '*' },
    { ic: '📣', label: 'Announcements', href: 'school.html#announce', an: 1, roles: '*' },
    { ic: '👥', label: 'People', href: 'school.html#people', roles: 'coordinator head_of_department inclusion_lead' },
    { ic: '👩‍🏫', label: 'Staff room', href: 'staff-room.html', roles: '*' },
    { ic: '🏫', label: 'School community', href: 'school-community.html', roles: '*' },
    { ic: '💬', label: 'Messages', href: 'messages.html', roles: '*' }
  ];
  // Think Nest for Schools: everyone in a school sees only their school
  MENUS.school_teacher = [
    { ic: '🏠', label: 'Home', href: 'school-teacher.html' },
    { head: 'My classes' },
    { flat: true, dyn: 'classes', items: [['classes.html?new=1', '➕ New class']] },
    { head: 'Planning' },
    { ic: '📅', label: 'Weekly plans', href: 'planner.html?mode=weeks' },
    { ic: '🗂️', label: 'Unit plans', href: 'planner.html?mode=units' },
    { ic: '📘', label: 'Lessons and quizzes', href: 'teacher-courses.html' },
    { head: 'My data' },
    { ic: '📋', label: 'Attendance', href: 'school.html#attendance' },
    { ic: '📊', label: 'Class progress', href: 'school.html#dashboard' },
    { ic: '🗺️', label: 'Curriculum coverage', href: 'school.html#coverage' },
    { head: 'For me' },
    { ic: '👀', label: 'My observations', href: 'observe.html' },
    { ic: '🧩', label: 'Inclusion', href: 'inclusion.html', roles: 'inclusion_team' },
    { ic: '💛', label: 'Wellbeing', href: 'wellbeing.html', roles: 'inclusion_team' },
    { head: 'School' },
    { ic: '📣', label: 'Announcements', href: 'announcements.html', an: 1 },
    { ic: '👩‍🏫', label: 'Staff room', href: 'staff-room.html' },
    { ic: '🏫', label: 'School community', href: 'school-community.html' },
    { ic: '💬', label: 'Messages', href: 'messages.html' }
  ];
  MENUS.school_student = [
    { ic: '🏠', label: 'Home', href: 'student-dashboard.html' },
    { ic: '📣', label: 'Announcements', href: 'announcements.html', an: 1 },
    { ic: '🏫', label: 'My Classes', dyn: 'classes', items: [['classes.html', 'All my classes']] },
    { ic: '📘', label: 'My lessons', items: [['my-courses.html', 'My courses'], ['calendar.html', 'My calendar'], ['recordings.html', 'Recordings'], ['files.html', 'My files']] },
    { ic: '🏆', label: 'My Progress', items: [['rewards.html', 'My rewards'], ['certificates.html', 'My certificates'], ['reports.html', 'My reports']] },
    { ic: '💬', label: 'Friends & community', items: [['school-community.html', '🏫 School community'], ['friends.html', 'My friends'], ['groups.html', 'Study groups'], ['messages.html', 'Messages']] },
    { ic: '🧰', label: 'Revision Hub', href: 'revision.html' }
  ];
  MENUS.school_parent = [
    { ic: '🏠', label: 'My Children', dyn: 'kids', items: [['parent-dashboard.html', 'All my children']] },
    { ic: '📅', label: 'Family calendar', href: 'parent-calendar.html' },
    { ic: '📣', label: 'Announcements', href: 'announcements.html', an: 1 },
    { ic: '📝', label: 'Reports', href: 'reports.html' }
  ];
  MENUS.admin = [{ ic: '🛡️', label: 'Admin', items: [['admin.html', 'Admin dashboard'], ['admin-curriculum.html', 'Curriculum editor'], ['admin-founders.html', 'Founders page']] }].concat(MENUS.teacher);
  const SETTINGS = { student: 'settings.html', teacher: 'teacher-settings.html', admin: 'teacher-settings.html', parent: 'parent-settings.html', school_leader: 'teacher-settings.html', school_teacher: 'teacher-settings.html', school_student: 'settings.html', school_parent: 'parent-settings.html' };
  // pages that aren't in the menu, and which menu item they belong to
  const ALIAS = { 'course.html': 'my-courses.html', 'teacher-course.html': 'teacher-courses.html', 'group.html': 'groups.html', 'child.html': 'parent-dashboard.html' };
  const PARENT_PAGES = ['parent-dashboard.html', 'add-child.html', 'parent-hub.html', 'parent-cafe.html', 'parent-connect.html', 'child.html', 'parent-settings.html', 'parent-calendar.html', 'reports.html'];

  async function roleNow() {
    const nav = document.querySelector('.side nav'); if (!nav) return null;
    try {
      const { data: { session } } = await db.auth.getSession();
      if (session) {
        window.TN_UID = session.user.id;
        const { data } = await db.from('profiles').select('role, also_parent').eq('id', session.user.id).maybeSingle();
        window.TN_ALSO_PARENT = !!(data && data.also_parent);
        try {
          const { data: sc } = await db.rpc('my_schools');
          const LEAD = ['principal', 'vice_principal', 'assistant_principal', 'coordinator', 'head_of_department', 'inclusion_lead', 'admin_staff'];
          window.TN_SCHOOL = (sc || []).find(s => LEAD.includes(s.my_role)) || (sc || [])[0] || null;
          try { sessionStorage.setItem('tn_school_ctx', JSON.stringify(window.TN_SCHOOL)); } catch (_) {}
        } catch (_) { window.TN_SCHOOL = null; }
        if (data && data.role) return data.role;
      }
    } catch (_) {}
    const label = nav.getAttribute('aria-label') || '';
    return label.includes('Teacher') ? 'teacher' : label.includes('Parent') ? 'parent' : 'student';
  }
  const navEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function build(role) {
    const nav = document.querySelector('.side nav'); if (!nav) return;
    const page = location.pathname.split('/').pop() || 'index.html';
    const dual = window.TN_ALSO_PARENT && (role === 'teacher' || role === 'admin');
    const inParent = dual && PARENT_PAGES.includes(page);
    let view = inParent ? 'parent' : role;
    const sc = window.TN_SCHOOL;
    if (sc && role !== 'admin') {
      view = ['principal', 'vice_principal', 'assistant_principal', 'coordinator', 'head_of_department', 'inclusion_lead', 'admin_staff'].includes(sc.my_role) ? 'school_leader'
        : (sc.my_role === 'parent' || role === 'parent') ? 'school_parent' : (sc.my_role === 'student' || role === 'student') ? 'school_student' : 'school_teacher';
      window.TN_ROLE = view;
      schoolBrand(sc, view);
    }
    const roleOk = sec => !sec.roles || sec.roles === '*' || role === 'admin' || (sc && sec.roles.split(' ').includes(sc.my_role));
    const menu = (MENUS[view] || MENUS.student).filter(roleOk);
    let here = ALIAS[page] || page;
    if (page === 'school.html' && /^#(people|settings|import|dashboard|reports|announce|coverage|evidence|attendance)$/.test(location.hash)) here = 'school.html' + location.hash;
    if (page === 'group.html' && document.querySelector('.class-flag')) here = 'classes.html';
    if (page === 'planner.html') { const m = new URLSearchParams(location.search).get('mode') || (new URLSearchParams(location.search).get('week') ? 'weeks' : new URLSearchParams(location.search).get('plan') ? 'units' : sessionStorage.getItem('tn_pl_mode') || 'units'); here = 'planner.html?mode=' + m + (m === 'weeks' && new URLSearchParams(location.search).get('all') === '1' ? '&all=1' : ''); }
    if (page === 'observe.html' && (new URLSearchParams(location.search).get('mode') === 'mine' || document.querySelector('.ob-mine-mode'))) here = 'observe.html?mode=mine';
    const qid = new URLSearchParams(location.search).get('id');
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('tn_nav_open') || '{}'); } catch (_) {}
    nav.classList.add('nav2');
    const switcher = dual && !sc ? `<a class="nav2-switch" href="${inParent ? 'teacher-dashboard.html' : 'parent-dashboard.html'}">${inParent ? '👩‍🏫 Switch to teacher view' : '👪 Switch to parent view'}</a>` : '';
    nav.innerHTML = switcher + menu.map((sec, i) => {
      if (sec.head) return `<div class="nav2-head">${sec.head}</div>`;
      if (sec.flat) {
        const dynHere = sec.dyn === 'classes' && page === 'group.html';
        return `<ul class="nav2-sub nav2-flat">${sec.dyn ? `<li class="nav2-dyn" data-dyn="${sec.dyn}"></li>` : ''}${sec.items.map(([h, l]) => `<li><a href="${h}" class="${h === here && !dynHere ? 'active' : ''} ${h.includes('new=1') ? 'nav2-add' : ''}">${l}</a></li>`).join('')}</ul>`;
      }
      if (sec.href) {
        const on = sec.href === here;
        return `<a class="nav2-top ${on ? 'active' : ''}" href="${sec.href}" ${on ? 'aria-current="page"' : ''}><span class="nav2-ic" aria-hidden="true">${sec.ic}</span><span>${sec.label}</span>${sec.an ? '<i class="nav2-badge" data-an-badge hidden></i>' : ''}${sec.href === 'messages.html' ? '<i class="nav-dot" id="nav-unread" hidden></i>' : ''}</a>`;
      }
      const dynHere = (sec.dyn === 'classes' && page === 'group.html') || (sec.dyn === 'kids' && page === 'child.html');
      const hasHere = dynHere || sec.items.some(([h]) => h === here);
      const open = hasHere || saved[sec.label] === true || (sec.dyn && saved[sec.label] !== false);
      return `<div class="nav2-sec ${hasHere ? 'has-active' : ''}">
        <button type="button" class="nav2-top nav2-toggle" aria-expanded="${open}" aria-controls="nav2-${i}"><span class="nav2-ic" aria-hidden="true">${sec.ic}</span><span>${sec.label}</span><span class="nav2-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span></button>
        <ul class="nav2-sub" id="nav2-${i}" ${open ? '' : 'hidden'}>${sec.dyn ? `<li class="nav2-dyn" data-dyn="${sec.dyn}"></li>` : ''}${sec.items.map(([h, l]) =>
          `<li><a href="${h}" class="${h === here && !dynHere ? 'active' : ''} ${h.includes('new=1') || h.includes('add-child') ? 'nav2-add' : ''}" ${h === here && !dynHere ? 'aria-current="page"' : ''}>${l}${h === 'messages.html' ? '<i class="nav-dot" id="nav-unread" hidden></i>' : ''}</a></li>`).join('')}</ul></div>`;
    }).join('') + `<div class="nav2-foot"><a href="${SETTINGS[view] || 'settings.html'}">⚙️ Settings</a><a href="help.html">❓ Help</a><a href="#" class="nav2-logout">↩ Log out</a></div>`;
    nav.querySelectorAll('.nav2-toggle').forEach(b => b.addEventListener('click', () => {
      const ul = document.getElementById(b.getAttribute('aria-controls'));
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open)); ul.hidden = !open;
      const label = b.querySelector('span:nth-child(2)').textContent;
      try { saved[label] = open; localStorage.setItem('tn_nav_open', JSON.stringify(saved)); } catch (_) {}
    }));
    nav.querySelectorAll('.nav2-logout').forEach(a => a.addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; }));
    fillDynamic(view, page, qid);
    if (sc && role !== 'admin') schoolAnnouncements(view, page);
    profileMenu(view);
  }

  // Put the person's own classes / children into the menu, by name
  async function fillDynamic(view, page, qid) {
    const uid = window.TN_UID; if (!uid) return;
    const cls = document.querySelector('[data-dyn="classes"]'), kids = document.querySelector('[data-dyn="kids"]');
    try {
      if (cls) {
        let list = [];
        if (view === 'student' || view === 'school_student') { const { data } = await db.rpc('my_groups'); list = (data || []).filter(g => g.kind === 'class' && g.my_status === 'active').map(g => ({ id: g.id, name: g.name })); }
        else { let q = db.from('study_groups').select('id, name').eq('owner_id', uid).eq('kind', 'class'); if (window.TN_SCHOOL) q = q.eq('school_id', window.TN_SCHOOL.id); const { data } = await q.order('name'); list = data || []; }
        cls.outerHTML = list.slice(0, 8).map(g => { const on = page === 'group.html' && String(g.id) === qid; return `<li><a href="group.html?id=${g.id}" class="nav2-item ${on ? 'active' : ''}" ${on ? 'aria-current="page"' : ''}>🏫 ${navEsc(g.name)}</a></li>`; }).join('')
          || (/student/.test(view) ? '<li><span class="nav2-none">No classes yet</span></li>' : '');
      }
      if (kids) {
        const { data: links } = await db.from('parent_links').select('student_id').eq('parent_id', uid);
        const ids = (links || []).map(l => l.student_id); let list = [];
        if (ids.length) { const { data } = await db.from('profiles').select('id, full_name').in('id', ids).order('full_name'); list = data || []; }
        kids.outerHTML = list.map(k => { const on = page === 'child.html' && k.id === qid; return `<li><a href="child.html?id=${k.id}" class="nav2-item ${on ? 'active' : ''}" ${on ? 'aria-current="page"' : ''}>👧 ${navEsc(String(k.full_name || 'My child').split(' ')[0])}</a></li>`; }).join('');
      }
    } catch (_) { if (cls) cls.remove(); if (kids) kids.remove(); }
  }

  // The school's own logo, name and colours
  const SCHOOL_HOME = { school_leader: 'school.html', school_teacher: 'school-teacher.html', school_student: 'student-dashboard.html', school_parent: 'parent-dashboard.html' };
  function schoolBrand(sc, view) {
    document.documentElement.style.setProperty('--school', sc.color_primary || '#3E4B94');
    document.documentElement.style.setProperty('--school2', sc.color_accent || '#F27A6F');
    document.documentElement.classList.add('tn-school');
    if (view === 'school_teacher' || view === 'school_leader') document.documentElement.classList.add('tn-school-staff');
    const logo = document.querySelector('.side .side-logo'); if (!logo || logo.dataset.school) return;
    logo.dataset.school = '1'; logo.href = SCHOOL_HOME[view] || 'index.html'; logo.classList.add('sc-side');
    const ini = String(sc.name || '').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    logo.innerHTML = `<span class="sc-side-pic">${sc.logo_url ? `<img src="${navEsc(sc.logo_url)}" alt="">` : `<b>${navEsc(ini)}</b>`}</span><span class="sc-side-name">${navEsc(sc.name)}</span><small class="sc-side-by">on Think Nest</small>`;
    logo.setAttribute('aria-label', sc.name + ' home');
    const bt = document.querySelector('.app-bar .bar-title'); if (bt) { bt.textContent = sc.name; bt.setAttribute('data-no-tr', ''); }
  }
  async function schoolAnnouncements(view, page) {
    let L = [];
    try { const { data } = await db.rpc('my_announcements'); L = (data || []).filter(a => !a.is_read); } catch (_) { return; }
    document.querySelectorAll('[data-an-badge]').forEach(b => { b.textContent = L.length; b.hidden = !L.length; });
    const homes = ['teacher-dashboard.html', 'student-dashboard.html', 'parent-dashboard.html', 'school.html'];
    if (!L.length || !homes.includes(page) || document.getElementById('an-banner')) return;
    const main = document.querySelector('main'); if (!main) return;
    const a = L[0];
    main.insertAdjacentHTML('afterbegin', `<a class="an-banner" id="an-banner" href="announcements.html#a${a.id}"><span class="an-banner-ic" aria-hidden="true">📣</span>
      <span><b>${L.length === 1 ? 'New announcement' : L.length + ' new announcements'}</b><span>${navEsc(a.title)}</span></span><span class="an-banner-go">Read →</span></a>`);
  }
  // public pages a school member should not use: send them back to their school
  const PUBLIC_ONLY = { 'teacher-dashboard.html': 1, 'teacher-calendar.html': 1, 'teacher-certificates.html': 1, 'community.html': 'school-community.html', 'all-courses.html': 1, 'mentors.html': 1, 'teacher-cafe.html': 'staff-room.html', 'parent-cafe.html': 1,
    'teacher-connect.html': 1, 'parent-connect.html': 1, 'teacher-hub.html': 1, 'parent-hub.html': 1, 'hub.html': 1, 'teacher-requests.html': 1, 'path.html': 1 };
  function keepInSchool(role) {
    const sc = window.TN_SCHOOL; if (!sc || role === 'admin') return false;
    const page = location.pathname.split('/').pop() || 'index.html', go = PUBLIC_ONLY[page];
    if (!go) return false;
    const view = window.TN_ROLE;
    const ok = typeof go === 'string' && !(go === 'staff-room.html' && /student|parent/.test(view)) && !(go === 'school-community.html' && view === 'school_parent');
    location.replace(ok ? go : (SCHOOL_HOME[view] || 'index.html'));
    return true;
  }

  // Account, help and log out live in the profile circle (top right)
  function profileMenu(view) {
    const pic = document.getElementById('me-initials-small') || document.querySelector('.bar-right .initials');
    if (!pic || pic.dataset.menu) return;
    pic.dataset.menu = '1'; pic.setAttribute('role', 'button'); pic.setAttribute('tabindex', '0'); pic.setAttribute('aria-haspopup', 'true'); pic.setAttribute('aria-expanded', 'false');
    pic.style.cursor = 'pointer';
    const m = document.createElement('div'); m.className = 'prof-menu'; m.hidden = true; m.setAttribute('role', 'menu');
    m.innerHTML = `<a role="menuitem" href="${SETTINGS[view] || 'settings.html'}">⚙️ Account settings</a><a role="menuitem" href="help.html">❓ Help Centre</a><a role="menuitem" href="contact.html">✉️ Contact us</a><a role="menuitem" href="index.html">🌐 Think Nest website</a><a role="menuitem" href="#" class="prof-out">↩ Log out</a>`;
    (pic.parentElement || document.body).style.position = 'relative'; pic.after(m);
    const toggle = open => { m.hidden = !open; pic.setAttribute('aria-expanded', String(open)); };
    pic.addEventListener('click', e => { e.stopPropagation(); toggle(m.hidden); });
    pic.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(m.hidden); } if (e.key === 'Escape') toggle(false); });
    document.addEventListener('click', e => { if (!m.contains(e.target)) toggle(false); });
    m.querySelector('.prof-out').addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  }

  // ----- Welcome tour (first visit, once per role) -----
  const TOURS = {
    student: [['👋', 'Welcome to Think Nest!', 'This is your learning nest. Here’s a quick tour of the best bits. It takes 30 seconds.'],
      ['📚', 'Your courses', 'Find and join courses in <b>Online Courses → Find a course</b>. Your school class is under <b>🏫 My Classes</b>. Inside each lesson you’ll find quizzes, worksheets, videos and activities.'],
      ['🏆', 'Earn Nest Points', 'Hand in work, come to class and help others to earn points and badges. Grow from 🥚 Hatchling to 🏆 Eagle in <b>My Progress</b>!'],
      ['💬', 'Learn together', 'Make friends, join study groups and post in the <b>Community</b>. Be kind, and use <b>Report</b> if something isn’t right.']],
    parent: [['👋', 'Welcome to Think Nest!', 'Here’s a quick tour to help you follow your children’s learning.'],
      ['👧👦', 'Your children', '<b>My children</b> shows each child’s courses, progress, certificates and attendance. Waiting for a child to join? Copy their <b>invite link</b>.'],
      ['🧭', 'Find a class', 'On the home page, choose a subject under <b>Think Paths</b> to see classes for your child’s curriculum and grade.'],
      ['🚗', 'Something for you too', '<b>Beyond the School Run</b> is our Parent Hub: workshops just for you, and the private <b>Parent Café</b>.']],
    teacher: [['👋', 'Welcome to Think Nest!', 'Thank you for teaching with us. Here’s a quick tour of your toolkit.'],
      ['📘', 'Courses and lessons', '<b>📘 Online Courses → My courses</b>: create a course, add lessons, then <b>+ Add to this lesson</b> for 10 tools, many with AI help.'],
      ['📋', 'Classes, attendance and certificates', 'Create a class in <b>🏫 My Classes</b>: add students, then use its community, attendance, insights and report cards, all inside the class.'],
      ['🔔', 'Beyond the Bell', 'Our Teacher Hub is for <i>you</i>: workshops, the <b>Teacher Café</b> and <b>Coffee &amp; Connections</b>.']]
  };
  TOURS.admin = TOURS.teacher;
  const TOURS_AR = {
    student: [['👋', 'أهلًا بك في ثينك نست!', 'هذا عشّك التعليمي. إليك جولة سريعة على أجمل ما فيه، تستغرق 30 ثانية فقط.'],
      ['📚', 'دوراتك', 'ابحث عن الدورات وانضم إليها من <b>الدورات عبر الإنترنت ← ابحث عن دورة</b>. وتجد فصلك المدرسي في <b>🏫 فصولي</b>. ستجد داخل كل درس اختبارات وأوراق عمل وفيديوهات وأنشطة.'],
      ['🏆', 'اجمع نقاط نست', 'سلّم أعمالك، واحضر حصصك، وساعد الآخرين لتجمع النقاط والأوسمة. انتقل من 🥚 فرخ صغير إلى 🏆 نسر في <b>تقدّمي</b>!'],
      ['💬', 'تعلّموا معًا', 'كوّن صداقات، وانضم إلى مجموعات الدراسة، وشارك في <b>المجتمع</b>. كن لطيفًا، واستخدم <b>إبلاغ</b> إذا رأيت شيئًا غير مناسب.']],
    parent: [['👋', 'أهلًا بك في ثينك نست!', 'إليك جولة سريعة تساعدك على متابعة تعلّم أبنائك.'],
      ['👧👦', 'أبناؤك', 'تعرض صفحة <b>أبنائي</b> دورات كل طفل وتقدّمه وشهاداته وحضوره. تنتظر انضمام أحد أبنائك؟ انسخ <b>رابط الدعوة</b> الخاص به.'],
      ['🧭', 'ابحث عن فصل', 'من الصفحة الرئيسية، اختر مادة ضمن <b>مسارات التفكير</b> لترى الفصول المناسبة لمنهج طفلك وصفه.'],
      ['🚗', 'شيء لك أنت أيضًا', '<b>ما بعد مشوار المدرسة</b> هو مجتمع أولياء الأمور: ورش مخصّصة لك، و<b>مقهى أولياء الأمور</b> الخاص.']],
    teacher: [['👋', 'أهلًا بك في ثينك نست!', 'شكرًا لتدريسك معنا. إليك جولة سريعة على أدواتك.'],
      ['📘', 'الدورات والدروس', '<b>📘 الدورات عبر الإنترنت ← دوراتي</b>: أنشئ دورة، وأضف دروسًا، ثم <b>+ أضف إلى هذا الدرس</b> لتختار من 10 أدوات، كثير منها بمساعدة الذكاء الاصطناعي.'],
      ['📋', 'الفصول والحضور والشهادات', 'أنشئ فصلًا من <b>🏫 فصولي</b>: أضف الطلاب، ثم استخدم مجتمعه والحضور والتحليلات والتقارير، كلها داخل الفصل.'],
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

  try { const c = JSON.parse(sessionStorage.getItem('tn_school_ctx') || 'null'); if (c && c.color_primary) { document.documentElement.style.setProperty('--school', c.color_primary); document.documentElement.style.setProperty('--school2', c.color_accent || '#F27A6F'); } } catch (_) {}
  async function firstPassword() {
    let u = null; try { const { data } = await db.auth.getSession(); u = data.session && data.session.user; } catch (_) { return; }
    if (!u || !(u.user_metadata || {}).must_change_password || document.getElementById('tn-pw1')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="tn-pw1" id="tn-pw1" role="dialog" aria-modal="true" aria-labelledby="tn-pw1-h"><form class="tn-pw1-card" id="tn-pw1-f">
      <div class="tn-pw1-ic" aria-hidden="true">🔑</div><h2 id="tn-pw1-h">Choose your own password</h2>
      <p>Welcome to Think Nest! You logged in with a starting password from your school. Please choose your own password now. Only you will know it.</p>
      <label>New password <input type="password" name="p1" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters"></label>
      <label>Type it again <input type="password" name="p2" minlength="8" required autocomplete="new-password"></label>
      <p class="tn-pw1-err" role="alert" hidden></p><button class="btn btn-red">Save my password</button></form></div>`);
    const f = document.getElementById('tn-pw1-f'), err = f.querySelector('.tn-pw1-err');
    setTimeout(() => f.p1.focus(), 50);
    f.onsubmit = async e => {
      e.preventDefault(); err.hidden = true;
      if (f.p1.value.length < 8) { err.textContent = 'Please use at least 8 characters.'; err.hidden = false; return; }
      if (f.p1.value !== f.p2.value) { err.textContent = 'The two passwords don’t match.'; err.hidden = false; return; }
      const b = f.querySelector('button'); b.disabled = true;
      const { error } = await db.auth.updateUser({ password: f.p1.value, data: { must_change_password: false } });
      b.disabled = false;
      if (error) { err.textContent = (typeof friendly === 'function' ? friendly(error) : error.message); err.hidden = false; return; }
      document.getElementById('tn-pw1').remove(); if (typeof say === 'function') say('🔑 Your new password is saved.');
    };
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(firstPassword, 600));
  window.buildNav = build;
  window.TN_MENUS = MENUS;
  window.TN_ROLE = null;
  document.addEventListener('DOMContentLoaded', async () => {
    if (!document.querySelector('.side nav') || typeof db === 'undefined') return;
    const role = await roleNow();
    window.TN_ROLE = role;
    build(role);
    if (keepInSchool(role)) return;
    if (!window.TN_SCHOOL) setTimeout(() => welcomeTour(role), 900);
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
