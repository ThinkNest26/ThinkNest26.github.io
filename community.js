// ===== Think Nest community =====
// Uses db, say(), friendly(), esc() from app.js (and initShell from student.js on the community page)

const PAGE = 20;
const MAX_PIC_MB = 5;
const iniOf = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
function ago(ts) {
  const s = (Date.now() - new Date(ts)) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return new Date(ts).toLocaleDateString('en-GB');
}
const roleTag = r => r === 'parent' ? '<span class="role-tag parent">Parent</span>' : r === 'teacher' || r === 'school_leader' ? '<span class="role-tag">Teacher</span>' : r === 'admin' ? '<span class="role-tag admin">Think Nest</span>' : '';

const SPACE = (document.body && document.body.dataset.space) || 'community';
const CAFE = { teachers: { title: '☕ Teacher Café', who: ['teacher', 'school_leader', 'admin'], lead: 'Grab a coffee, pull up a chair. A private space just for teachers to swap hacks, share resources, ask the staffroom and celebrate each other.', ph: 'What’s brewing' }, parents: { title: '☕ Parent Café', who: ['parent', 'admin'], lead: 'Pull up a chair! A private space just for parents to swap tips, ask questions, share recommendations and cheer each other on.', ph: 'What’s on your mind' } }[SPACE];
async function startCommunity() {
  const { user, profile: me } = await initShell();
  let SCHOOL = null;
  if (SPACE === 'school' || SPACE === 'staff') {
    const { data: scs } = await db.rpc('my_schools');
    const list = scs || [];
    SCHOOL = list.find(s => SPACE === 'school' ? s.my_role !== 'parent' : !['student', 'parent'].includes(s.my_role)) || null;
    if (!SCHOOL && me.role !== 'admin') { document.querySelector('main').innerHTML = `<div class="empty-box"><p>🔒 ${SPACE === 'staff' ? 'The staff room is only for teachers and leaders of a school.' : 'The school community is only for members of a school on Think Nest.'}</p></div>`; return; }
    if (SCHOOL) {
      const T = SPACE === 'staff' ? ['👩‍🏫 Staff room', `A private space for the teachers and leaders of ${SCHOOL.name}: share ideas, resources, questions and good news.`, 'Share something with your colleagues']
                                  : [`🏫 ${SCHOOL.name} community`, `Only students, teachers and leaders of ${SCHOOL.name} can see this. Ask questions, share ideas and celebrate together.`, 'What’s on your mind'];
      document.title = T[0].replace(/^\S+\s/, '') + ' – Think Nest';
      const h1 = document.querySelector('.comm-hero h1'); if (h1) h1.textContent = T[0];
      const p = document.querySelector('.comm-hero-text p:not(.meta)'); if (p) p.textContent = T[1];
      const pb = document.getElementById('post-body'); if (pb) pb.dataset.ph = T[2];
      if (SPACE === 'staff') document.querySelectorAll('.comm-tabs').forEach(x => x.hidden = true);
    }
  }
  if (CAFE && !(CAFE.who.includes(me.role) || (SPACE === 'parents' && me.also_parent))) { document.querySelector('main').innerHTML = `<div class="empty-box"><p>${CAFE.title} is a private space for ${SPACE}.</p><a class="btn btn-red" href="community.html">Go to the Community</a></div>`; return; }
  if (CAFE && me.role !== 'admin') {
    const { data: ok } = await db.rpc('is_hub_member', { h: SPACE });
    if (!ok) { const hubPage = SPACE === 'teachers' ? 'teacher-hub.html' : 'parent-hub.html', hubName = SPACE === 'teachers' ? 'Beyond the Bell' : 'Beyond the School Run';
      document.querySelector('main').innerHTML = `<div class="empty-box"><p>🔒 ${CAFE.title} is for members of <b>${hubName}</b>. Ask to join the hub, and you’ll get in as soon as Think Nest approves your request.</p><a class="btn btn-red" href="${hubPage}">Go to ${hubName}</a></div>`; return; }
  }
  if (CAFE) { document.title = CAFE.title.replace('☕ ', '') + ' – Think Nest'; const h1 = document.querySelector('.comm-hero h1'); if (h1) h1.textContent = CAFE.title; const p = document.querySelector('.comm-hero-text p:not(.meta)'); if (p) p.textContent = CAFE.lead; document.querySelectorAll('.comm-tabs, #side-groups, #side-board').forEach(x => x.hidden = true); const r = document.querySelector('.comm-rules'); if (r) r.innerHTML = '🔒 Only ' + SPACE + ' can see this café. Be kind, keep it friendly, and use <b>Report</b> if something isn’t right.'; }
  const isAdmin = me.role === 'admin';
  // Teachers and the admin get their own menu
  if (window.buildNav) window.buildNav(me.role);
  else if (['teacher', 'school_leader', 'admin'].includes(me.role)) {
    document.querySelector('.side nav').innerHTML = `<h5 class="first">Teacher</h5><ul>
      ${isAdmin ? '<li><a href="admin.html"><span>Approvals</span></a></li>' : ''}
      <li><a href="teacher-dashboard.html"><span>Dashboard</span></a></li><li><a href="teacher-courses.html"><span>My Courses</span></a></li>
      <li><a href="teacher-calendar.html"><span>Live Classes</span></a></li><li><a href="teacher-objectives.html"><span>Objectives &amp; Activities</span></a></li><li><a href="teacher-requests.html"><span>Session Requests</span></a></li><li><a href="classes.html"><span>My Classes</span></a></li><li><a href="teacher-attendance.html"><span>Attendance</span></a></li><li><a href="groups.html"><span>Study Groups</span></a></li><li><a href="messages.html"><span>Messages</span></a></li>
      <li><a href="community.html" class="active" aria-current="page"><span>Community</span></a></li><li><a href="teacher-settings.html"><span>Account Settings</span></a></li></ul>
      <h5>Others</h5><ul><li><a href="#" id="logout"><span>Log out</span></a></li></ul>`;
    (document.getElementById('logout') || document.createElement('a')).addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  }
  if (!window.buildNav && me.role === 'parent') {
    document.querySelector('.side nav').innerHTML = `<h5 class="first">Parent</h5><ul>
      <li><a href="parent-dashboard.html"><span>My children</span></a></li><li><a href="add-child.html"><span>Add a child</span></a></li>
      <li><a href="community.html" class="active" aria-current="page"><span>Community</span></a></li><li><a href="parent-settings.html"><span>Account Settings</span></a></li></ul>
      <h5>Others</h5><ul><li><a href="#" id="logout"><span>Log out</span></a></li></ul>`;
    (document.getElementById('logout') || document.createElement('a')).addEventListener('click', async e => { e.preventDefault(); await db.auth.signOut(); location.href = 'index.html'; });
  }
  const first = (me.full_name || '').split(' ')[0];
  document.getElementById('me-ini').textContent = iniOf(me.full_name || user.email);
  document.getElementById('me-ini').dataset.av = user.id;
  document.getElementById('post-body').placeholder = CAFE ? CAFE.ph + (first ? ', ' + first : '') + '…' : 'What’s on your mind' + (first ? ', ' + first : '') + '?';

  // ----- welcome banner, rewards and tabs
  const hour = new Date().getHours();
  document.getElementById('hero-hello').textContent = (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening') + (first ? ', ' + first : '') + ' 👋';
  window.refreshHeroRewards = async () => {
    if (me.role !== 'student' || typeof getRewards !== 'function') return;
    const s = await getRewards(); if (!s) return;
    document.getElementById('hero-rw').innerHTML = `<div class="hero-rw"><span class="rw-ic">${s.level.icon}</span><div><b>${esc(s.level.name)}</b><span>${s.total} Nest Points${s.streak ? ' · 🔥 ' + s.streak : ''}</span></div></div>`;
    const sr = document.getElementById('side-rw'); sr.hidden = false; sr.innerHTML = '<h3>My rewards</h3>' + rewardMiniHtml(s);
  };
  refreshHeroRewards();
  const { data: myGroups } = await db.rpc('my_groups');
  const active = (myGroups || []).filter(g => g.my_status === 'active');
  const studyGroups = active.filter(g => g.kind !== 'class'), classes = active.filter(g => g.kind === 'class');
  const gIc = g => (g.name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  document.getElementById('side-groups').innerHTML = `<h3>My groups &amp; classes</h3>${active.length ? active.map(g => `<a class="side-group" href="group.html?id=${g.id}"><span class="g-ic ${g.kind === 'class' ? 'cls' : ''}">${esc(gIc(g))}</span><span><b>${esc(g.name)}</b><span class="meta">${g.kind === 'class' ? '🏫 Class · ' : '👥 '}${g.members} members</span></span></a>`).join('') : '<p class="meta">You’re not in any groups yet.</p>'}
    <a class="rw-link" href="groups.html">${me.role === 'student' ? '+ Create or join a study group' : 'Open Study Groups →'}</a>`;
  if (classes.length && typeof leaderboardHtml === 'function') {
    const lb = await leaderboardHtml(classes[0].id, classes[0].name);
    if (lb) { const sb = document.getElementById('side-board'); sb.hidden = false; sb.innerHTML = lb; }
  }
  async function groupTab(list, boxId, emptyMsg) {
    const box = document.getElementById(boxId);
    if (!list.length) { box.innerHTML = `<div class="empty-box"><p>${emptyMsg}</p><a class="btn btn-red" href="groups.html">Go to Study Groups</a></div>`; return; }
    const { data: gp } = await db.from('group_posts').select('id, group_id, author_name, author_role, body, created_at').in('group_id', list.map(g => g.id)).order('created_at', { ascending: false }).limit(25);
    const name = id => (list.find(g => g.id === id) || {}).name || '';
    box.innerHTML = `<div class="group-tiles">${list.map(g => `<a class="panel group-tile" href="group.html?id=${g.id}"><span class="g-ic big ${g.kind === 'class' ? 'cls' : ''}">${esc(gIc(g))}</span><b>${esc(g.name)}</b><span class="meta">${g.members} members${g.kind === 'class' ? ' · with ' + esc(g.owner_name || 'your teacher') : ''}</span><span class="tile-go">Open →</span></a>`).join('')}</div>
      <h3 class="dash-h">Latest from your ${boxId === 'ct-classes' ? 'classes' : 'groups'}</h3>` +
      ((gp || []).length ? gp.map(p => `<a class="panel post gp-post" href="group.html?id=${p.group_id}"><span class="pt-badge">${esc(name(p.group_id))}</span><header class="post-head"><span class="initials">${esc((p.author_name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span><div><b>${esc(p.author_name || 'Member')}</b> ${roleTag(p.author_role)}<span class="meta">${ago(p.created_at)}</span></div></header><p class="post-body">${esc(p.body.slice(0, 280))}${p.body.length > 280 ? '…' : ''}</p></a>`).join('') : '<p class="empty">No posts yet. Open a group to start the conversation.</p>');
  }
  document.querySelector('.comm-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-ctab]'); if (!b) return;
    document.querySelectorAll('[data-ctab]').forEach(x => x.setAttribute('aria-selected', x === b));
    ['everyone', 'groups', 'classes'].forEach(t => document.getElementById('ct-' + t).hidden = t !== b.dataset.ctab);
    if (b.dataset.ctab === 'groups') groupTab(studyGroups, 'ct-groups', me.role === 'student' ? 'You’re not in a study group yet. Create one and invite your friends!' : 'No study groups yet.');
    if (b.dataset.ctab === 'classes') groupTab(classes, 'ct-classes', ['teacher', 'school_leader', 'admin'].includes(me.role) ? 'You haven’t made a class yet. Create one on the My Classes page.' : 'You’re not in a class yet. Your teacher will add you.');
  });

  const feed = document.getElementById('feed'), more = document.getElementById('more');
  let posts = [], oldest = null;
  const signed = {};

  async function picUrls(list) {
    const paths = list.map(p => p.image_path).filter(p => p && !signed[p]);
    if (!paths.length) return;
    const { data } = await db.storage.from('community').createSignedUrls(paths, 3600);
    (data || []).forEach(d => { if (d.signedUrl) signed[d.path] = d.signedUrl; });
  }

  function postHtml(p) {
    const likes = p.post_likes || [], comments = (p.post_comments || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const liked = likes.some(l => l.user_id === user.id);
    const mine = p.author_id === user.id;
    const isMod = ['teacher', 'school_leader', 'admin'].includes(me.role);
    const st = p.status || 'published';
    const banner = st === 'pending'
      ? (isMod && !mine ? `<div class="mod-bar"><span>⏳ Waiting for approval</span><span class="mod-actions"><button class="pill pill-live" data-approve>Approve</button><button class="pill pill-soft danger" data-reject>Don’t approve</button></span></div>`
                        : '<div class="mod-bar"><span>⏳ Waiting for a teacher to approve. Only you and teachers can see it for now.</span></div>')
      : st === 'rejected' ? '<div class="mod-bar rejected"><span>This post wasn’t approved, so only you can see it. You can delete it.</span></div>' : '';
    const PAR = SPACE === 'parents';
    const PT = { question: ['❓', PAR ? 'Ask other parents' : CAFE ? 'Ask the staffroom' : 'Question'], idea: ['💡', 'Idea'], celebrate: ['🎉', PAR ? 'Family win' : CAFE ? 'Win of the week' : 'Celebration'], showcase: ['🏆', 'Showing my work'],
      hack: ['💡', PAR ? 'Parent tip' : 'Teaching hack'], resource: ['📚', PAR ? 'Recommendation' : 'Resource'], help: ['🆘', PAR ? 'Need advice' : 'Need help'], funny: ['😂', PAR ? 'Parent life' : 'Teacher life'], shoutout: ['🙌', 'Shout-out'], poll: ['📊', 'Poll'] }[p.post_type];
    return `<article class="panel post ${st !== 'published' ? 'post-' + st : ''} ${p.post_type && p.post_type !== 'post' ? 'pt-' + p.post_type : ''}" data-post="${p.id}" id="post-${p.id}">${banner}${PT ? `<span class="pt-badge">${PT[0]} ${PT[1]}</span>` : ''}
      <header class="post-head"><span class="initials" data-av="${p.author_id}">${esc(iniOf(p.author_name))}</span>
        <div><b>${esc(p.author_name || 'Member')}</b> ${roleTag(p.author_role)}<span class="meta">${ago(p.created_at)}</span></div>
        <div class="post-menu">${mine || isAdmin ? `<button class="link-btn" data-del-post>Delete</button>` : ''}${!mine ? `<button class="link-btn" data-report>Report</button>` : ''}</div></header>
      <p class="post-body">${esc(p.body).replace(/\n/g, '<br>')}</p>
      ${p.image_path && signed[p.image_path] ? `<img class="post-img" src="${signed[p.image_path]}" alt="Picture shared by ${esc(p.author_name || 'a member')}">` : ''}
      <div class="post-actions">
        <button class="act ${liked ? 'on' : ''}" data-like aria-pressed="${liked}">👍 Like${likes.length ? ' · ' + likes.length : ''}</button>
        <button class="act" data-show-comments>💬 Comment${comments.length ? ' · ' + comments.length : ''}</button>
      </div>
      <div class="comments" ${comments.length ? '' : 'hidden'}>
        ${comments.map(c => `<div class="comment" data-comment="${c.id}"><span class="initials" data-av="${c.author_id}">${esc(iniOf(c.author_name))}</span>
          <div class="bubble"><b>${esc(c.author_name || 'Member')}</b> ${roleTag(c.author_role)}<p>${esc(c.body)}</p><span class="meta">${ago(c.created_at)}${c.author_id === user.id || isAdmin ? ' · <button class="link-btn" data-del-comment>Delete</button>' : ''}</span></div></div>`).join('')}
        <form class="comment-form"><label class="grow"><span class="sr">Write a comment</span><input type="text" name="c" maxlength="1000" placeholder="Write a comment…"></label><button class="pill pill-live">Send</button></form>
      </div>
    </article>`;
  }
  let filter = '';
  const render = () => { const shown = filter ? posts.filter(p => p.post_type === filter) : posts; feed.innerHTML = shown.length ? shown.map(postHtml).join('') : `<div class="empty-box"><p>${filter ? 'No posts like this yet. Be the first!' : 'No posts yet. Be the first to say hello! 👋'}</p></div>`; };
  document.getElementById('feed-filter').addEventListener('click', e => { const b = e.target.closest('[data-ff]'); if (!b) return; filter = b.dataset.ff; document.querySelectorAll('[data-ff]').forEach(x => x.classList.toggle('on', x === b)); render(); });

  async function load(older) {
    let q = db.from('posts').select('*, post_likes(user_id), post_comments(id, author_id, author_name, author_role, body, created_at)').eq('space', SPACE).or('status.eq.published,author_id.eq.' + user.id).order('created_at', { ascending: false }).limit(PAGE);
    if (SCHOOL) q = q.eq('school_id', SCHOOL.id);
    if (older && oldest) q = q.lt('created_at', oldest);
    const { data, error } = await q;
    if (error) return say(friendly(error));
    await picUrls(data);
    posts = older ? posts.concat(data) : data;
    if (posts.length) oldest = posts[posts.length - 1].created_at;
    more.hidden = data.length < PAGE;
    render();
    if (!older) { sideLists(); loadPending(); }
  }

  // Teachers and the admin: posts waiting for approval
  async function loadPending() {
    const box = document.getElementById('pending');
    if (!box || SPACE !== 'community' || !['teacher', 'school_leader', 'admin'].includes(me.role)) return;
    const { data } = await db.from('posts').select('*, post_likes(user_id), post_comments(id, author_id, author_name, author_role, body, created_at)').eq('space', 'community').eq('status', 'pending').neq('author_id', user.id).order('created_at');
    const list = data || [];
    await picUrls(list);
    const asked = location.hash === '#pending';
    box.hidden = !list.length && !asked;
    box.innerHTML = list.length ? `<h2 class="dash-h">Waiting for approval <span class="count">${list.length}</span></h2><p class="hint">Student posts appear in the community after a teacher approves them. Use <b>Approve</b> or <b>Don’t approve</b> on each post.</p>` + list.map(postHtml).join('')
      : asked ? '<h2 class="dash-h">Waiting for approval</h2><p class="hint">Nothing is waiting now. Another teacher may already have approved it. 🎉</p>' : '';
    if (asked) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.addEventListener('hashchange', () => { if (location.hash === '#pending') loadPending(); });
  document.getElementById('pending').addEventListener('click', async e => {
    const art = e.target.closest('[data-post]'); if (!art) return;
    const ok = !!e.target.closest('[data-approve]'), no = !!e.target.closest('[data-reject]');
    if (!ok && !no) return;
    if (no && !confirm('Don’t approve this post? The student will be told it wasn’t approved.')) return;
    const { error } = await db.rpc('moderate_post', { pid: Number(art.dataset.post), ok });
    if (error) return say(friendly(error));
    say(ok ? 'Approved. It’s now in the community.' : 'Not approved. The student has been told.');
    load(false);
  });
  async function refreshOne(id) {
    const { data } = await db.from('posts').select('*, post_likes(user_id), post_comments(id, author_id, author_name, author_role, body, created_at)').eq('id', id).maybeSingle();
    const i = posts.findIndex(p => p.id === id);
    if (data && i > -1) { posts[i] = data; const el = feed.querySelector(`[data-post="${id}"]`); const open = el && !el.querySelector('.comments').hidden; if (el) { el.outerHTML = postHtml(data); if (open) feed.querySelector(`[data-post="${id}"] .comments`).hidden = false; } }
  }
  function sideLists() {
    const seen = new Map();
    posts.forEach(p => { if (!seen.has(p.author_id)) seen.set(p.author_id, p); });
    document.getElementById('active').innerHTML = [...seen.values()].slice(0, 6).map(p => `<div class="side-row"><span class="initials" data-av="${p.author_id}">${esc(iniOf(p.author_name))}</span><span>${esc(p.author_name || 'Member')} ${roleTag(p.author_role)}</span></div>`).join('') || '<p class="empty">No one yet.</p>';
    document.getElementById('recent').innerHTML = posts.slice(0, 6).map(p => `<a class="side-row" href="#" data-jump="${p.id}"><span class="recent-text">${esc(p.body.slice(0, 70))}${p.body.length > 70 ? '…' : ''}</span><span class="meta">${ago(p.created_at)}</span></a>`).join('') || '<p class="empty">No posts yet.</p>';
  }
  document.getElementById('recent').addEventListener('click', e => {
    const a = e.target.closest('[data-jump]'); if (!a) return; e.preventDefault();
    const el = feed.querySelector(`[data-post="${a.dataset.jump}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // New post
  const form = document.getElementById('composer'), picName = document.getElementById('pic-name');
  form.pic.addEventListener('change', () => {
    const f = form.pic.files[0];
    if (f && f.size > MAX_PIC_MB * 1024 * 1024) { form.pic.value = ''; picName.textContent = ''; return say('Pictures must be smaller than ' + MAX_PIC_MB + ' MB.'); }
    picName.textContent = f ? f.name + ' ✕' : '';
  });
  picName.addEventListener('click', () => { form.pic.value = ''; picName.textContent = ''; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const body = form.body.value.trim();
    if (!body) return say('Write something before posting.');
    const btn = document.getElementById('post-btn'); btn.disabled = true; btn.textContent = 'Posting…';
    let image_path = null;
    const f = form.pic.files[0];
    if (f) {
      image_path = user.id + '/' + Date.now() + '-' + f.name.replace(/[^\w.\-]+/g, '_');
      const up = await db.storage.from('community').upload(image_path, f);
      if (up.error) { btn.disabled = false; btn.textContent = 'Post'; return say(friendly(up.error)); }
    }
    const ptype = (form.querySelector('input[name=ptype]:checked') || {}).value || 'post';
    const extra = typeof cafeExtra === 'function' ? cafeExtra(ptype) : {};
    if (extra && extra.error) { btn.disabled = false; btn.textContent = 'Post'; return say(extra.error); }
    if (await tnBlocked(body, SPACE === 'community' ? 'community post' : SPACE === 'school' ? 'school community post' : SPACE === 'staff' ? 'staff room post' : 'café post', null)) { if (typeof btn !== 'undefined' && btn) { btn.disabled = false; btn.textContent = 'Post'; } return; }
    let { data: np, error } = await db.from('posts').insert(Object.assign({ body, image_path, post_type: ptype, space: SPACE }, SCHOOL ? { school_id: SCHOOL.id } : {}, extra || {})).select('status').single();
    if (error && SPACE === 'community' && String(error.message).includes('column')) ({ data: np, error } = await db.from('posts').insert({ body, image_path }).select('status').single());
    btn.disabled = false; btn.textContent = 'Post';
    if (error) return say(friendly(error));
    form.reset(); picName.textContent = ''; if (typeof cafeReset === 'function') cafeReset(); if (typeof refreshHeroRewards === 'function') setTimeout(refreshHeroRewards, 800);
    say(np && np.status === 'pending' ? 'Sent! A teacher will check your post before everyone can see it.' : 'Posted!');
    load(false);
  });
  more.addEventListener('click', () => load(true));

  // Likes, comments, delete, report
  feed.addEventListener('click', async e => {
    const art = e.target.closest('[data-post]'); if (!art) return;
    const id = Number(art.dataset.post), p = posts.find(x => x.id === id);
    if (e.target.closest('[data-like]')) {
      const liked = (p.post_likes || []).some(l => l.user_id === user.id);
      const res = liked ? await db.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id) : await db.from('post_likes').insert({ post_id: id });
      if (res.error) return say(friendly(res.error));
      return refreshOne(id);
    }
    if (e.target.closest('[data-show-comments]')) { const c = art.querySelector('.comments'); c.hidden = !c.hidden; if (!c.hidden) c.querySelector('input').focus(); return; }
    if (e.target.closest('[data-del-post]')) {
      if (!confirm('Delete this post?')) return;
      const { error } = await db.from('posts').delete().eq('id', id);
      if (error) return say(friendly(error));
      if (p.image_path) db.storage.from('community').remove([p.image_path]);
      posts = posts.filter(x => x.id !== id); render(); sideLists(); return say('Post deleted.');
    }
    if (e.target.closest('[data-del-comment]')) {
      const cid = Number(e.target.closest('[data-comment]').dataset.comment);
      if (!confirm('Delete this comment?')) return;
      const { error } = await db.from('post_comments').delete().eq('id', cid);
      if (error) return say(friendly(error));
      return refreshOne(id);
    }
    if (e.target.closest('[data-report]')) {
      const reason = prompt('Why are you reporting this post? (for example: unkind, private information, not appropriate)');
      if (reason === null) return;
      const { error } = await db.from('post_reports').insert({ post_id: id, reason: reason.trim().slice(0, 300) || null });
      if (error && !String(error.message).includes('duplicate')) return say(friendly(error));
      return say('Thank you. Think Nest will check this post.');
    }
  });
  feed.addEventListener('submit', async e => {
    const f = e.target.closest('.comment-form'); if (!f) return;
    e.preventDefault();
    const id = Number(f.closest('[data-post]').dataset.post), body = f.c.value.trim();
    if (!body) return;
    f.querySelector('button').disabled = true;
    if (await tnBlocked(body, 'comment', null)) return;
    const { error } = await db.from('post_comments').insert({ post_id: id, body });
    f.querySelector('button').disabled = false;
    if (error) return say(friendly(error));
    refreshOne(id);
  });

  load(false).then(() => { const m = location.hash.match(/^#post-(\d+)$/); if (m) { const el = document.getElementById('post-' + m[1]); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); } } });
}

// ---------- Admin: reported posts (on the Approvals page) ----------
async function loadReports() {
  const box = document.getElementById('reports'); if (!box) return;
  const { data, error } = await db.from('post_reports').select('id, reason, created_at, post_id, posts(id, body, author_name, image_path)').order('created_at', { ascending: false });
  if (error) { box.innerHTML = ''; return; }
  const rows = (data || []).filter(r => r.posts);
  document.getElementById('n-reports').textContent = rows.length;
  box.innerHTML = rows.length ? rows.map(r => `<article class="panel person" data-rep="${r.id}" data-post="${r.post_id}">
      <div class="person-info"><h4>Post by ${esc(r.posts.author_name || 'a member')}</h4>
        <span class="meta bio">“${esc(r.posts.body.slice(0, 200))}${r.posts.body.length > 200 ? '…' : ''}”</span>
        <span class="meta">Reason: ${esc(r.reason || 'not given')} · ${new Date(r.created_at).toLocaleDateString('en-GB')}</span></div>
      <div class="person-actions"><a class="pill pill-soft" href="community.html">View</a><button class="pill pill-soft danger" data-remove>Remove post</button><button class="pill pill-soft" data-keep>Keep</button></div></article>`).join('')
    : '<p class="empty">No reported posts. 🎉</p>';
  box.onclick = async e => {
    const row = e.target.closest('[data-rep]'); if (!row) return;
    if (e.target.closest('[data-remove]')) {
      if (!confirm('Remove this post from the community?')) return;
      const { error: er } = await db.from('posts').delete().eq('id', Number(row.dataset.post));
      if (er) return say(friendly(er));
      say('Post removed.'); loadReports();
    }
    if (e.target.closest('[data-keep]')) {
      const { error: er } = await db.from('post_reports').delete().eq('post_id', Number(row.dataset.post));
      if (er) return say(friendly(er));
      say('Report cleared.'); loadReports();
    }
  };
}

// Reported posts inside study groups (also on the Approvals page)
async function loadGroupReports() {
  const box = document.getElementById('reports'); if (!box) return;
  const { data } = await db.from('group_reports').select('id, reason, created_at, post_id, group_posts(id, body, author_name, group_id)').order('created_at', { ascending: false });
  const rows = (data || []).filter(r => r.group_posts);
  if (!rows.length) return;
  const n = document.getElementById('n-reports'); n.textContent = Number(n.textContent || 0) + rows.length;
  if (box.querySelector('.empty')) box.innerHTML = '';
  box.insertAdjacentHTML('beforeend', rows.map(r => `<article class="panel person" data-grep="${r.post_id}">
      <div class="person-info"><h4>Study group post by ${esc(r.group_posts.author_name || 'a member')}</h4>
        <span class="meta bio">“${esc(r.group_posts.body.slice(0, 200))}${r.group_posts.body.length > 200 ? '…' : ''}”</span>
        <span class="meta">Reason: ${esc(r.reason || 'not given')} · ${new Date(r.created_at).toLocaleDateString('en-GB')}</span></div>
      <div class="person-actions"><a class="pill pill-soft" href="group.html?id=${r.group_posts.group_id}">View group</a><button class="pill pill-soft danger" data-gremove>Remove post</button><button class="pill pill-soft" data-gkeep>Keep</button></div></article>`).join(''));
  box.addEventListener('click', async e => {
    const row = e.target.closest('[data-grep]'); if (!row) return;
    const pid = Number(row.dataset.grep);
    if (e.target.closest('[data-gremove]')) { if (!confirm('Remove this post?')) return; const { error } = await db.from('group_posts').delete().eq('id', pid); if (error) return say(friendly(error)); row.remove(); say('Post removed.'); }
    if (e.target.closest('[data-gkeep]')) { const { error } = await db.from('group_reports').delete().eq('post_id', pid); if (error) return say(friendly(error)); row.remove(); say('Report cleared.'); }
  });
}


// ---------- Admin: switch teacher approval on/off ----------
async function loadApprovalSetting() {
  const box = document.getElementById('approval-setting'); if (!box) return;
  box.innerHTML = `<p><b>🛡️ Automatic safety filter is on.</b> Posts and comments appear straight away. Anything with swear words, insults, bullying or sexual words (English or Arabic) is blocked automatically, and the student’s teacher is told.</p>`;
  loadBlockedPosts();
}
async function loadBlockedPosts() {
  const host = document.getElementById('approval-setting'); if (!host || document.getElementById('blocked-box')) return;
  host.insertAdjacentHTML('afterend', '<h2 class="dash-h">🛡️ Blocked posts</h2><p class="hint">Posts and comments the filter stopped. They were never shown to anyone.</p><section class="approve-list" id="blocked-box"><p class="empty">Loading…</p></section>');
  const { data, error } = await db.from('moderation_log').select('*').order('created_at', { ascending: false }).limit(30);
  const box = document.getElementById('blocked-box');
  if (error) { box.innerHTML = '<p class="empty">Run database update 54 to see blocked posts.</p>'; return; }
  box.innerHTML = (data || []).length ? data.map(r => `<article class="panel person"><span class="initials">🛡️</span><div class="person-info"><h4>${esc(r.user_name || 'Someone')}</h4>
      <span class="meta">${esc(r.place || 'post')} · ${new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
      <p class="blocked-text">${esc(r.body)}</p></div></article>`).join('') : '<p class="empty">Nothing blocked. 🎉</p>';
}

// ---------- Admin: waiting lists for subject paths ----------
async function loadWaitlists() {
  const box = document.getElementById('waitlist-box'); if (!box) return;
  const { data, error } = await db.rpc('waitlist_summary');
  if (error) { box.innerHTML = '<p class="empty">Run database update 17 to see waiting lists.</p>'; return; }
  const cur = { british: 'British', ib: 'IB', american: 'American', arabic_a: 'Arabic A', arabic_b: 'Arabic B' };
  box.innerHTML = (data || []).length ? `<table class="wait-table"><thead><tr><th>Subject</th><th>Curriculum</th><th>Grade</th><th>Waiting</th><th>Latest</th></tr></thead><tbody>${data.map(w => `<tr><td>${esc(w.subject.charAt(0).toUpperCase() + w.subject.slice(1))}</td><td>${esc(cur[w.curriculum] || w.curriculum)}</td><td>${esc(w.grade)}</td><td><b>${w.waiting}</b></td><td>${new Date(w.newest).toLocaleDateString('en-GB')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="empty">No one is waiting at the moment.</p>';
}

// ---------- Admin: requests to join the Teacher Hub and Parent Hub ----------
async function loadHubRequests() {
  const box = document.getElementById('hubreq-box'); if (!box) return;
  const { data, error } = await db.rpc('hub_requests');
  if (error) { box.innerHTML = '<p class="empty">Run database update 28 to see hub requests.</p>'; return; }
  const names = { teachers: '🔔 Beyond the Bell (teachers)', parents: '🚗 Beyond the School Run (parents)' };
  const pending = (data || []).filter(r => r.status === 'pending'), done = (data || []).filter(r => r.status !== 'pending').slice(0, 20);
  document.getElementById('n-hubreq').textContent = pending.length;
  box.innerHTML = (pending.length ? pending.map(r => `<article class="panel person" data-hu="${r.user_id}" data-hh="${r.hub}">
      <span class="initials">${esc((r.full_name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
      <div class="person-info"><h4>${esc(r.full_name || 'Someone')}</h4><span class="meta">${esc(r.email || '')} · ${esc(r.role)}</span><span class="meta">Wants to join ${names[r.hub]} · ${new Date(r.requested_at).toLocaleDateString('en-GB')}</span></div>
      <div class="person-actions"><button class="pill pill-live" data-hok>Approve</button><button class="pill pill-soft danger" data-hno>Decline</button></div></article>`).join('') : '<p class="empty">No requests waiting. 🎉</p>') +
    (done.length ? `<details class="hubreq-done"><summary>Recent decisions (${done.length})</summary>${done.map(r => `<div class="pending-row"><b>${esc(r.full_name || '')}</b><span class="meta">${names[r.hub]} · ${r.status === 'approved' ? '✅ Approved' : '❌ Declined'}</span>${r.status === 'approved' ? `<button class="link-btn" data-hrevoke data-hu="${r.user_id}" data-hh="${r.hub}">Remove access</button>` : `<button class="link-btn" data-hre data-hu="${r.user_id}" data-hh="${r.hub}">Approve now</button>`}</div>`).join('')}</details>` : '');
  box.onclick = async e => {
    const row = e.target.closest('[data-hu]'); if (!row) return;
    const ok = !!(e.target.closest('[data-hok]') || e.target.closest('[data-hre]')), no = !!(e.target.closest('[data-hno]') || e.target.closest('[data-hrevoke]'));
    if (!ok && !no) return;
    if (no && !confirm(e.target.closest('[data-hrevoke]') ? 'Remove this person’s access to the hub?' : 'Decline this request?')) return;
    const { error: er } = await db.rpc('decide_hub', { uid: row.dataset.hu, h: row.dataset.hh, ok });
    if (er) return say(friendly(er));
    say(ok ? 'Approved. They’ve been told. 🎉' : 'Done. They’ve been told.'); loadHubRequests();
  };
}

// ---------- Admin: new accounts waiting for approval ----------
async function loadNewAccounts() {
  const box = document.getElementById('newacc-box'); if (!box) return;
  const { data, error } = await db.rpc('pending_accounts');
  if (error) { box.innerHTML = '<p class="empty">Run database update 31 to see new accounts.</p>'; return; }
  const rows = (data || []).filter(r => !(r.requested_role === 'teacher' && r.role !== 'teacher'));
  const pending = rows.filter(r => r.account_status === 'pending'), declined = rows.filter(r => r.account_status === 'declined');
  document.getElementById('n-newacc').textContent = pending.length;
  const label = r => ({ student: '🎒 Student', parent: '👪 Parent', teacher: '👩‍🏫 Teacher', school_leader: '🏫 School leader' }[r.role] || r.role);
  const card = r => `<article class="panel person" data-acc="${r.id}">
      <span class="initials">${esc((r.full_name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
      <div class="person-info"><h4>${esc(r.full_name || 'No name')} <span class="tag">${label(r)}</span></h4><span class="meta">${esc(r.email || '')}${r.created_at ? ' · signed up ' + new Date(r.created_at).toLocaleDateString('en-GB') : ''}</span>
        <span class="meta">${esc([r.grade, r.curriculum, r.school, r.country].filter(Boolean).join(' · '))}</span>
        ${r.parent_name || r.parent_email ? `<span class="meta">Parent: ${esc([r.parent_name, r.parent_email].filter(Boolean).join(' · '))}</span>` : ''}${r.role === 'student' ? '<span class="meta pc-status" data-pc="' + r.id + '"></span>' : ''}</div>
      <div class="person-actions"><button class="pill pill-live" data-accok>Approve</button>${r.account_status === 'pending' ? '<button class="pill pill-soft danger" data-accno>Decline</button>' : ''}</div></article>`;
  box.innerHTML = (pending.length ? pending.map(card).join('') : '<p class="empty">No new accounts waiting. 🎉</p>') +
    (declined.length ? `<details class="hubreq-done"><summary>Declined (${declined.length})</summary>${declined.map(card).join('')}</details>` : '');
  // has the parent confirmed by email?
  try {
    const sids = rows.filter(r => r.role === 'student').map(r => r.id);
    if (sids.length) {
      const { data: pcs } = await db.from('parent_consents').select('student_id, status, sent_to').in('student_id', sids);
      (pcs || []).forEach(p => { const el = box.querySelector(`[data-pc="${p.student_id}"]`); if (el) el.innerHTML = p.status === 'confirmed' ? '✅ <b>Parent confirmed by email</b>' : p.status === 'declined' ? '❌ <b>Parent said this wasn’t them. Don’t approve.</b>' : '⏳ Waiting for the parent to confirm (email sent to ' + esc(p.sent_to || '') + ')'; });
    }
  } catch (_) {}
  box.querySelectorAll('[data-accok]').forEach(b => b.addEventListener('click', e => {
    const st = b.closest('[data-acc]').querySelector('.pc-status');
    if (st && /Waiting|wasn’t them/.test(st.textContent) && !confirm('The parent hasn’t confirmed this account by email yet. Approve it anyway?')) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true));
  rows.filter(r => r.role === 'student').forEach(async r => {
    const { data: by } = await db.rpc('registered_by', { kid: r.id });
    const el = box.querySelector(`[data-acc="${r.id}"] .person-info`);
    if (typeof by === 'string' && by && el) el.insertAdjacentHTML('beforeend', `<span class="meta">👪 Registered by parent: <b>${esc(by)}</b></span>`);
  });
  box.onclick = async e => {
    const row = e.target.closest('[data-acc]'); if (!row) return;
    const ok = !!e.target.closest('[data-accok]'), no = !!e.target.closest('[data-accno]');
    if (!ok && !no) return;
    if (no && !confirm('Decline this account? They won’t be able to use Think Nest.')) return;
    const { error: er } = await db.rpc('decide_account', { uid: row.dataset.acc, ok });
    if (er) return say(friendly(er));
    say(ok ? 'Approved! They can log in now. 🎉' : 'Declined.'); loadNewAccounts();
  };
}

// ---------- Admin: messages sent through the Contact form ----------
async function loadContactMessages() {
  const box = document.getElementById('msgs-box'); if (!box) return;
  const { data, error } = await db.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) { box.innerHTML = '<p class="empty">Run database update 35 to see website messages.</p>'; return; }
  const open = (data || []).filter(m => !m.handled), done = (data || []).filter(m => m.handled).slice(0, 20);
  document.getElementById('n-contact').textContent = open.length;
  const card = m => `<article class="panel msg-card ${m.handled ? 'done' : ''}" data-mid="${m.id}">
      <header><b>${esc(m.name)}</b> <span class="tag">${esc(m.who || '')}</span><span class="meta">${new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span></header>
      <p class="meta"><b>${esc(m.topic || '')}</b> · <a href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.topic || 'your message to Think Nest'))}">${esc(m.email)}</a></p>
      <p class="msg-body">${esc(m.message)}</p>
      <div class="person-actions"><a class="pill pill-live" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.topic || 'your message to Think Nest'))}">↩ Reply by email</a>${m.attachment ? `<button class="pill pill-soft" data-mcv="${esc(m.attachment)}">📎 Open CV</button>` : ''}
        ${m.handled ? '<button class="pill pill-soft" data-mopen>Mark as not done</button>' : '<button class="pill pill-soft" data-mdone>✓ Mark as done</button>'}<button class="link-btn" data-mdel>Delete</button></div></article>`;
  box.innerHTML = (open.length ? open.map(card).join('') : '<p class="empty">No new messages. 🎉</p>') + (done.length ? `<details class="hubreq-done"><summary>Done (${done.length})</summary>${done.map(card).join('')}</details>` : '');
  box.onclick = async e => {
    const row = e.target.closest('[data-mid]'); if (!row) return; const id = Number(row.dataset.mid);
    const cv = e.target.closest('[data-mcv]');
    if (cv) { const { data: s, error: ce } = await db.storage.from('applications').createSignedUrl(cv.dataset.mcv, 600); if (ce) return say(friendly(ce)); window.open(s.signedUrl, '_blank', 'noopener'); return; }
    if (e.target.closest('[data-mdone]')) await db.from('contact_messages').update({ handled: true }).eq('id', id);
    else if (e.target.closest('[data-mopen]')) await db.from('contact_messages').update({ handled: false }).eq('id', id);
    else if (e.target.closest('[data-mdel]')) { if (!confirm('Delete this message?')) return; await db.from('contact_messages').delete().eq('id', id); }
    else return;
    loadContactMessages();
  };
}

// ---------- Admin: Coffee & Connections switches and meetups ----------
async function loadConnectAdmin() {
  const box = document.getElementById('connect-admin-box'); if (!box) return;
  const { data: st } = await db.from('site_settings').select('value').eq('key', 'connect_settings').maybeSingle();
  if (!st) { box.innerHTML = '<p class="empty">Run database update 38 to see these settings.</p>'; return; }
  const s = Object.assign({ partners: true, meetups: true, messages: true }, st.value || {});
  const { data: ms } = await db.from('cafe_meetups').select('*').gte('starts_at', new Date(Date.now() - 864e5).toISOString()).order('starts_at');
  box.innerHTML = `<div class="cx-switches">
      <label class="switch-row"><input type="checkbox" data-cs="partners" ${s.partners ? 'checked' : ''}> ☕ Learning Partners</label>
      <label class="switch-row"><input type="checkbox" data-cs="meetups" ${s.meetups ? 'checked' : ''}> 📅 Group meetups</label>
      <label class="switch-row"><input type="checkbox" data-cs="messages" ${s.messages ? 'checked' : ''}> 💬 Professional private messages</label></div>
    <h3 class="cx-adm-h">Upcoming meetups</h3>${(ms || []).length ? ms.map(m => `<div class="pending-row"><div><b>${esc(m.title)}</b><span class="meta">${m.hub === 'teachers' ? '🔔 Beyond the Bell' : '🚗 Beyond the School Run'} · ${new Date(m.starts_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${esc(m.place || 'Online')} · host ${esc(m.host_name || '')}</span></div><button class="link-btn" data-mrm="${m.id}">Remove</button></div>`).join('') : '<p class="meta">No upcoming meetups.</p>'}`;
  box.onchange = async e => {
    const k = e.target.dataset.cs; if (!k) return;
    s[k] = e.target.checked;
    const { error } = await db.rpc('set_connect_settings', { s });
    say(error ? friendly(error) : 'Saved.');
  };
  box.onclick = async e => {
    const r = e.target.closest('[data-mrm]'); if (!r || !confirm('Remove this meetup?')) return;
    await db.from('cafe_meetups').delete().eq('id', Number(r.dataset.mrm)); loadConnectAdmin();
  };
}

// ---------- Admin: email outbox ----------
async function loadEmailAdmin() {
  const box = document.getElementById('email-admin-box'); if (!box) return;
  const { data, error } = await db.from('email_outbox').select('id, subject, status, error, created_at, sent_at').order('created_at', { ascending: false }).limit(15);
  if (error) { box.innerHTML = '<p class="empty">Run database update 39 to see emails.</p>'; return; }
  const icon = { sent: '✅', pending: '⏳', failed: '❌', skipped: '➖' };
  const waiting = (data || []).filter(e => e.status === 'pending' || e.status === 'failed').length;
  box.innerHTML = `<div class="email-top"><span class="meta">${waiting ? waiting + ' waiting or failed' : 'All caught up'}</span><button class="pill pill-live" id="email-now">📤 Send waiting emails now</button></div>
    ${(data || []).length ? `<div class="email-list">${data.map(e => `<div class="pending-row"><span>${icon[e.status] || ''}</span><div><b>${esc(e.subject)}</b><span class="meta">${new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ${e.status}${e.error ? ' · ' + esc(e.error.slice(0, 80)) : ''}</span></div></div>`).join('')}</div>` : '<p class="meta">No emails yet.</p>'}`;
  box.querySelector('#email-now').onclick = async () => {
    const { error: er } = await db.rpc('send_emails_now');
    say(er ? friendly(er) : 'Sending… refresh in a minute.'); setTimeout(loadEmailAdmin, 6000);
  };
}

// ---------- Admin: account deletion requests ----------
async function loadDeletionRequests() {
  const box = document.getElementById('delreq-box'); if (!box) return;
  const { data, error } = await db.from('data_requests').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) { box.innerHTML = '<p class="empty">Run database update 40 to see deletion requests.</p>'; return; }
  const open = (data || []).filter(r => r.status === 'pending'), done = (data || []).filter(r => r.status !== 'pending').slice(0, 15);
  document.getElementById('n-delreq').textContent = open.length;
  const card = r => `<article class="panel person" data-dr="${r.id}" data-target="${r.about_child || r.user_id || ''}">
      <span class="initials">🗑️</span>
      <div class="person-info"><h4>${esc(r.child_name ? r.child_name + ' (child of ' + (r.user_name || '') + ')' : (r.user_name || 'Account already removed'))}</h4>
        <span class="meta">Asked by ${esc(r.user_name || '')} · <a href="mailto:${esc(r.user_email || '')}">${esc(r.user_email || '')}</a> · ${new Date(r.created_at).toLocaleDateString('en-GB')}</span>
        ${r.reason ? `<span class="meta">Reason: ${esc(r.reason)}</span>` : ''}${r.status !== 'pending' ? `<span class="meta">${r.status === 'done' ? '✅ Deleted' : 'Cancelled'}</span>` : ''}</div>
      ${r.status === 'pending' ? `<div class="person-actions"><a class="pill pill-soft" href="mailto:${esc(r.user_email || '')}?subject=${encodeURIComponent('Your Think Nest account deletion request')}">✉️ Email them</a><button class="pill pill-live danger" data-ddel>Delete account now</button><button class="link-btn" data-dcancel>Cancel request</button></div>` : ''}</article>`;
  box.innerHTML = (open.length ? open.map(card).join('') : '<p class="empty">No deletion requests. 🎉</p>') + (done.length ? `<details class="hubreq-done"><summary>Finished (${done.length})</summary>${done.map(card).join('')}</details>` : '');
  box.onclick = async e => {
    const row = e.target.closest('[data-dr]'); if (!row) return;
    if (e.target.closest('[data-dcancel]')) { await db.from('data_requests').update({ status: 'cancelled' }).eq('id', Number(row.dataset.dr)); return loadDeletionRequests(); }
    if (e.target.closest('[data-ddel]')) {
      if (!row.dataset.target) return say('This account has already been removed.');
      if (!confirm('Delete this account and all its information? This CAN’T be undone.')) return;
      if (prompt('To confirm, type DELETE') !== 'DELETE') return say('Not deleted.');
      const { error: er } = await db.rpc('admin_delete_account', { person: row.dataset.target });
      if (er) return say(friendly(er));
      say('Account deleted.'); loadDeletionRequests();
    }
  };
}
