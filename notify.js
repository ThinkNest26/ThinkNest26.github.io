// ===== Think Nest notifications bell (every logged-in page) =====
// Uses db, esc() from app.js
(async function () {
  const bar = document.querySelector('.app-bar .bar-right');
  if (!bar || typeof db === 'undefined') return;
  const { data: { session } } = await db.auth.getSession();
  if (!session) return;
  const uid = session.user.id;

  // Replace the old "coming soon" bell (or add one) with a real button
  const old = bar.querySelector('.bell');
  const bell = document.createElement('button');
  bell.className = 'bell'; bell.type = 'button';
  bell.setAttribute('aria-label', 'Notifications'); bell.setAttribute('aria-expanded', 'false'); bell.setAttribute('aria-haspopup', 'true');
  bell.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg><span class="bell-count" hidden></span>';
  if (old) old.replaceWith(bell); else bar.prepend(bell);

  const panel = document.createElement('div');
  panel.className = 'notif-panel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Notifications');
  panel.innerHTML = '<div class="notif-head"><b>Notifications</b><button class="link-btn" id="notif-all">Mark all as read</button></div><div class="notif-list" id="notif-list"><p class="empty">Loading…</p></div>';
  bar.style.position = 'relative';
  bar.appendChild(panel);

  const icon = k => ({ like: '👍', comment: '💬', friend: '🤝', invite: '👥', group: '📌', message: '✉️', session: '📅', approval: '✅' }[k] || '🔔');
  const ago = ts => { const s = (Date.now() - new Date(ts)) / 1000; return s < 60 ? 'Just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' h ago' : new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
  const countEl = bell.querySelector('.bell-count');

  async function refreshCount() {
    const { count } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false);
    countEl.hidden = !count; countEl.textContent = count > 9 ? '9+' : count || '';
  }
  async function loadList() {
    const { data } = await db.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30);
    const list = document.getElementById('notif-list');
    list.innerHTML = (data || []).length ? data.map(n => `<a class="notif ${n.read ? '' : 'unread'}" href="${esc((n.kind === 'approval' || /waiting for approval/i.test(n.title || '')) && /^community\.html$/.test(n.link || '') ? 'community.html#pending' : (n.link || '#'))}" data-nid="${n.id}">
        <span class="notif-ic" aria-hidden="true">${icon(n.kind)}</span><span class="notif-text">${esc(n.title)}<span class="meta">${ago(n.created_at)}</span></span></a>`).join('')
      : '<p class="empty">You’re all caught up. 🎉</p>';
  }
  bell.addEventListener('click', async e => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    bell.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) loadList();
  });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target)) { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; bell.focus(); } });
  panel.addEventListener('click', async e => {
    const a = e.target.closest('[data-nid]');
    if (a) { await db.from('notifications').update({ read: true }).eq('id', Number(a.dataset.nid)); return; }
    if (e.target.id === 'notif-all') {
      await db.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false);
      refreshCount(); loadList();
    }
  });
  // Opening a chat or a page marks matching notifications as read
  const here = location.pathname.split('/').pop() + location.search;
  if (here.startsWith('messages.html?c=') || here.startsWith('friends.html') || here.startsWith('groups.html') || here.startsWith('teacher-requests.html')) {
    await db.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false).eq('link', here);
  }
  refreshCount();
  db.channel('notif-' + uid).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + uid }, () => {
    refreshCount(); if (!panel.hidden) loadList();
  }).subscribe();
})();
