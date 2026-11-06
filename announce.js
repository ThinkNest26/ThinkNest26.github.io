// ===== Think Nest for Schools: announcements (everyone in a school) =====
const AN_E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AN_AUD = { all: '🏫 Whole school', staff: '👩‍🏫 All staff', parents: '👪 All parents', students: '🎒 All students', grade: '🎓 ', class: '🏫 A class' };
const anWhen = d => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const anText = t => AN_E(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
async function startAnnouncements() {
  await initShell();
  const box = document.getElementById('an-list');
  const { data, error } = await db.rpc('my_announcements');
  if (error) { box.innerHTML = '<p class="empty">Announcements will appear here.</p>'; return; }
  const L = data || [];
  const draw = () => {
    const unread = L.filter(a => !a.is_read).length;
    document.getElementById('an-top').innerHTML = unread ? `<span class="an-count">${unread} new</span><button type="button" class="link-btn" id="an-all">✓ Mark all as read</button>` : '';
    box.innerHTML = L.length ? L.map(a => `<article class="panel an-card ${a.is_read ? '' : 'new'} ${a.pinned ? 'pin' : ''}" id="a${a.id}" data-id="${a.id}">
        <header><div><h2>${a.pinned ? '📌 ' : ''}${AN_E(a.title)}${a.is_read ? '' : ' <span class="an-new">New</span>'}</h2>
          <span class="meta">${AN_E(a.school_name)} · ${AN_E(a.author_name || 'School')} · ${anWhen(a.created_at)} · ${AN_E(a.audience === 'grade' ? '🎓 ' + (a.target || '') : AN_AUD[a.audience] || '')}</span></div></header>
        <div class="an-body">${anText(a.body)}</div>
        ${a.is_read ? '' : '<button type="button" class="pill pill-soft an-read">✓ Mark as read</button>'}</article>`).join('')
      : '<div class="empty-box"><p>No announcements yet. When your school posts one, it will appear here. 📣</p></div>';
    const all = document.getElementById('an-all');
    if (all) all.onclick = async () => { await Promise.all(L.filter(a => !a.is_read).map(a => db.rpc('mark_announcement_read', { aid: a.id }))); L.forEach(a => a.is_read = true); draw(); };
  };
  box.addEventListener('click', async e => {
    const b = e.target.closest('.an-read'); if (!b) return;
    const card = b.closest('[data-id]'), a = L.find(x => x.id === Number(card.dataset.id));
    await db.rpc('mark_announcement_read', { aid: a.id }); a.is_read = true; draw();
  });
  draw();
  const h = location.hash.match(/^#a(\d+)$/);
  if (h) { const a = L.find(x => x.id === Number(h[1])); if (a && !a.is_read) { db.rpc('mark_announcement_read', { aid: a.id }); }
    const el = document.getElementById('a' + h[1]); if (el) { el.classList.add('flash'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
}
