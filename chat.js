// ===== Think Nest chat =====
// Uses db, say(), friendly(), esc() from app.js, initShell() from student.js, swapMenu() from groups.js

const cIni = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const cTime = ts => {
  const d = new Date(ts), now = new Date();
  return d.toDateString() === now.toDateString() ? d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
       : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const looksPrivate = t => /(\+?\d[\d\s\-().]{7,}\d)/.test(t) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t);

async function startChat() {
  const { user, profile: me } = await initShell();
  swapMenu(me.role);
  const params = new URLSearchParams(location.search);
  const isStudent = me.role === 'student', isAdult = !isStudent;
  if (isAdult) document.getElementById('safety').textContent = me.role === 'parent'
    ? '🔒 Your chats are private between you and the person you’re chatting with. You can chat with your children, their teachers, and parents who joined Parent Connections.'
    : 'Private messages with other teachers. Students can only chat privately with their student friends. For a class or study group, post in its community feed instead.';
  document.getElementById('new-chat').hidden = !(isStudent || me.role === 'parent' || me.also_parent);

  let current = null, channel = null, convs = [];
  const box = document.querySelector('.chat-page');

  async function loadList() {
    const { data, error } = await db.rpc('my_conversations');
    if (error) return say(friendly(error));
    // group and class chats were the same as each group's own feed, so Messages now holds private chats only
    convs = (data || []).filter(c => c.kind !== 'group');
    const total = convs.reduce((s, c) => s + Number(c.unread || 0), 0);
    if (typeof window.tnSetUnread === 'function') window.tnSetUnread(total); else { const dot = document.getElementById('nav-unread'); if (dot) dot.hidden = !total; }
    document.getElementById('convs').innerHTML = convs.length ? convs.map(c => `<button class="conv ${current && current.id === c.id ? 'on' : ''}" data-conv="${c.id}">
        <span class="initials ${c.kind === 'group' ? 'grp' : ''}">${c.kind === 'group' ? '👥' : esc(cIni(c.title))}</span>
        <span class="conv-text"><b>${esc(c.title || 'Chat')}</b><span class="meta">${c.last_body ? esc((c.kind === 'group' && c.last_sender ? c.last_sender.split(' ')[0] + ': ' : '') + c.last_body.slice(0, 50)) : 'No messages yet'}</span></span>
        <span class="conv-side"><span class="meta">${c.last_at ? cTime(c.last_at) : ''}</span>${Number(c.unread) ? `<span class="unread">${c.unread}</span>` : ''}</span></button>`).join('')
      : `<div class="empty-box"><p>${isStudent ? 'No chats yet. Start one with a friend, or open a study group chat.' : 'No chats yet. Join a study group to see its chat.'}</p></div>`;
  }

  function msgHtml(m) {
    const mine = m.sender_id === user.id;
    const tag = m.sender_role === 'teacher' || m.sender_role === 'school_leader' ? ' <span class="role-tag">Teacher</span>' : m.sender_role === 'admin' ? ' <span class="role-tag admin">Think Nest</span>' : '';
    return `<div class="msg ${mine ? 'mine' : ''}" data-msg="${m.id}">
      ${mine ? '' : `<span class="initials">${esc(cIni(m.sender_name))}</span>`}
      <div class="msg-bubble">${mine || current.kind === 'direct' ? '' : `<b>${esc(m.sender_name || 'Member')}</b>${tag}`}
        ${m.attachment_path ? (String(m.attachment_type || '').startsWith('image/') ? `<img class="msg-img" data-att="${esc(m.attachment_path)}" alt="Photo from ${esc(m.sender_name || 'a member')}">` : `<button class="msg-file" data-open-att="${esc(m.attachment_path)}">📎 ${esc(m.attachment_name || 'File')}</button>`) : ''}
        ${m.body ? `<p>${esc(m.body).replace(/\n/g, '<br>')}</p>` : ''}
        <span class="meta">${cTime(m.created_at)}${mine ? ' · <button class="link-btn" data-del>Delete</button>' : current.canPost || me.role === 'parent' ? ' · <button class="link-btn" data-rep>Report</button>' : ''}</span></div></div>`;
  }
  const msgsEl = document.getElementById('msgs');
  const attUrls = {};
  async function fillImages() {
    const imgs = [...msgsEl.querySelectorAll('img[data-att]:not([src])')];
    const need = [...new Set(imgs.map(i => i.dataset.att).filter(p => !attUrls[p]))];
    if (need.length) { const { data } = await db.storage.from('chat').createSignedUrls(need, 3600); (data || []).forEach(d => { if (d.signedUrl) attUrls[d.path] = d.signedUrl; }); }
    imgs.forEach(i => { if (attUrls[i.dataset.att]) { i.src = attUrls[i.dataset.att]; i.addEventListener('load', () => { if (msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 400) scrollDown(); }, { once: true }); } });
  }
  const scrollDown = () => { msgsEl.scrollTop = msgsEl.scrollHeight; };

  async function open(cid) {
    const { data: info, error } = await db.rpc('conversation_info', { cid });
    if (error || !info || !info.length) return say('This chat isn’t available.');
    const c = info[0];
    current = { id: cid, kind: c.kind, canPost: c.can_post };
    history.replaceState(null, '', 'messages.html?c=' + cid);
    box.classList.add('has-chat');
    document.getElementById('chat-empty').hidden = true;
    document.getElementById('chat-head').hidden = false;
    document.getElementById('chat-title').textContent = (c.kind === 'group' ? '👥 ' : '') + (c.title || 'Chat');
    document.getElementById('chat-people').textContent = c.people || '';
    const gl = document.getElementById('chat-group-link');
    gl.hidden = c.kind !== 'group'; if (c.kind === 'group') gl.href = 'group.html?id=' + c.group_id;
    document.getElementById('chat-form').hidden = !c.can_post;
    let pro = document.getElementById('chat-pro');
    if (!pro) { pro = document.createElement('p'); pro.id = 'chat-pro'; pro.className = 'chat-pro'; document.getElementById('chat-head').after(pro); }
    pro.hidden = !(c.kind === 'direct' && me && me.role !== 'student');
    pro.innerHTML = '🛡️ <b>Professional chat.</b> Keep it about teaching and learning. Please don’t share personal contact details or make personal invitations. Think Nest may review chats to keep everyone safe. Use <b>Report</b> on any message that isn’t right.';
    const ro = document.getElementById('chat-ro');
    ro.hidden = c.can_post;
    ro.textContent = me.role === 'admin' ? 'Admin view (read only).' : 'You can’t send messages in this chat right now.';
    const { data: msgs } = await db.from('messages').select('*').eq('conversation_id', cid).order('created_at', { ascending: true }).limit(200);
    msgsEl.innerHTML = (msgs || []).length ? msgs.map(msgHtml).join('') : '<p class="empty center">No messages yet. Say hello! 👋</p>';
    scrollDown(); fillImages();
    if (c.can_post) db.from('conversation_reads').upsert({ conversation_id: cid, user_id: user.id, last_read_at: new Date().toISOString() });
    // live updates
    if (channel) db.removeChannel(channel);
    channel = db.channel('chat-' + cid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + cid }, payload => {
      const m = payload.new;
      if (msgsEl.querySelector(`[data-msg="${m.id}"]`)) return;
      const empty = msgsEl.querySelector('.empty'); if (empty) empty.remove();
      msgsEl.insertAdjacentHTML('beforeend', msgHtml(m)); scrollDown(); fillImages();
      if (current.canPost) db.from('conversation_reads').upsert({ conversation_id: cid, user_id: user.id, last_read_at: new Date().toISOString() });
    }).subscribe();
    loadList();
    const ta = document.querySelector('#chat-form textarea'); if (c.can_post && window.innerWidth > 900) ta.focus();
  }

  // send
  const form = document.getElementById('chat-form'), ta = form.body;
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  const attachName = document.getElementById('attach-name');
  form.file.addEventListener('change', () => {
    const f = form.file.files[0];
    if (f && f.size > 10 * 1024 * 1024) { form.file.value = ''; attachName.hidden = true; return say('Files must be smaller than 10 MB.'); }
    attachName.hidden = !f; attachName.textContent = f ? (f.type.startsWith('image/') ? '📷 ' : '📎 ') + f.name + '  ✕' : '';
  });
  attachName.addEventListener('click', () => { form.file.value = ''; attachName.hidden = true; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const body = ta.value.trim(), file = form.file.files[0];
    if ((!body && !file) || !current) return;
    if (body && typeof tnFlagRisky === 'function') tnFlagRisky(body, 'private message');
    if (body && looksPrivate(body) && !confirm('This looks like it has a phone number or email address. Sharing contact details isn’t allowed on Think Nest, and this message will be checked by the Think Nest team. Send anyway?')) return;
    const btn = form.querySelector('.btn'); btn.disabled = true; btn.textContent = file ? 'Sending…' : 'Send';
    const row = { conversation_id: current.id, body: body || null };
    if (file) {
      const path = current.id + '/' + Date.now() + '-' + file.name.replace(/[^\w.\-]+/g, '_');
      const up = await db.storage.from('chat').upload(path, file, { contentType: file.type || undefined });
      if (up.error) { btn.disabled = false; btn.textContent = 'Send'; return say(friendly(up.error)); }
      Object.assign(row, { attachment_path: path, attachment_name: file.name.slice(0, 150), attachment_type: file.type || 'application/octet-stream' });
    }
    const { data, error } = await db.from('messages').insert(row).select().single();
    btn.disabled = false; btn.textContent = 'Send';
    if (error) return say(friendly(error));
    ta.value = ''; form.file.value = ''; attachName.hidden = true;
    if (!msgsEl.querySelector(`[data-msg="${data.id}"]`)) { const empty = msgsEl.querySelector('.empty'); if (empty) empty.remove(); msgsEl.insertAdjacentHTML('beforeend', msgHtml(data)); scrollDown(); fillImages(); }
    loadList();
  });

  // delete / report
  msgsEl.addEventListener('click', async e => {
    const att = e.target.closest('[data-open-att]') || e.target.closest('img[data-att]');
    if (att) {
      const path = att.dataset.openAtt || att.dataset.att;
      const { data, error } = await db.storage.from('chat').createSignedUrl(path, 600);
      if (error) return say(friendly(error));
      return window.open(data.signedUrl, '_blank', 'noopener');
    }
    const row = e.target.closest('[data-msg]'); if (!row) return;
    const id = Number(row.dataset.msg);
    if (e.target.closest('[data-del]')) {
      if (!confirm('Delete this message?')) return;
      const { error } = await db.from('messages').delete().eq('id', id);
      if (error) return say(friendly(error)); row.remove();
    }
    if (e.target.closest('[data-rep]')) {
      const reason = prompt('Why are you reporting this message? (for example: unkind, asking for private details, not appropriate)'); if (reason === null) return;
      const { error } = await db.from('message_reports').insert({ message_id: id, reason: reason.trim().slice(0, 300) || null });
      if (error && !String(error.message).includes('duplicate')) return say(friendly(error));
      say('Thank you. The Think Nest team will check this message.');
    }
  });

  document.getElementById('convs').addEventListener('click', e => { const b = e.target.closest('[data-conv]'); if (b) open(Number(b.dataset.conv)); });
  document.getElementById('back-chats').addEventListener('click', () => { box.classList.remove('has-chat'); });

  // new chat with a friend
  const dlg = document.getElementById('pick-dialog');
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  document.getElementById('new-chat').addEventListener('click', async () => {
    const [fr0, fam0] = await Promise.all([isStudent ? db.rpc('my_friends') : Promise.resolve({ data: [] }), db.rpc('family_chat_people')]);
    const fr = (fr0.data || []).filter(f => f.relation === 'friend'), fam = fam0.error ? [] : (fam0.data || []);
    const groups = {}; fam.forEach(p => (groups[p.grp] = groups[p.grp] || []).push(p));
    const row = (id, name, info, attr) => `<button class="pending-row pick" ${attr}="${id}"><span class="initials">${esc(cIni(name))}</span><div><b>${esc(name)}</b><span class="meta">${esc(info || '')}</span></div><span class="pill pill-live">Chat</span></button>`;
    const order = ['My parents', 'My children', 'Teachers', 'Other parents'];
    let html = order.filter(g => groups[g]).map(g => `<h3 style="margin:12px 0 6px">${g}</h3>` + groups[g].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(p => row(p.id, p.name, p.info, 'data-fam')).join('')).join('');
    if (isStudent) html += '<h3 style="margin:12px 0 6px">My friends</h3>' + (fr.length ? fr.map(f => row(f.id, f.full_name, f.grade, 'data-friend')).join('') : '<p class="empty">Add friends first on <a href="friends.html">My Friends</a>.</p>');
    if (!html) html = me.role === 'parent' ? '<p class="empty">No one to chat with yet. Add your child, and once they join a course you can chat with their teachers. Join <a href="parent-connect.html">Parent Connections</a> to chat with other parents.</p>' : '<p class="empty">No one to chat with yet.</p>';
    document.getElementById('pick-list').innerHTML = '<p class="meta">🔒 Chats are private between the two of you.</p>' + html;
    dlg.showModal();
  });
  document.getElementById('pick-list').addEventListener('click', async e => {
    const fm = e.target.closest('[data-fam]');
    if (fm) { dlg.close(); const { data, error } = await db.rpc('open_family_chat', { other: fm.dataset.fam }); if (error) return say(friendly(error)); await loadList(); return open(data); }
    const b = e.target.closest('[data-friend]'); if (!b) return;
    dlg.close(); openFriend(b.dataset.friend);
  });
  async function openFriend(fid) {
    const { data, error } = await db.rpc('open_direct_chat', { friend: fid });
    if (error) return say(friendly(error));
    open(data);
  }

  await loadList();
  if (params.get('with')) {
    // parents who aren't open to pairing approve before other parents can message them
    try { const { data: can, error: ce } = await db.rpc('parent_can_message', { other: params.get('with') });
      if (!ce && can && can !== 'ok') { say(can === 'pending' ? 'Your message request is waiting for their approval.' : can === 'declined' ? 'This parent isn’t taking messages just now.' : 'This parent approves messages first. Ask them from the Parent directory.'); setTimeout(() => location.href = 'parent-connect.html#people', 1800); return; } } catch (_) {}
    let { data, error } = await db.rpc('open_family_chat', { other: params.get('with') });
    if (error) ({ data, error } = await db.rpc('open_adult_chat', { other: params.get('with') }));
    if (error) say(friendly(error)); else { await loadList(); open(data); } }
  else if (params.get('friend')) openFriend(params.get('friend'));
  else if (params.get('group')) { location.replace('group.html?id=' + Number(params.get('group'))); return; }   // old group-chat links open the group's feed
  else if (params.get('c')) open(Number(params.get('c')));
  setInterval(() => { if (document.visibilityState === 'visible') loadList(); }, 20000);
}

