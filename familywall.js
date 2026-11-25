// ===== Think Nest: the private Family wall (only a parent, their linked children and the children's other parents see it) =====
async function startFamilyWall() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'login.html'; return; }
  const uid = session.user.id;
  document.body.classList.remove('loading');
  const side = document.getElementById('side'), shade = document.getElementById('side-shade'), st = document.getElementById('side-toggle');
  if (st && side && shade) { st.addEventListener('click', () => { side.classList.add('open'); shade.classList.add('show'); }); shade.addEventListener('click', () => { side.classList.remove('open'); shade.classList.remove('show'); }); }
  const { data: me } = await db.from('profiles').select('role, full_name').eq('id', uid).maybeSingle();
  const box = document.getElementById('fw'), E = s => esc(s), KINDS = { note: ['💬', 'Note'], praise: ['🌟', 'Praise'], reminder: ['⏰', 'Reminder'], celebrate: ['🎉', 'Celebrate'], question: ['❓', 'Question'] };
  const { data: people, error: pe } = await db.rpc('my_family_people');
  if (pe) { box.innerHTML = `<div class="empty-box"><p>${/function|schema cache/i.test(pe.message || '') ? 'Please run the latest Supabase update (Family wall) first.' : E(friendly(pe))}</p></div>`; return; }
  const fam = (people || []).filter(p => p.id !== uid);
  const isParent = me && (me.role === 'parent' || (people || []).some(p => p.id === uid && p.is_parent));
  if (!fam.length) {
    box.innerHTML = `<div class="empty-box"><p>🏡 Your Family wall opens once you’re linked to your family.</p>${isParent ? '<a class="btn btn-red" href="add-child.html">Add your child</a>' : '<a class="btn btn-red" href="settings.html">Join your parent’s family</a>'}</div>`;
    return;
  }
  let kind = 'note';
  box.innerHTML = `<p class="fw-lock">🔒 Only your family can see this wall: ${fam.map(p => '<b>' + E(p.name) + '</b>').join(', ')} and you. Teachers and other families can’t.</p>
    <section class="panel fw-new"><textarea id="fw-body" maxlength="1000" rows="3" placeholder="Share something with your family…"></textarea>
      <div class="fw-kinds" role="group" aria-label="Type of post">${Object.entries(KINDS).map(([k, [ic, t]]) => `<button type="button" class="pill ${k === kind ? 'pill-live' : 'pill-soft'}" data-kind="${k}">${ic} ${t}</button>`).join(' ')}</div>
      <div style="text-align:right;margin-top:10px"><button type="button" class="btn btn-red" id="fw-post">Post</button></div></section>
    <div id="fw-list"><p class="empty">Loading…</p></div>`;
  const list = document.getElementById('fw-list');
  async function load() {
    const { data: posts } = await db.from('family_posts').select('*').order('created_at', { ascending: false }).limit(50);
    const ids = (posts || []).map(p => p.id);
    const [{ data: cs }, { data: hs }] = ids.length ? await Promise.all([db.from('family_comments').select('*').in('post_id', ids).order('created_at'), db.from('family_reactions').select('*').in('post_id', ids)]) : [{ data: [] }, { data: [] }];
    const mineKids = new Set(isParent ? (people || []).filter(p => !p.is_parent).map(p => p.id) : []);
    const canDel = a => a === uid || mineKids.has(a);
    const when = d => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    list.innerHTML = (posts || []).length ? posts.map(p => { const [ic, t] = KINDS[p.kind] || KINDS.note, hearts = (hs || []).filter(h => h.post_id === p.id), mine = hearts.some(h => h.user_id === uid);
      return `<article class="panel fw-post fw-${p.kind}" data-post="${p.id}"><div class="fw-head"><span class="initials">${E((p.author_name || '?').slice(0, 1).toUpperCase())}</span><div><b>${E(p.author_name || 'Someone')}</b> <span class="tag">${ic} ${t}</span><span class="meta">${when(p.created_at)}</span></div>${canDel(p.author_id) ? '<button type="button" class="link-btn" data-del-post>Delete</button>' : ''}</div>
        <p class="fw-text">${E(p.body)}</p>
        <div class="fw-actions"><button type="button" class="pill ${mine ? 'pill-live' : 'pill-soft'}" data-heart aria-pressed="${mine}">❤️ ${hearts.length || ''}</button></div>
        <div class="fw-comments">${(cs || []).filter(c => c.post_id === p.id).map(c => `<div class="fw-comment" data-comment="${c.id}"><b>${E(c.author_name || 'Someone')}</b> ${E(c.body)} ${canDel(c.author_id) ? '<button type="button" class="link-btn" data-del-comment>Delete</button>' : ''}</div>`).join('')}
          <form class="fw-reply"><input name="r" maxlength="500" placeholder="Write a reply…" aria-label="Reply"><button class="pill pill-soft">Reply</button></form></div></article>`; }).join('')
      : '<div class="empty-box"><p>Nothing here yet. Be the first to share something with your family! 🏡</p></div>';
  }
  box.addEventListener('click', async e => {
    const k = e.target.closest('[data-kind]'); if (k) { kind = k.dataset.kind; box.querySelectorAll('[data-kind]').forEach(b => { b.classList.toggle('pill-live', b === k); b.classList.toggle('pill-soft', b !== k); }); return; }
    if (e.target.id === 'fw-post') {
      const t = document.getElementById('fw-body'); if (!t.value.trim()) return say('Write something first.');
      e.target.disabled = true; const { error } = await db.from('family_posts').insert({ body: t.value.trim(), kind }); e.target.disabled = false;
      if (error) return say(friendly(error)); t.value = ''; say('Posted to your Family wall. 🏡'); return load();
    }
    const post = e.target.closest('[data-post]'); if (!post) return; const pid = Number(post.dataset.post);
    if (e.target.closest('[data-heart]')) { const on = e.target.closest('[data-heart]').getAttribute('aria-pressed') === 'true';
      const { error } = on ? await db.from('family_reactions').delete().eq('post_id', pid).eq('user_id', uid) : await db.from('family_reactions').insert({ post_id: pid });
      if (error) say(friendly(error)); return load(); }
    if (e.target.closest('[data-del-post]') && confirm('Delete this post?')) { const { error } = await db.from('family_posts').delete().eq('id', pid); if (error) say(friendly(error)); return load(); }
    const dc = e.target.closest('[data-del-comment]'); if (dc && confirm('Delete this reply?')) { const { error } = await db.from('family_comments').delete().eq('id', Number(dc.closest('[data-comment]').dataset.comment)); if (error) say(friendly(error)); return load(); }
  });
  box.addEventListener('submit', async e => {
    const f = e.target.closest('.fw-reply'); if (!f) return; e.preventDefault();
    const v = f.r.value.trim(); if (!v) return;
    const { error } = await db.from('family_comments').insert({ post_id: Number(f.closest('[data-post]').dataset.post), body: v });
    if (error) return say(friendly(error)); load();
  });
  load();
}
