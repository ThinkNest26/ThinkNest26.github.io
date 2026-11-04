// ===== Think Nest friends (students only) =====
// Uses db, say(), friendly(), esc() from app.js and initShell() from student.js

const fIni = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const fMeta = p => esc([p.grade, p.school].filter(Boolean).join(' · '));

async function startFriends() {
  const { profile: me } = await initShell();
  if (me.role !== 'student') {
    document.querySelector('main').innerHTML = '<div class="empty-box"><p>Friends are for student accounts.</p><a class="btn btn-red" href="community.html">Go to the community</a></div>';
    return;
  }
  const results = document.getElementById('results');

  async function load() {
    const [{ data, error }, bl] = await Promise.all([db.rpc('my_friends'), db.rpc('my_blocked')]);
    if (error) return say(friendly(error));
    const friends = data.filter(f => f.relation === 'friend'), incoming = data.filter(f => f.relation === 'incoming'), sent = data.filter(f => f.relation === 'sent');
    document.getElementById('n-friends').textContent = friends.length;
    document.getElementById('incoming').innerHTML = incoming.length ? '<h2 class="dash-h">Friend requests <span class="count">' + incoming.length + '</span></h2><section class="approve-list">' + incoming.map(f => `<article class="panel person">
        <span class="initials">${esc(fIni(f.full_name))}</span>
        <div class="person-info"><h4>${esc(f.full_name)} wants to be your friend</h4><span class="meta">${fMeta(f)}</span></div>
        <div class="person-actions"><button class="pill pill-live" data-accept="${f.fid}">Accept</button><button class="pill pill-soft" data-decline="${f.fid}">Decline</button><button class="link-btn" data-block="${f.id}" data-name="${esc(f.full_name)}">Block</button></div></article>`).join('') + '</section>' : '';
    document.getElementById('friends').innerHTML = friends.length ? friends.map(f => `<div class="panel friend">
        <span class="initials">${esc(fIni(f.full_name))}</span>
        <div><b>${esc(f.full_name)}</b><span class="meta">${fMeta(f)}</span></div>
        <div class="friend-menu"><button class="link-btn" data-remove="${f.id}" data-name="${esc(f.full_name)}">Remove</button><button class="link-btn" data-block="${f.id}" data-name="${esc(f.full_name)}">Block</button></div></div>`).join('')
      : '<div class="empty-box"><p>No friends yet. Search for a classmate above to send a friend request.</p></div>';
    document.getElementById('sent').innerHTML = sent.length ? '<h2 class="dash-h">Requests you sent</h2><section class="approve-list">' + sent.map(f => `<div class="pending-row"><span class="initials">${esc(fIni(f.full_name))}</span><div><b>${esc(f.full_name)}</b><span class="meta">Waiting for them to accept</span></div><button class="link-btn" data-remove="${f.id}" data-name="${esc(f.full_name)}" data-cancel="1">Cancel</button></div>`).join('') + '</section>' : '';
    const blocked = bl.data || [];
    document.getElementById('n-blocked').textContent = blocked.length;
    document.getElementById('blocked').innerHTML = blocked.length ? blocked.map(b => `<div class="pending-row"><span class="initials">${esc(fIni(b.full_name))}</span><div><b>${esc(b.full_name)}</b></div><button class="link-btn" data-unblock="${b.id}">Unblock</button></div>`).join('') : '<p class="empty">You haven’t blocked anyone.</p>';
  }

  async function search(q) {
    if (q.trim().length < 2) { results.innerHTML = '<p class="empty">Type at least 2 letters.</p>'; return; }
    const { data, error } = await db.rpc('search_students', { q });
    if (error) return say(friendly(error));
    results.innerHTML = data.length ? data.map(p => `<div class="pending-row">
        <span class="initials">${esc(fIni(p.full_name))}</span><div><b>${esc(p.full_name)}</b><span class="meta">${fMeta(p)}</span></div>
        ${p.relation === 'friend' ? '<span class="tag tag-now">Friends</span>' : p.relation === 'sent' ? '<span class="tag tag-wait">Request sent</span>' : p.relation === 'incoming' ? `<button class="pill pill-live" data-add="${p.id}">Accept request</button>` : `<button class="pill pill-live" data-add="${p.id}">Add friend</button>`}
      </div>`).join('') : '<p class="empty">No students found with that name.</p>';
  }
  const ff = document.getElementById('find-form');
  ff.addEventListener('submit', e => { e.preventDefault(); search(ff.q.value); });

  document.querySelector('main').addEventListener('click', async e => {
    const t = e.target.closest('[data-add],[data-accept],[data-decline],[data-remove],[data-block],[data-unblock]'); if (!t) return;
    let res;
    if (t.dataset.add) { res = await db.rpc('send_friend_request', { target: t.dataset.add }); if (!res.error) say(res.data === 'friends' ? 'You’re now friends!' : 'Friend request sent.'); }
    else if (t.dataset.accept) { res = await db.rpc('respond_friend_request', { fid: Number(t.dataset.accept), ok: true }); if (!res.error) say('You’re now friends!'); }
    else if (t.dataset.decline) { res = await db.rpc('respond_friend_request', { fid: Number(t.dataset.decline), ok: false }); if (!res.error) say('Request declined.'); }
    else if (t.dataset.remove) {
      if (!confirm((t.dataset.cancel ? 'Cancel your request to ' : 'Remove ') + t.dataset.name + (t.dataset.cancel ? '?' : ' as a friend?'))) return;
      res = await db.rpc('remove_friend', { other: t.dataset.remove }); if (!res.error) say('Done.');
    }
    else if (t.dataset.block) {
      if (!confirm('Block ' + t.dataset.name + '? They won’t be able to find you or send you requests.')) return;
      res = await db.rpc('block_user', { other: t.dataset.block }); if (!res.error) say(t.dataset.name + ' is blocked.');
    }
    else if (t.dataset.unblock) { res = await db.rpc('unblock_user', { other: t.dataset.unblock }); if (!res.error) say('Unblocked.'); }
    if (res && res.error) return say(friendly(res.error));
    load(); if (ff.q.value.trim().length >= 2) search(ff.q.value);
  });
  load();
}

// Small banner on the student dashboard when someone sends a friend request
async function friendBanner() {
  const box = document.getElementById('friend-requests'); if (!box) return;
  const { data } = await db.rpc('my_friends');
  const n = (data || []).filter(f => f.relation === 'incoming').length;
  box.innerHTML = n ? `<a class="panel req-banner" href="friends.html"><span class="req-ic" aria-hidden="true">🤝</span><span><b>${n} friend request${n === 1 ? '' : 's'}</b> waiting for you</span><span class="pill pill-live">See requests →</span></a>` : '';
}
