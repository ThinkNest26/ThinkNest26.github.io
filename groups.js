// ===== Think Nest study groups =====
// Uses db, say(), friendly(), esc(), showError() from app.js and initShell() from student.js

const gIni = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const gAgo = ts => { const s = (Date.now() - new Date(ts)) / 1000; return s < 60 ? 'Just now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : s < 604800 ? Math.floor(s / 86400) + 'd' : new Date(ts).toLocaleDateString('en-GB'); };
const gTag = r => r === 'teacher' || r === 'school_leader' ? '<span class="role-tag">Teacher</span>' : r === 'admin' ? '<span class="role-tag admin">Think Nest</span>' : r === 'parent' ? '<span class="role-tag parent">Parent</span>' : '';

// Teachers, parents and the admin use their own menus on these pages
function swapMenu(role) {
  if (window.buildNav) return window.buildNav(role === 'school_leader' ? 'teacher' : role);
  const nav = document.querySelector('.side nav'); if (!nav) return;
  let items = null, title = '';
  if (['teacher', 'school_leader', 'admin'].includes(role)) {
    title = 'Teacher';
    items = (role === 'admin' ? [['admin.html', 'Approvals']] : []).concat([['teacher-dashboard.html', 'Dashboard'], ['teacher-courses.html', 'My Courses'], ['teacher-calendar.html', 'Live Classes'], ['teacher-objectives.html', 'Objectives & Activities'], ['teacher-requests.html', 'Session Requests'], ['classes.html', 'My Classes'], ['teacher-attendance.html', 'Attendance'], ['groups.html', 'Study Groups'], ['messages.html', 'Messages'], ['community.html', 'Community'], ['teacher-settings.html', 'Account Settings']]);
  } else if (role === 'parent') {
    title = 'Parent';
    items = [['parent-dashboard.html', 'My children'], ['add-child.html', 'Add a child'], ['community.html', 'Community'], ['parent-settings.html', 'Account Settings']];
  }
  if (!items) return;
  const here = location.pathname.split('/').pop();
  nav.innerHTML = `<h5 class="first">${title}</h5><ul>${items.map(([h, l]) => `<li><a href="${h}"${h === here ? ' class="active" aria-current="page"' : ''}><span>${l}</span></a></li>`).join('')}</ul>
    <h5>Others</h5><ul><li><a href="contact.html"><span>Contact Us</span></a></li><li><a href="#" id="logout"><span>Log out</span></a></li></ul>`;
  document.getElementById('logout').addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
}

// ---------- My groups ----------
async function startGroups() {
  const { profile: me } = await initShell();
  swapMenu(me.role);
  if (me.role === 'parent') { location.href = 'parent-dashboard.html'; return; }
  const isStudent = me.role === 'student';
  const newBtn = document.getElementById('new-group');
  newBtn.hidden = !isStudent;
  const isTeach = ['teacher', 'school_leader', 'admin'].includes(me.role);
  const tgBtn = document.getElementById('new-tgroup');
  if (tgBtn) { tgBtn.hidden = !isTeach; if (isTeach) tgBtn.addEventListener('click', () => openTeacherGroupDialog('study')); }
  const dlg = document.getElementById('group-dialog'), f = document.getElementById('group-form'), err = document.getElementById('group-error');
  newBtn.addEventListener('click', () => { f.reset(); showError(err, ''); dlg.showModal(); });
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  f.addEventListener('submit', async e => {
    e.preventDefault(); showError(err, '');
    if (f.name.value.trim().length < 2) return showError(err, 'Give the group a name.');
    const { data, error } = await db.rpc('create_group', { gname: f.name.value, gdesc: f.desc.value });
    if (error) return showError(err, friendly(error));
    location.href = 'group.html?id=' + data + '#t-mem';
  });

  async function load() {
    const { data, error } = await db.rpc('my_groups');
    if (error) return say(friendly(error));
    const inv = data.filter(g => g.my_status === 'invited'); let mine = data.filter(g => g.my_status === 'active');
    document.getElementById('invites').innerHTML = inv.length ? '<h2 class="dash-h">Invitations <span class="count">' + inv.length + '</span></h2><section class="approve-list">' + inv.map(g => `<article class="panel person">
        <span class="initials">${esc(gIni(g.name))}</span>
        <div class="person-info"><h4>${esc(g.owner_name)} invited you to “${esc(g.name)}”</h4><span class="meta">${g.members} member${g.members === 1 ? '' : 's'}${g.description ? ' · ' + esc(g.description) : ''}</span></div>
        <div class="person-actions"><button class="pill pill-live" data-join="${g.id}">Join</button><button class="pill pill-soft" data-no="${g.id}">No thanks</button></div></article>`).join('') + '</section>' : '';
    mine = mine.filter(x => x.kind !== 'class');
    document.getElementById('groups').innerHTML = mine.length ? mine.map(g => `<a class="panel group-card" href="group.html?id=${g.id}">
        <span class="group-ic">${esc(gIni(g.name))}</span><b>${esc(g.name)}</b>
        <span class="meta">${g.members} member${g.members === 1 ? '' : 's'}${g.my_role === 'owner' ? ' · you created it' : ''}</span>
        ${g.description ? `<span class="meta">${esc(g.description)}</span>` : ''}</a>`).join('')
      : `<div class="empty-box"><p>${isStudent ? 'You’re not in any study groups yet. Create one and invite your friends.' : 'No study groups yet. Students can invite you to their groups, or you can set one up for a few of your students.'}</p></div>`;
  }
  document.getElementById('invites').addEventListener('click', async e => {
    const b = e.target.closest('[data-join],[data-no]'); if (!b) return;
    const { error } = await db.rpc('respond_group_invite', { gid: Number(b.dataset.join || b.dataset.no), ok: !!b.dataset.join });
    if (error) return say(friendly(error));
    say(b.dataset.join ? 'You joined the group!' : 'Invitation declined.'); load();
  });
  load();
}

// ---------- One group ----------
async function startGroup() {
  const { user, profile: me } = await initShell();
  swapMenu(me.role);
  const gid = Number(new URLSearchParams(location.search).get('id'));
  if (me.role === 'parent') { document.getElementById('back').href = 'parent-dashboard.html'; document.getElementById('back').textContent = '‹ My children'; }
  const [{ data: g }, mem] = await Promise.all([db.from('study_groups').select('*').eq('id', gid).maybeSingle(), db.rpc('group_member_list', { gid })]);
  if (!g) { document.querySelector('main').innerHTML = '<div class="empty-box"><p>This group doesn’t exist, or you’re not a member.</p><a class="btn btn-red" href="groups.html">Back to study groups</a></div>'; return; }
  let members = mem.data || [];
  const meRow = members.find(m => m.user_id === user.id);
  const isMember = meRow && meRow.status === 'active';
  const isOwner = g.owner_id === user.id, isAdmin = me.role === 'admin', isClass = g.kind === 'class', teacherRun = isClass || (isOwner && ['teacher', 'school_leader', 'admin'].includes(me.role));
  if (isClass) { const bk = document.getElementById('back'); if (bk && me.role !== 'parent') { bk.href = 'classes.html'; bk.textContent = '‹ My classes'; } }
  if (meRow && meRow.status === 'invited') { location.href = 'groups.html'; return; }
  document.title = g.name + ' – Think Nest';
  document.getElementById('ro-note').hidden = isMember || isAdmin;
  document.getElementById('gcomposer').hidden = !isMember;
  document.getElementById('res-form').hidden = !isMember;

  function drawHead() {
    const active = members.filter(m => m.status === 'active');
    document.getElementById('ghead').innerHTML = `<span class="group-ic big ${isClass ? 'cls' : ''}">${esc(gIni(g.name))}</span>${isClass ? '<span class="class-flag">🏫 Class</span>' : ''}
      <div><h1>${esc(g.name)}</h1>${g.description ? `<p>${esc(g.description)}</p>` : ''}
      <div class="avatars">${active.slice(0, 8).map(m => `<span class="initials" title="${esc(m.full_name)}">${esc(gIni(m.full_name))}</span>`).join('')}<span class="meta">${active.length} member${active.length === 1 ? '' : 's'}</span></div></div>
      <div class="ghead-actions"><a class="pill pill-live big" href="messages.html?group=${gid}">💬 Group chat</a>${teacherRun && isOwner ? '<button type="button" class="pill pill-soft big" id="att-g">📋 Attendance</button>' : ''}${isOwner ? '<button class="pill pill-soft big" id="edit-g">Edit</button>' : ''}</div>`;
    const ab = document.getElementById('att-g'); if (ab) ab.onclick = () => openAttendanceDialog({ gid, title: g.name });
    const eb = document.getElementById('edit-g');
    if (eb) eb.addEventListener('click', async () => {
      const name = prompt('Group name', g.name); if (name === null) return;
      const desc = prompt('What is it for?', g.description || ''); if (desc === null) return;
      const { error } = await db.rpc('update_group', { gid, gname: name, gdesc: desc });
      if (error) return say(friendly(error));
      g.name = name.trim(); g.description = desc.trim(); drawHead(); say('Saved.');
    });
  }
  drawHead();

  // tabs
  function tab(id) {
    document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x.dataset.tab === id));
    document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.id !== id);
  }
  document.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => tab(t.dataset.tab)));
  if (['#t-mem', '#t-res'].includes(location.hash)) tab(location.hash.slice(1));

  // ----- feed (posts with photos, likes and comments)
  const gsigned = {};
  let gposts = [];
  function gpostHtml(p) {
    const likes = p.group_post_likes || [], comments = (p.group_post_comments || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const liked = likes.some(l => l.user_id === user.id);
    return `<article class="panel post" data-gpost="${p.id}">
        <header class="post-head"><span class="initials" data-av="${p.author_id}">${esc(gIni(p.author_name))}</span><div><b>${esc(p.author_name || 'Member')}</b> ${gTag(p.author_role)}<span class="meta">${gAgo(p.created_at)}</span></div>
        <div class="post-menu">${p.author_id === user.id || isOwner || isAdmin ? '<button class="link-btn" data-del-gpost>Delete</button>' : ''}${p.author_id !== user.id ? '<button class="link-btn" data-rep-gpost>Report</button>' : ''}</div></header>
        <p class="post-body">${esc(p.body).replace(/\n/g, '<br>')}</p>
        ${p.image_path && gsigned[p.image_path] ? `<img class="post-img" src="${gsigned[p.image_path]}" alt="Picture shared by ${esc(p.author_name || 'a member')}">` : ''}
        <div class="post-actions">
          <button class="act ${liked ? 'on' : ''}" data-glike aria-pressed="${liked}" ${isMember ? '' : 'disabled'}>👍 Like${likes.length ? ' · ' + likes.length : ''}</button>
          <button class="act" data-gshow>💬 Comment${comments.length ? ' · ' + comments.length : ''}</button>
        </div>
        <div class="comments" ${comments.length ? '' : 'hidden'}>
          ${comments.map(c => `<div class="comment" data-gcomment="${c.id}"><span class="initials">${esc(gIni(c.author_name))}</span>
            <div class="bubble"><b>${esc(c.author_name || 'Member')}</b> ${gTag(c.author_role)}<p>${esc(c.body)}</p><span class="meta">${gAgo(c.created_at)}${c.author_id === user.id || isOwner || isAdmin ? ' · <button class="link-btn" data-del-gcomment>Delete</button>' : ''}</span></div></div>`).join('')}
          ${isMember ? '<form class="comment-form"><label class="grow"><span class="sr">Write a comment</span><input type="text" name="c" maxlength="1000" placeholder="Write a comment…"></label><button class="pill pill-live">Send</button></form>' : ''}
        </div></article>`;
  }
  const GSEL = '*, group_post_likes(user_id), group_post_comments(id, author_id, author_name, author_role, body, created_at)';
  async function gpics(list) {
    const paths = list.map(p => p.image_path).filter(p => p && !gsigned[p]);
    if (!paths.length) return;
    const { data } = await db.storage.from('groups').createSignedUrls(paths, 3600);
    (data || []).forEach(d => { if (d.signedUrl) gsigned[d.path] = d.signedUrl; });
  }
  async function loadFeed() {
    const { data, error } = await db.from('group_posts').select(GSEL).eq('group_id', gid).order('created_at', { ascending: false }).limit(50);
    if (error) return say(friendly(error));
    gposts = data; await gpics(data);
    document.getElementById('gfeed').innerHTML = data.length ? data.map(gpostHtml).join('')
      : `<div class="empty-box"><p>${isMember ? 'Nothing here yet. Start the conversation!' : 'No posts yet.'}</p></div>`;
  }
  async function refreshGPost(id) {
    const { data } = await db.from('group_posts').select(GSEL).eq('id', id).maybeSingle();
    const el = document.querySelector(`[data-gpost="${id}"]`);
    if (!data || !el) return;
    const open = !el.querySelector('.comments').hidden;
    el.outerHTML = gpostHtml(data);
    if (open) document.querySelector(`[data-gpost="${id}"] .comments`).hidden = false;
  }
  const gc = document.getElementById('gcomposer'), gpicName = document.getElementById('gpic-name');
  gc.pic.addEventListener('change', () => {
    const f = gc.pic.files[0];
    if (f && f.size > 5 * 1024 * 1024) { gc.pic.value = ''; gpicName.textContent = ''; return say('Pictures must be smaller than 5 MB.'); }
    gpicName.textContent = f ? f.name + ' ✕' : '';
  });
  gpicName.addEventListener('click', () => { gc.pic.value = ''; gpicName.textContent = ''; });
  gc.addEventListener('submit', async e => {
    e.preventDefault();
    const body = gc.body.value.trim(); if (!body) return say('Write something before posting.');
    const btn = gc.querySelector('.btn'); btn.disabled = true;
    let image_path = null; const f = gc.pic.files[0];
    if (f) {
      image_path = gid + '/posts/' + Date.now() + '-' + f.name.replace(/[^\w.\-]+/g, '_');
      const up = await db.storage.from('groups').upload(image_path, f);
      if (up.error) { btn.disabled = false; return say(friendly(up.error)); }
    }
    const { error } = await db.from('group_posts').insert({ group_id: gid, body, image_path });
    btn.disabled = false;
    if (error) return say(friendly(error));
    gc.reset(); gpicName.textContent = ''; loadFeed();
  });
  const gfeed = document.getElementById('gfeed');
  gfeed.addEventListener('click', async e => {
    const art = e.target.closest('[data-gpost]'); if (!art) return;
    const id = Number(art.dataset.gpost), p = gposts.find(x => x.id === id) || {};
    if (e.target.closest('[data-glike]')) {
      const liked = (p.group_post_likes || []).some(l => l.user_id === user.id);
      const res = liked ? await db.from('group_post_likes').delete().eq('post_id', id).eq('user_id', user.id) : await db.from('group_post_likes').insert({ post_id: id });
      if (res.error) return say(friendly(res.error));
      const { data } = await db.from('group_posts').select(GSEL).eq('id', id).maybeSingle();
      const i = gposts.findIndex(x => x.id === id); if (data && i > -1) gposts[i] = data;
      return refreshGPost(id);
    }
    if (e.target.closest('[data-gshow]')) { const c = art.querySelector('.comments'); c.hidden = !c.hidden; const inp = c.querySelector('input'); if (!c.hidden && inp) inp.focus(); return; }
    if (e.target.closest('[data-del-gcomment]')) {
      if (!confirm('Delete this comment?')) return;
      const { error } = await db.from('group_post_comments').delete().eq('id', Number(e.target.closest('[data-gcomment]').dataset.gcomment));
      if (error) return say(friendly(error)); return refreshGPost(id);
    }
    if (e.target.closest('[data-del-gpost]')) {
      if (!confirm('Delete this post?')) return;
      const { error } = await db.from('group_posts').delete().eq('id', id);
      if (error) return say(friendly(error));
      if (p.image_path) db.storage.from('groups').remove([p.image_path]);
      return loadFeed();
    }
    if (e.target.closest('[data-rep-gpost]')) {
      const reason = prompt('Why are you reporting this post?'); if (reason === null) return;
      const { error } = await db.from('group_reports').insert({ post_id: id, reason: reason.trim().slice(0, 300) || null });
      if (error && !String(error.message).includes('duplicate')) return say(friendly(error));
      say('Thank you. Think Nest will check this post.');
    }
  });
  gfeed.addEventListener('submit', async e => {
    const f = e.target.closest('.comment-form'); if (!f) return;
    e.preventDefault();
    const id = Number(f.closest('[data-gpost]').dataset.gpost), body = f.c.value.trim(); if (!body) return;
    f.querySelector('button').disabled = true;
    const { error } = await db.from('group_post_comments').insert({ post_id: id, body });
    f.querySelector('button').disabled = false;
    if (error) return say(friendly(error));
    refreshGPost(id);
  });

  // ----- resources
  async function loadRes() {
    const { data, error } = await db.from('group_resources').select('*').eq('group_id', gid).order('created_at', { ascending: false });
    if (error) return say(friendly(error));
    document.getElementById('res').innerHTML = data.length ? data.map(r => `<div class="panel file-row" data-res="${r.id}">
        <span class="file-ic" aria-hidden="true">${r.file_path ? '📄' : '🔗'}</span>
        <div class="file-name"><b>${esc(r.title)}</b><span class="meta">Shared by ${esc(r.author_name || 'a member')} ${gTag(r.author_role)} · ${new Date(r.created_at).toLocaleDateString('en-GB')}</span></div>
        ${r.url ? `<a class="pill pill-soft" href="${esc(r.url)}" target="_blank" rel="noopener">Open link</a>` : ''}
        ${r.file_path ? `<button class="pill pill-soft" data-open="${esc(r.file_path)}">Open file</button>` : ''}
        ${r.author_id === user.id || isOwner || isAdmin ? `<button class="link-btn" data-del-res="${r.id}" data-path="${esc(r.file_path || '')}">Delete</button>` : ''}</div>`).join('')
      : '<div class="empty-box"><p>No resources yet. Share worksheets, notes or useful links here.</p></div>';
  }
  const rf = document.getElementById('res-form');
  rf.addEventListener('submit', async e => {
    e.preventDefault();
    const title = rf.title.value.trim(), url = rf.url.value.trim(), file = rf.file.files[0];
    if (!title) return say('Give the resource a title.');
    if (!url && !file) return say('Add a link or choose a file.');
    let file_path = null;
    if (file) {
      if (file.size > 10 * 1024 * 1024) return say('Files must be smaller than 10 MB.');
      file_path = gid + '/' + Date.now() + '-' + file.name.replace(/[^\w.\- ]+/g, '_');
      const up = await db.storage.from('groups').upload(file_path, file);
      if (up.error) return say(friendly(up.error));
    }
    const { error } = await db.from('group_resources').insert({ group_id: gid, title, url: url || null, file_path });
    if (error) return say(friendly(error));
    rf.reset(); say('Shared with the group.'); loadRes();
  });
  document.getElementById('res').addEventListener('click', async e => {
    const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del-res]');
    if (o) {
      const { data, error } = await db.storage.from('groups').createSignedUrl(o.dataset.open, 600);
      if (error) return say(friendly(error));
      window.open(data.signedUrl, '_blank', 'noopener');
    }
    if (d) {
      if (!confirm('Delete this resource?')) return;
      const { error } = await db.from('group_resources').delete().eq('id', Number(d.dataset.delRes));
      if (error) return say(friendly(error));
      if (d.dataset.path) db.storage.from('groups').remove([d.dataset.path]);
      loadRes();
    }
  });

  // ----- members
  async function loadMembers() {
    const { data } = await db.rpc('group_member_list', { gid });
    members = data || [];
    drawHead();
    if (isClass && typeof leaderboardHtml === 'function') leaderboardHtml(gid, 'Class leaderboard').then(h => { const b = document.getElementById('class-board'); if (b) b.innerHTML = h; });
    document.getElementById('members').innerHTML = members.map(m => `<div class="pending-row">
        <span class="initials">${esc(gIni(m.full_name))}</span>
        <div><b>${esc(m.full_name)}</b> ${m.role === 'teacher' ? gTag('teacher') : ''}<span class="meta">${m.role === 'owner' ? 'Created the group' : m.status === 'invited' ? 'Invited, hasn’t joined yet' : (m.grade || 'Member')}</span></div>
        ${teacherRun && (isOwner || isAdmin) && m.role === 'member' && m.status === 'active' ? `<button class="pill pill-soft" data-star="${m.user_id}" data-name="${esc(m.full_name)}">⭐ Stars</button>` : ''}
        ${(isOwner || isAdmin) && m.role !== 'owner' ? `<button class="link-btn" data-kick="${m.user_id}" data-name="${esc(m.full_name)}">${m.status === 'invited' ? 'Cancel invite' : 'Remove'}</button>` : ''}</div>`).join('');
    document.getElementById('danger').innerHTML = isOwner || isAdmin ? `<button class="pill pill-soft big danger" id="del-group">${isClass ? '🗑️ Delete this class' : 'Delete this group'}</button>` : isMember ? '<button class="pill pill-soft big danger" id="leave">Leave this group</button>' : '';
    if (isOwner) drawInvites();
  }
  async function drawInvites() {
    document.getElementById('invite-box').hidden = false;
    if (teacherRun) {
      const { data: studs } = await db.rpc('my_students');
      const inGroup = new Set(members.map(m => m.user_id)), seen = new Set();
      document.getElementById('invite-box').innerHTML = '<h3>Add students' + (isClass ? ' to this class' : '') + '</h3><div class="approve-list">' + ((studs || []).filter(s => !seen.has(s.id) && seen.add(s.id)).map(s => `<div class="pending-row"><span class="initials">${esc(gIni(s.full_name))}</span><div><b>${esc(s.full_name)}</b><span class="meta">${esc([s.grade, s.course_title].filter(Boolean).join(' · '))}</span></div>
          ${inGroup.has(s.id) ? '<span class="tag">In class</span>' : `<button class="pill pill-live" data-addcls="${s.id}">Add</button>`}</div>`).join('') || '<p class="empty">Students appear here once they join one of your courses.</p>') + '</div>';
      return;
    }
    const { data } = await db.rpc('my_friends');
    const inGroup = new Set(members.map(m => m.user_id));
    const fr = (data || []).filter(f => f.relation === 'friend');
    document.getElementById('inv-friends').innerHTML = fr.length ? fr.map(f => `<div class="pending-row"><span class="initials">${esc(gIni(f.full_name))}</span><div><b>${esc(f.full_name)}</b><span class="meta">${esc(f.grade || '')}</span></div>
        ${inGroup.has(f.id) ? '<span class="tag">In group</span>' : `<button class="pill pill-live" data-invite="${f.id}">Invite</button>`}</div>`).join('')
      : '<p class="empty">Add friends first on <a href="friends.html">My Friends</a>.</p>';
  }
  const ts = document.getElementById('tsearch');
  ts.addEventListener('submit', async e => {
    e.preventDefault();
    if (ts.q.value.trim().length < 2) return say('Type at least 2 letters.');
    const { data, error } = await db.rpc('search_teachers', { q: ts.q.value });
    if (error) return say(friendly(error));
    const inGroup = new Set(members.map(m => m.user_id));
    document.getElementById('inv-teachers').innerHTML = data.length ? data.map(t => `<div class="pending-row"><span class="initials">${esc(gIni(t.full_name))}</span><div><b>${esc(t.full_name)}</b><span class="meta">${esc(t.subject || 'Teacher')}</span></div>
        ${inGroup.has(t.id) ? '<span class="tag">In group</span>' : `<button class="pill pill-live" data-invite="${t.id}">Invite</button>`}</div>`).join('') : '<p class="empty">No teachers found.</p>';
  });
  document.getElementById('t-mem').addEventListener('click', async e => {
    const inv = e.target.closest('[data-invite]'), kick = e.target.closest('[data-kick]'), add = e.target.closest('[data-addcls]'), star = e.target.closest('[data-star]');
    if (star && typeof giveStars === 'function') return giveStars(star.dataset.star, star.dataset.name);
    if (add) {
      add.disabled = true;
      const { error } = await db.rpc('add_to_class', { gid, sid: add.dataset.addcls });
      if (error) { add.disabled = false; return say(friendly(error)); }
      say('Added.'); return loadMembers();
    }
    if (inv) {
      inv.disabled = true;
      const { error } = await db.rpc('invite_to_group', { gid, person: inv.dataset.invite });
      if (error) { inv.disabled = false; return say(friendly(error)); }
      say('Invitation sent.'); inv.outerHTML = '<span class="tag tag-wait">Invited</span>'; loadMembers();
    }
    if (kick) {
      if (!confirm('Remove ' + kick.dataset.name + ' from the group?')) return;
      const { error } = await db.rpc('remove_from_group', { gid, person: kick.dataset.kick });
      if (error) return say(friendly(error)); loadMembers();
    }
    if (e.target.closest('#leave')) {
      if (!confirm('Leave “' + g.name + '”?')) return;
      const { error } = await db.rpc('leave_group', { gid });
      if (error) return say(friendly(error)); location.href = 'groups.html';
    }
    if (e.target.closest('#del-group')) {
      if (!confirm(isClass ? 'Delete the class “' + g.name + '”?\n\nThis removes its community posts, resources, chat and member list for everyone. Students’ accounts are NOT deleted: they can still log in and be added to another class.'
                           : 'Delete “' + g.name + '” for everyone? All its posts and resources will be deleted.')) return;
      const { error } = await db.rpc('delete_group', { gid });
      if (error) return say(friendly(error)); location.href = isClass ? 'classes.html' : 'groups.html';
    }
  });

  loadFeed(); loadRes(); loadMembers();
}

