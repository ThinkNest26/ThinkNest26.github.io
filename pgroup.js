// ===== Think Nest: one Parent Group (feed, resources, members) =====
async function startParentGroup() {
  const { user, me } = await initParent();
  const uid = user ? user.id : (await db.auth.getSession()).data.session.user.id;
  const box = document.getElementById('pg-page');
  const id = Number(new URLSearchParams(location.search).get('id'));
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ini = n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const when = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const isAdmin = me && me.role === 'admin';

  async function draw() {
    const { data: g, error } = await db.from('parent_groups').select('*').eq('id', id).maybeSingle();
    if (error && /relation|does not exist/i.test(error.message || '')) { box.innerHTML = '<div class="empty-box"><p>Parent groups need the latest Supabase update (parent_connections.sql).</p></div>'; return; }
    if (!g) { box.innerHTML = '<div class="empty-box"><p>This group doesn’t exist, or it is only for members of Beyond the School Run.</p><a class="btn btn-red" href="parent-connect.html#groups">See parent groups</a></div>'; return; }
    document.title = g.name + ' – Think Nest';
    const { data: mm } = await db.from('parent_group_members').select('*').eq('group_id', id).order('created_at');
    const members = mm || [], mine = members.find(m => m.user_id === uid);
    const owner = g.owner_id === uid || isAdmin, member = owner || (mine && mine.status === 'active');
    const head = `<section class="cx-hero"><span class="cx-cup">👥</span><div><span class="hub-kicker">Parent group · started by ${E(g.owner_name || 'a parent')}</span><h1>${E(g.name)}</h1>${g.about ? `<p>${E(g.about)}</p>` : ''}</div></section>`;
    if (!member) {
      box.innerHTML = head + `<section class="panel"><p>${mine ? '⏳ Your request to join is waiting for the host to approve.' : 'Join this group to see its posts, resources and members.'}</p>
        ${mine ? '<button type="button" class="link-btn" id="pg-leave">Cancel my request</button>' : '<button type="button" class="btn btn-red" id="pg-join">Ask to join</button>'}</section>`;
      return;
    }
    const { data: ps } = await db.from('parent_group_posts').select('*').eq('group_id', id).order('created_at', { ascending: false }).limit(100);
    const active = members.filter(m => m.status === 'active'), waiting = members.filter(m => m.status === 'pending');
    let addList = '';
    if (owner) {
      const { data: dir } = await db.rpc('cafe_directory', { sp: 'parents' });
      const ids = new Set(members.map(m => m.user_id));
      const can = (dir || []).filter(p => !ids.has(p.id));
      addList = can.length ? `<form class="pg-add" id="pg-add"><label>Add a parent <select name="who"><option value="">Choose a parent</option>${can.map(p => `<option value="${p.id}">${E(p.full_name)}</option>`).join('')}</select></label><button class="pill pill-soft">Add</button></form>` : '';
    }
    box.innerHTML = head + `<div class="pg-grid"><div>
        <form class="panel auth-form" id="pg-post"><label>Share with the group <textarea name="body" rows="3" maxlength="2000" required placeholder="Ask a question, share a tip or a resource…"></textarea></label>
          <label>Link to a resource (optional) <input type="url" name="link" placeholder="https://…"></label>
          <p class="meta">🛡️ Keep it respectful. No personal contact details. Posts can be reviewed by Think Nest.</p>
          <button class="btn btn-red">Post</button></form>
        ${(ps || []).length ? ps.map(p => `<article class="panel post"><header class="post-head"><span class="initials">${E(ini(p.author_name))}</span><div><b>${E(p.author_name || 'A parent')}</b><span class="meta">${when(p.created_at)}</span></div>
            ${p.author_id === uid || owner ? `<button type="button" class="link-btn" data-pdel="${p.id}">Delete</button>` : ''}</header>
            <p>${E(p.body).replace(/\n/g, '<br>')}</p>${p.link ? `<p><a href="${E(p.link)}" target="_blank" rel="noopener">📎 ${E(p.link)}</a></p>` : ''}</article>`).join('')
          : '<div class="empty-box"><p>No posts yet. Say hello to the group! 👋</p></div>'}
      </div><aside>
        ${owner && waiting.length ? `<section class="panel"><h3>Asking to join (${waiting.length})</h3>${waiting.map(m => `<div class="pending-row"><span class="initials">${E(ini(m.user_name))}</span><div><b>${E(m.user_name)}</b></div>
            <span class="req-actions"><button class="pill pill-live" data-mok="${m.user_id}">Approve</button><button class="pill pill-soft" data-mno="${m.user_id}">Decline</button></span></div>`).join('')}</section>` : ''}
        <section class="panel"><h3>Members (${active.length})</h3>${active.map(m => `<div class="pending-row"><span class="initials">${E(ini(m.user_name))}</span><div><b>${E(m.user_name)}</b>${m.role === 'owner' ? '<span class="meta">Host</span>' : ''}</div>
            ${owner && m.role !== 'owner' ? `<button type="button" class="link-btn" data-mno="${m.user_id}">Remove</button>` : ''}</div>`).join('')}${addList}</section>
        <section class="panel">${owner ? '<button type="button" class="link-btn danger" id="pg-delete">Delete this group</button>' : '<button type="button" class="link-btn" id="pg-leave">Leave this group</button>'}</section>
      </aside></div>`;
  }

  box.addEventListener('click', async e => {
    const t = e.target;
    if (t.id === 'pg-join') { t.disabled = true; const { error } = await db.from('parent_group_members').insert({ group_id: id, user_id: uid }); if (error) { t.disabled = false; return say(friendly(error)); } say('Request sent. The host will approve you.'); return draw(); }
    if (t.id === 'pg-leave') { if (!confirm('Leave this group?')) return; const { error } = await db.from('parent_group_members').delete().eq('group_id', id).eq('user_id', uid); if (error) return say(friendly(error)); location.href = 'parent-connect.html#groups'; return; }
    if (t.id === 'pg-delete') { if (!confirm('Delete this group and all its posts? This can’t be undone.')) return; const { error } = await db.from('parent_groups').delete().eq('id', id); if (error) return say(friendly(error)); location.href = 'parent-connect.html#groups'; return; }
    const ok = t.closest('[data-mok]'); if (ok) { const { error } = await db.from('parent_group_members').update({ status: 'active' }).eq('group_id', id).eq('user_id', ok.dataset.mok); if (error) return say(friendly(error)); say('Approved.'); return draw(); }
    const no = t.closest('[data-mno]'); if (no) { if (!confirm('Remove this parent from the group?')) return; const { error } = await db.from('parent_group_members').delete().eq('group_id', id).eq('user_id', no.dataset.mno); if (error) return say(friendly(error)); return draw(); }
    const d = t.closest('[data-pdel]'); if (d) { if (!confirm('Delete this post?')) return; const { error } = await db.from('parent_group_posts').delete().eq('id', Number(d.dataset.pdel)); if (error) return say(friendly(error)); return draw(); }
  });
  box.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    if (f.id === 'pg-post') {
      const body = f.body.value.trim(), link = f.link.value.trim();
      if (!body) return say('Write something first.');
      if (typeof tnBlocked === 'function' && await tnBlocked(body, 'parent_group', null)) return;
      const { error } = await db.from('parent_group_posts').insert({ group_id: id, body, link: link || null });
      if (error) return say(friendly(error)); return draw();
    }
    if (f.id === 'pg-add') {
      if (!f.who.value) return say('Choose a parent to add.');
      const { error } = await db.from('parent_group_members').insert({ group_id: id, user_id: f.who.value, status: 'active' });
      if (error) return say(friendly(error)); say('Added to the group.'); return draw();
    }
  });
  draw();
}
