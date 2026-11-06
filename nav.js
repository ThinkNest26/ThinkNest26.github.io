// ===== Think Nest sidebar: a few main sections with drop-down sub-menus =====
// Uses db from supabase-config.js
(function () {
  const MENUS = {
    student: [
      { ic: '🏠', label: 'Dashboard', href: 'student-dashboard.html' },
      { ic: '📚', label: 'Learning', items: [['my-courses.html', 'My Courses'], ['all-courses.html', 'All Courses'], ['my-activities.html', 'My Activities'], ['calendar.html', 'My Calendar'], ['revision.html', 'Revision Hub'], ['mentors.html', 'Mentors'], ['recordings.html', 'My Recordings'], ['files.html', 'My Files']] },
      { ic: '🏆', label: 'My Progress', items: [['rewards.html', 'My Rewards'], ['certificates.html', 'My Certificates']] },
      { ic: '💬', label: 'Community', items: [['community.html', 'Community'], ['classes.html', 'My Classes'], ['groups.html', 'Study Groups'], ['friends.html', 'My Friends'], ['messages.html', 'Messages']] },
      { ic: '⚙️', label: 'Account', items: [['settings.html', 'Account Settings'], ['contact.html', 'Contact Us'], ['#logout', 'Log out']] }
    ],
    teacher: [
      { ic: '🏠', label: 'Dashboard', href: 'teacher-dashboard.html' },
      { ic: '📚', label: 'Teaching', items: [['teacher-courses.html', 'My Courses'], ['teacher-calendar.html', 'Live Classes'], ['teacher-objectives.html', 'Objectives & Activities'], ['revision.html', 'Revision Hub'], ['teacher-hub.html', 'Beyond the Bell (hub)']] },
      { ic: '🏫', label: 'My Classes', items: [['classes.html', 'My Classes'], ['teacher-attendance.html', 'Attendance'], ['groups.html', 'Study Groups']] },
      { ic: '🏅', label: 'Certificates', href: 'teacher-certificates.html' },
      { ic: '💬', label: 'Community', items: [['community.html', 'Community'], ['teacher-cafe.html', '☕ Teacher Café'], ['teacher-connect.html', '🤝 Coffee & Connections'], ['messages.html', 'Messages'], ['teacher-requests.html', 'Session Requests']] },
      { ic: '⚙️', label: 'Account', items: [['teacher-settings.html', 'Account Settings'], ['contact.html', 'Contact Us'], ['index.html', 'Think Nest website'], ['#logout', 'Log out']] }
    ],
    parent: [
      { ic: '🏠', label: 'My children', href: 'parent-dashboard.html' },
      { ic: '➕', label: 'Add a child', href: 'add-child.html' },
      { ic: '🪺', label: 'Beyond the School Run', href: 'parent-hub.html' },
      { ic: '☕', label: 'Parent Café', href: 'parent-cafe.html' },
      { ic: '💬', label: 'Community', href: 'community.html' },
      { ic: '⚙️', label: 'Account', items: [['parent-settings.html', 'Account Settings'], ['contact.html', 'Contact Us'], ['#logout', 'Log out']] }
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
      menu = menu.slice(0, -1).concat([{ ic: '👪', label: 'Parent', items: [['parent-dashboard.html', 'My children'], ['add-child.html', 'Add a child'], ['parent-hub.html', 'Beyond the School Run'], ['parent-cafe.html', '☕ Parent Café']] }, acc]);
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

  window.buildNav = build;
  document.addEventListener('DOMContentLoaded', async () => {
    if (!document.querySelector('.side nav') || typeof db === 'undefined') return;
    const role = await roleNow();
    build(role);
    // other scripts may redraw the menu while the page loads; put ours back
    setTimeout(() => { if (!document.querySelector('.side nav.nav2 .nav2-top')) build(role); }, 1500);
  });
})();