// Dashboard banner for group invitations
async function groupBanner() {
  const box = document.getElementById('group-invites'); if (!box) return;
  const { data } = await db.rpc('my_groups');
  const n = (data || []).filter(g => g.my_status === 'invited').length;
  box.innerHTML = n ? `<a class="panel req-banner" href="groups.html"><span class="req-ic" aria-hidden="true">👥</span><span><b>${n} study group invitation${n === 1 ? '' : 's'}</b> waiting for you</span><span class="pill pill-live">See invitations →</span></a>` : '';
}


// ---------- Teachers: create a class, or a study group for some students ----------
function openTeacherGroupDialog(mode) {
  const cd = document.getElementById('class-dialog'), cf = document.getElementById('class-form');
  const isCls = mode === 'class';
  cd.querySelector('h2').textContent = isCls ? 'Create a class' : 'Create a study group for students';
  cd.querySelector('.note').textContent = isCls ? 'A class is a shared space for you and your students: a feed, resources, group chat and a leaderboard. Students are added straight away.'
    : 'Choose a few students who should work together. They are added straight away, and they can post, chat and share resources in the group.';
  cd.querySelector('.course-pick').firstChild.textContent = isCls ? 'Add everyone from a course ' : 'Pick students from a course (optional) ';
  cf.querySelector('button.btn-red').textContent = isCls ? 'Create class' : 'Create group';
  cf.name.placeholder = isCls ? 'For example, Grade 4 Maths class' : 'For example, Fractions team';
  cf.reset(); cd.showModal();
  (async () => {
    const uid = (await db.auth.getSession()).data.session.user.id;
    const [{ data: courses }, { data: studs }] = await Promise.all([db.from('courses').select('id, title').eq('teacher_id', uid).order('title'), db.rpc('my_students')]);
    cf.course.innerHTML = `<option value="">${isCls ? 'No course (I’ll pick students)' : 'Choose a course to see its students'}</option>` + (courses || []).map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
    const seen = new Set();
    document.getElementById('class-studs').innerHTML = (studs || []).filter(s => !seen.has(s.id) && seen.add(s.id)).map(s => `<label class="remember"><input type="checkbox" name="stud" value="${s.id}" data-course="${s.course_id}"> ${esc(s.full_name || 'Student')} <span class="meta">${esc(s.grade || '')}</span></label>`).join('') || '<p class="meta">Students appear here once they join one of your courses.</p>';
  })();
  cf.course.onchange = () => {
    const c = cf.course.value; if (!c) return;
    if (isCls && !cf.name.value.trim()) cf.name.value = cf.course.options[cf.course.selectedIndex].text + ' class';
    if (isCls) cf.querySelectorAll('input[name=stud]').forEach(x => { if (x.dataset.course === c) x.checked = true; });
    else cf.querySelectorAll('input[name=stud]').forEach(x => x.closest('label').hidden = x.dataset.course !== c);
  };
  cd.querySelector('[data-close]').onclick = () => cd.close();
  cf.onsubmit = async e => {
    e.preventDefault();
    if (cf.name.value.trim().length < 2) return say(isCls ? 'Give the class a name.' : 'Give the group a name.');
    const students = [...cf.querySelectorAll('input[name=stud]:checked')].map(x => x.value);
    if (!isCls && !students.length) return say('Choose at least one student.');
    const res = isCls ? await db.rpc('create_class', { cname: cf.name.value, cdesc: cf.desc.value, cid: cf.course.value ? Number(cf.course.value) : null, students })
                      : await db.rpc('create_teacher_group', { gname: cf.name.value, gdesc: cf.desc.value, students });
    if (res.error) return say(friendly(res.error));
    location.href = 'group.html?id=' + res.data + (isCls ? '&add=1' : '');
  };
}

