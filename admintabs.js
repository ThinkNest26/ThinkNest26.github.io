// ===== Admin dashboard: tabs, red counters, quick numbers =====
(function () {
  const TABS = { accounts: ['n-newacc', 'n-pending', 'n-delreq'], hubs: ['n-hubreq'], messages: ['n-contact'], safety: ['n-reports', 'n-msgs'], learning: [] };
  // old notification links (#new-accounts, #hub-requests…) open the right tab
  const ANCHOR = { 'new-accounts': 'accounts', 'data-requests': 'accounts', 'hub-requests': 'hubs', 'connect-admin': 'hubs', 'messages': 'messages', 'email-admin': 'messages', 'waitlists': 'learning' };
  function show(k, scrollTo) {
    document.querySelectorAll('.adm-tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
    document.querySelectorAll('.adm-pane').forEach(p => p.hidden = p.id !== 'pane-' + k);
    try { sessionStorage.setItem('tn_admin_tab', k); } catch (_) {}
    if (scrollTo) { const el = document.getElementById(scrollTo); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }
  }
  const num = id => { const el = document.getElementById(id); return el ? Number(el.textContent) || 0 : 0; };
  function counters() {
    let total = 0;
    Object.entries(TABS).forEach(([k, ids]) => {
      const n = ids.reduce((s, id) => s + num(id), 0); total += n;
      const b = document.querySelector(`[data-badge="${k}"]`); if (b) { b.textContent = n; b.hidden = !n; }
    });
    const w = document.getElementById('st-waiting'); if (w) w.textContent = total;
  }
  document.addEventListener('DOMContentLoaded', async () => {
    const bar = document.querySelector('.adm-tabs'); if (!bar) return;
    bar.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { show(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); } });
    bar.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const all = [...bar.querySelectorAll('[data-tab]')], i = all.indexOf(document.activeElement); if (i < 0) return;
      const n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]; n.focus(); n.click();
    });
    const h = location.hash.slice(1);
    if (TABS[h] !== undefined) show(h);
    else if (ANCHOR[h]) show(ANCHOR[h], h);
    else { let k = 'accounts'; try { k = sessionStorage.getItem('tn_admin_tab') || k; } catch (_) {} show(TABS[k] !== undefined ? k : 'accounts'); }
    // counters update as each section finishes loading
    document.querySelectorAll('.adm-pane .count').forEach(el => new MutationObserver(counters).observe(el, { childList: true, characterData: true, subtree: true }));
    setTimeout(counters, 1500); setTimeout(counters, 4000);
    try {
      const { count } = await db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent');
      const p = document.getElementById('st-parents'); if (p) p.textContent = count || 0;
    } catch (_) {}
    const bk = document.getElementById('adm-backup'); if (bk) bk.addEventListener('click', backup);
    const u = document.getElementById('adm-updated'); if (u) u.textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  });
  // ----- Download a backup of the important data (JSON file) -----
  const BACKUP_TABLES = ['profiles', 'courses', 'lessons', 'lesson_items', 'enrollments', 'lesson_progress', 'item_responses', 'certificates', 'attendance',
    'parent_links', 'family_children', 'study_groups', 'group_members', 'hub_members', 'hub_profiles', 'posts', 'post_comments', 'contact_messages',
    'cafe_meetups', 'points_log', 'site_settings', 'curriculum_grades', 'data_requests', 'sessions', 'course_interest'];
  async function backup() {
    const btn = document.getElementById('adm-backup'); btn.disabled = true;
    const out = { made: new Date().toISOString(), site: 'Think Nest', tables: {} }, skipped = [];
    for (const t of BACKUP_TABLES) {
      btn.textContent = 'Saving ' + t + '…';
      let rows = [], from = 0;
      try {
        while (true) {
          const { data, error } = await db.from(t).select('*').range(from, from + 999);
          if (error) { skipped.push(t); break; }
          rows = rows.concat(data || []); if (!data || data.length < 1000) break; from += 1000;
        }
      } catch (_) { skipped.push(t); }
      if (!skipped.includes(t)) out.tables[t] = rows;
    }
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'thinknest-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    btn.disabled = false; btn.textContent = '⬇ Download a backup';
    const n = Object.values(out.tables).reduce((s, r) => s + r.length, 0);
    say(`Backup saved: ${n} records from ${Object.keys(out.tables).length} tables.` + (skipped.length ? ' Skipped: ' + skipped.join(', ') : ''));
  }
})();