// ---------- Admin: messages to check (on the Approvals page) ----------
async function loadMessageReview() {
  const box = document.getElementById('msg-review'); if (!box) return;
  const { data, error } = await db.rpc('messages_to_review');
  if (error) { box.innerHTML = ''; return; }
  document.getElementById('n-msgs').textContent = data.length;
  box.innerHTML = data.length ? data.map(m => `<article class="panel person" data-mrev="${m.id}">
      <div class="person-info"><h4>${esc(m.sender_name || 'Someone')} wrote:</h4><span class="meta bio">“${esc(m.body)}”</span>
        <span class="meta">${m.flagged ? '⚠️ May contain contact details' : ''}${m.flagged && Number(m.reports) ? ' · ' : ''}${Number(m.reports) ? 'Reported ' + m.reports + '×: ' + esc(m.reasons) : ''} · ${new Date(m.created_at).toLocaleString('en-GB')}</span></div>
      <div class="person-actions"><a class="pill pill-soft" href="messages.html?c=${m.conversation_id}">Open chat</a><button class="pill pill-soft danger" data-mdel>Delete message</button><button class="pill pill-soft" data-mok>It’s fine</button></div></article>`).join('')
    : '<p class="empty">Nothing to check. 🎉</p>';
  box.onclick = async e => {
    const row = e.target.closest('[data-mrev]'); if (!row) return;
    const id = Number(row.dataset.mrev);
    if (e.target.closest('[data-mdel]')) { if (!confirm('Delete this message?')) return; const { error: er } = await db.from('messages').delete().eq('id', id); if (er) return say(friendly(er)); say('Message deleted.'); loadMessageReview(); }
    if (e.target.closest('[data-mok]')) { const { error: er } = await db.rpc('clear_message_review', { mid: id }); if (er) return say(friendly(er)); say('Marked as fine.'); loadMessageReview(); }
  };
}