async function startClasses() {
  const { profile: me } = await initShell();
  swapMenu(me.role);
  if (me.role === 'parent') { location.href = 'parent-dashboard.html'; return; }
  const isTeach = ['teacher', 'school_leader', 'admin'].includes(me.role);
  const btn = document.getElementById('new-class'); btn.hidden = !isTeach;
  btn.addEventListener('click', () => openTeacherGroupDialog('class'));
  if (isTeach && /[?&]new=1/.test(location.search)) setTimeout(() => openTeacherGroupDialog('class'), 300);
  const { data } = await db.rpc('my_groups');
  const cls = (data || []).filter(g => g.kind === 'class' && g.my_status === 'active');
  const box = document.getElementById('class-list');
  if (!cls.length) { box.innerHTML = `<div class="empty-box"><p>${isTeach ? 'You haven’t created a class yet. Create one and add the students from your course in one click.' : 'You’re not in a class yet. Your teacher will add you.'}</p>${isTeach ? '<button class="btn btn-red" onclick="document.getElementById(\'new-class\').click()">+ Create a class</button>' : ''}</div>`; return; }
  const boards = typeof leaderboardHtml === 'function' ? await Promise.all(cls.map(c => leaderboardHtml(c.id, 'Leaderboard'))) : [];
  box.onclick = e => { const a = e.target.closest('[data-att]'); if (a && typeof openAttendanceDialog === 'function') openAttendanceDialog({ gid: Number(a.dataset.att), title: a.dataset.name }); };
  box.innerHTML = cls.map((g, i) => `<article class="panel class-tile">
      <a class="class-top" href="group.html?id=${g.id}"><span class="group-ic cls">${esc(gIni(g.name))}</span><div><b>${esc(g.name)}</b><span class="meta">${g.members} members · ${g.my_role === 'owner' ? 'your class' : 'with ' + esc(g.owner_name || 'your teacher')}</span>${g.description ? `<span class="meta">${esc(g.description)}</span>` : ''}</div></a>
      <div class="class-links"><a class="pill pill-live" href="group.html?id=${g.id}">📣 Feed</a><a class="pill pill-soft" href="group.html?id=${g.id}#t-res">📚 Resources</a><a class="pill pill-soft" href="messages.html?group=${g.id}">💬 Chat</a><a class="pill pill-soft" href="group.html?id=${g.id}#t-mem">${g.my_role === 'owner' ? '👥 Students &amp; ⭐ stars' : '👥 Members'}</a>${g.my_role === 'owner' ? `<button type="button" class="pill pill-soft" data-att="${g.id}" data-name="${esc(g.name)}">📋 Attendance</button>` : ''}</div>
      ${boards[i] || ''}
    </article>`).join('');
}
