// ===== Think Nest: mentor session threads =====
// Each mentor session has one small conversation shared by the mentor, the student and the student's parents.
// No private mentor–student chat: parents always see everything.
// Uses db, say(), friendly(), esc(), when() from app.js

function stEnsureDialog() {
  let d = document.getElementById('session-thread');
  if (d) return d;
  d = document.createElement('dialog');
  d.id = 'session-thread'; d.className = 'dlg st-dlg';
  d.innerHTML = `<div class="st-wrap"><header class="st-head"><div><h2 id="st-title">Session thread</h2><p class="meta" id="st-sub"></p></div><button type="button" class="link-btn" data-st-close>✕ Close</button></header>
    <p class="note st-safe">👪 Shared by the mentor, the student and their parents. Everyone here can read every message.</p>
    <div class="st-list" id="st-list" aria-live="polite"><p class="empty">Loading…</p></div>
    <form class="st-form" id="st-form"><div class="st-kind" id="st-kind" hidden>
        <label class="remember"><input type="radio" name="kind" value="message" checked> Message</label>
        <label class="remember"><input type="radio" name="kind" value="note"> Prep note (before the session)</label>
        <label class="remember"><input type="radio" name="kind" value="summary"> After-session summary (emailed to parents)</label></div>
      <textarea name="body" rows="3" maxlength="3000" required placeholder="Write a message…"></textarea>
      <p class="meta" id="st-hint"></p>
      <div class="st-btns"><button class="btn btn-red">Send</button></div></form></div>`;
  document.body.appendChild(d);
  d.querySelector('[data-st-close]').onclick = () => d.close();
  return d;
}

const ST_LABEL = { note: '📝 Prep note', summary: '📋 Session summary', message: '' };
const ST_ROLE = { mentor: '🧑‍🏫 Mentor', student: '🎒 Student', parent: '👪 Parent' };

async function openSessionThread(bid, opts = {}) {
  const d = stEnsureDialog(), list = d.querySelector('#st-list'), f = d.querySelector('#st-form');
  d.querySelector('#st-title').textContent = opts.title || 'Session thread';
  d.querySelector('#st-sub').textContent = opts.when ? when(opts.when) : '';
  const isMentor = opts.role === 'mentor';
  d.querySelector('#st-kind').hidden = !isMentor;
  f.reset();
  if (isMentor && opts.summary) f.querySelector('input[value=summary]').checked = true;
  const hint = () => {
    const k = (f.querySelector('input[name=kind]:checked') || {}).value;
    d.querySelector('#st-hint').textContent = !isMentor ? 'Please keep messages about the session. Don’t share phone numbers or addresses.'
      : k === 'summary' ? 'Tip: what you worked on, what went well, and what to practise next.' : k === 'note' ? 'Tip: what to bring or think about before the session.' : '';
    f.body.placeholder = k === 'summary' ? 'Today we worked on… It went well when… Next, practise…' : 'Write a message…';
  };
  f.onchange = hint; hint();
  async function load() {
    const { data, error } = await db.rpc('booking_thread', { bid });
    if (error) { list.innerHTML = `<p class="empty">${/booking_thread/.test(error.message || '') ? 'Please run the latest database update (session threads) first.' : esc(friendly(error))}</p>`; return; }
    const rows = data || [];
    list.innerHTML = rows.length ? rows.map(m => `<article class="st-msg st-${esc(m.author_role)} ${m.kind !== 'message' ? 'st-special' : ''}">
        <header><b>${esc(m.author_name || 'Someone')}</b> <span class="tag">${ST_ROLE[m.author_role] || ''}</span>${ST_LABEL[m.kind] ? ` <span class="tag tag-now">${ST_LABEL[m.kind]}</span>` : ''}<span class="meta">${new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span></header>
        <p>${esc(m.body).replace(/\n/g, '<br>')}</p></article>`).join('')
      : '<p class="empty">No messages yet. Say hello, or say what you’d like help with.</p>';
    list.scrollTop = list.scrollHeight;
  }
  f.onsubmit = async e => {
    e.preventDefault();
    const body = f.body.value.trim(); if (!body) return;
    if (typeof looksPrivate === 'function' && looksPrivate(body) && !confirm('This looks like it has a phone number or email in it. Send anyway?')) return;
    const kind = isMentor ? (f.querySelector('input[name=kind]:checked') || {}).value || 'message' : 'message';
    const b = f.querySelector('button.btn-red'); b.disabled = true;
    const { error } = await db.rpc('post_booking_message', { bid, body, kind });
    b.disabled = false;
    if (error) return say(friendly(error));
    f.body.value = ''; say(kind === 'summary' ? 'Summary sent. Parents have been told by email.' : 'Sent.'); load();
    if (opts.onSent) opts.onSent();
  };
  if (!d.open) d.showModal();
  load();
}

// A parent's view: a child's mentor sessions (coming up and the last 60 days), each with its thread
async function childSessions(kidId, host) {
  if (!host) return;
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  let { data, error } = await db.from('bookings').select('id, starts_at, status, note, parent_ok, parent_token, mentors(name, meeting_link)').eq('user_id', kidId).in('status', ['pending', 'accepted']).gte('starts_at', since).order('starts_at', { ascending: false });
  if (error) ({ data } = await db.from('bookings').select('id, starts_at, status, note, mentors(name, meeting_link)').eq('user_id', kidId).in('status', ['pending', 'accepted']).gte('starts_at', since).order('starts_at', { ascending: false }));
  const rows = data || [];
  host.innerHTML = rows.length ? `<h2 class="dash-h">🧑‍🏫 Mentor sessions</h2>` + rows.map(b => `<article class="panel person"><div class="person-info"><h4>Session with ${esc(b.mentors ? b.mentors.name : 'a mentor')}</h4>
      <span class="meta">${esc(when(b.starts_at))} · ${b.parent_ok === false ? '👪 waiting for you to agree' : b.status === 'pending' ? '⏳ waiting for the mentor' : new Date(b.starts_at) < new Date() ? '✅ done' : '✅ booked'}</span>${b.note ? `<span class="meta">“${esc(b.note)}”</span>` : ''}</div>
      <div class="person-actions">${b.parent_ok === false && b.parent_token ? `<a class="pill pill-live" href="parent-booking.html?t=${esc(b.parent_token)}">👪 Agree or say no</a>` : ''}${b.status === 'accepted' && b.mentors && b.mentors.meeting_link && new Date(b.starts_at) > Date.now() - 3600e3 ? `<a class="pill pill-soft" href="${esc(b.mentors.meeting_link)}" target="_blank" rel="noopener">🎥 Join the call</a>` : ''}<button class="pill pill-live" data-thread="${b.id}" data-title="Session with ${esc(b.mentors ? b.mentors.name : 'a mentor')}" data-when="${esc(b.starts_at)}">💬 Session thread</button></div></article>`).join('') : '';
  host.onclick = e => { const t = e.target.closest('[data-thread]'); if (t) openSessionThread(Number(t.dataset.thread), { title: t.dataset.title, when: t.dataset.when, role: 'parent' }); };
}
