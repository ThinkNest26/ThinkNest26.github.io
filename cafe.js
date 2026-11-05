// ===== Think Nest cafés: reactions, polls, shout-outs and the Daily Brew =====
(function () {
  const SPACE = (document.body && document.body.dataset.space) || 'community';
  if (SPACE === 'community') return;
  const REACT = [['coffee', '☕', 'Coffee for you'], ['genius', '💡', 'Genius!'], ['lol', '😂', 'Ha!'], ['love', '❤️', 'Love this'], ['clap', '🙌', 'Well done']];
  const BREWS = SPACE === 'teachers' ? [
    'What’s one thing that made you smile in class this week?', 'Share your best 2-minute starter activity.', 'What’s the best piece of teaching advice you’ve ever had?',
    'Which app or website saves you the most time?', 'Coffee or tea? And how many before 10am? ☕', 'What’s a book every teacher should read?',
    'What’s your go-to brain break?', 'Describe your week in three emojis.', 'What’s one thing you wish parents knew?', 'Best classroom-management trick that actually works?',
    'What’s something new you tried this term?', 'What do you do to switch off at the weekend?', 'Funniest thing a student said to you recently?', 'Which lesson are you most proud of?'
  ] : [
    'What’s one small win from your week?', 'Share your quickest healthy lunchbox idea.', 'How do you get a little time for yourself?', 'Favourite family weekend activity in the UAE?',
    'What’s a book your child loved recently?', 'Best tip for calm school mornings?', 'Describe your week in three emojis.', 'What’s one thing you’re learning for yourself?'
  ];
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let me = null;

  // ----- composer: show poll / shout-out tools for those post types
  window.cafeExtra = type => {
    if (type === 'poll') {
      const opts = [...document.querySelectorAll('#cafe-poll [data-opt]')].map(i => i.value.trim()).filter(Boolean);
      if (opts.length < 2) return { error: 'Add at least two poll options.' };
      return { poll: opts.slice(0, 4) };
    }
    if (type === 'shoutout') {
      const m = document.getElementById('cafe-mention').value;
      if (!m) return { error: 'Choose who you’re giving a shout-out to.' };
      return { mention_id: m };
    }
    return {};
  };
  window.cafeReset = () => { document.querySelectorAll('#cafe-poll [data-opt]').forEach(i => i.value = ''); const s = document.getElementById('cafe-mention'); if (s) s.value = ''; toggleTools(); };
  function toggleTools() {
    const t = (document.querySelector('input[name=ptype]:checked') || {}).value;
    const p = document.getElementById('cafe-poll'), s = document.getElementById('cafe-shout');
    if (p) p.hidden = t !== 'poll'; if (s) s.hidden = t !== 'shoutout';
    const body = document.getElementById('post-body');
    if (body && t === 'poll') body.placeholder = 'Ask your question, for example: Best day for a staff breakfast?';
    if (body && t === 'shoutout') body.placeholder = 'Say thank you or celebrate a colleague…';
  }

  // ----- reactions + polls on each post
  async function enhance() {
    const posts = [...document.querySelectorAll('#feed [data-post]:not([data-cafe])')]; if (!posts.length) return;
    posts.forEach(p => p.dataset.cafe = '1');
    const ids = posts.map(p => Number(p.dataset.post));
    const [{ data: info }, { data: reacts }, { data: votes }] = await Promise.all([
      db.from('posts').select('id, poll, mention_id').in('id', ids),
      db.from('post_reactions').select('post_id, user_id, emoji').in('post_id', ids),
      db.from('poll_votes').select('post_id, user_id, choice').in('post_id', ids)
    ]);
    const names = {};
    const mentions = [...new Set((info || []).map(x => x.mention_id).filter(Boolean))];
    if (mentions.length) { const { data: ps } = await db.from('profiles').select('id, full_name').in('id', mentions); (ps || []).forEach(p => names[p.id] = p.full_name); }
    posts.forEach(el => {
      const id = Number(el.dataset.post), inf = (info || []).find(x => x.id === id) || {};
      const body = el.querySelector('.post-body');
      if (inf.mention_id && body && !el.querySelector('.shout')) body.insertAdjacentHTML('beforebegin', `<div class="shout">🙌 Shout-out to <b>${esc2(names[inf.mention_id] || 'a colleague')}</b></div>`);
      if (Array.isArray(inf.poll) && inf.poll.length) { const box = document.createElement('div'); box.className = 'poll'; box.dataset.pid = id; (body || el).after(box); drawPoll(box, inf.poll, (votes || []).filter(v => v.post_id === id)); }
      const bar = document.createElement('div'); bar.className = 'reacts'; bar.dataset.rid = id;
      const actions = el.querySelector('.post-actions') || el.querySelector('footer');
      (actions || el).before(bar); drawReacts(bar, (reacts || []).filter(r => r.post_id === id));
    });
  }
  function drawReacts(bar, list) {
    bar._list = list;
    bar.innerHTML = REACT.map(([k, ic, label]) => { const n = list.filter(r => r.emoji === k).length, mine = me && list.some(r => r.emoji === k && r.user_id === me);
      return `<button type="button" class="react ${mine ? 'on' : ''}" data-re="${k}" title="${label}" aria-pressed="${mine}">${ic}${n ? `<b>${n}</b>` : ''}</button>`; }).join('');
  }
  function drawPoll(box, opts, votes) {
    box._opts = opts; box._votes = votes;
    const total = votes.length, mine = me && votes.find(v => v.user_id === me);
    box.innerHTML = opts.map((o, i) => { const n = votes.filter(v => v.choice === i).length, pc = total ? Math.round(n / total * 100) : 0;
      return `<button type="button" class="poll-opt ${mine && mine.choice === i ? 'on' : ''}" data-vote="${i}"><span class="poll-bar" style="width:${mine ? pc : 0}%"></span><span class="poll-txt">${esc2(o)}</span>${mine ? `<b>${pc}%</b>` : ''}</button>`; }).join('') +
      `<p class="meta">${total} vote${total === 1 ? '' : 's'}${mine ? ' · tap another option to change your vote' : ' · tap to vote and see the results'}</p>`;
  }
  document.addEventListener('click', async e => {
    const r = e.target.closest('[data-re]');
    if (r) {
      const bar = r.closest('[data-rid]'), pid = Number(bar.dataset.rid), k = r.dataset.re, mine = bar._list.some(x => x.emoji === k && x.user_id === me);
      const res = mine ? await db.from('post_reactions').delete().eq('post_id', pid).eq('user_id', me).eq('emoji', k) : await db.from('post_reactions').insert({ post_id: pid, user_id: me, emoji: k });
      if (res.error) return say(friendly(res.error));
      drawReacts(bar, mine ? bar._list.filter(x => !(x.emoji === k && x.user_id === me)) : bar._list.concat({ post_id: pid, user_id: me, emoji: k }));
      if (!mine) { r.classList.add('pop'); setTimeout(() => r.classList.remove('pop'), 400); }
      return;
    }
    const v = e.target.closest('[data-vote]');
    if (v) {
      const box = v.closest('[data-pid]'), pid = Number(box.dataset.pid), choice = Number(v.dataset.vote), had = box._votes.find(x => x.user_id === me);
      const res = had ? await db.from('poll_votes').update({ choice }).eq('post_id', pid).eq('user_id', me) : await db.from('poll_votes').insert({ post_id: pid, user_id: me, choice });
      if (res.error) return say(friendly(res.error));
      drawPoll(box, box._opts, box._votes.filter(x => x.user_id !== me).concat({ post_id: pid, user_id: me, choice }));
      return;
    }
    if (e.target.closest('[data-brew]')) {
      const b = document.getElementById('post-body'); const q = e.target.closest('[data-brew]').dataset.brew;
      document.querySelector('input[name=ptype][value=post]').checked = true; toggleTools();
      b.value = '☕ Daily Brew: ' + q + '\n'; b.focus(); b.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  document.addEventListener('change', e => { if (e.target.name === 'ptype') toggleTools(); });

  document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await db.auth.getSession(); if (!session) return; me = session.user.id;
    // Daily Brew
    const day = Math.floor((Date.now() + 4 * 3600e3) / 864e5), q = BREWS[day % BREWS.length];
    const brew = document.getElementById('cafe-brew');
    if (brew) brew.innerHTML = `<h3>☕ The Daily Brew</h3><p class="brew-q">${esc2(q)}</p><button type="button" class="btn btn-red" data-brew="${esc2(q)}">Answer this</button><p class="meta">A new question every day.</p>`;
    // colleagues for shout-outs
    const { data: people } = await db.rpc('cafe_members', { sp: SPACE });
    const sel = document.getElementById('cafe-mention');
    if (sel) sel.innerHTML = '<option value="">Choose a colleague…</option>' + (people || []).map(p => `<option value="${p.id}">${esc2(p.full_name)}</option>`).join('');
    const feed = document.getElementById('feed');
    if (feed) new MutationObserver(() => enhance()).observe(feed, { childList: true, subtree: false });
    enhance(); toggleTools();
  });
})();
