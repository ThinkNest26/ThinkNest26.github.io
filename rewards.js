// ===== Think Nest rewards: Nest Points, levels, badges, streaks, leaderboards and teacher stars =====
// Uses db, say(), friendly(), esc() from app.js
const LEVELS = [[0, 'Hatchling', '🥚'], [50, 'Chick', '🐣'], [150, 'Fledgling', '🐥'], [300, 'Explorer', '🐦'], [600, 'Soarer', '🦅'], [1000, 'Eagle', '🏆']];
const BADGES = [
  ['first_post', '✏️', 'First post', 'Share your first post in the community', s => (s.counts.post || 0) >= 1],
  ['worker', '📚', 'Hard worker', 'Hand in 5 pieces of work', s => (s.counts.item || 0) >= 5],
  ['scholar', '🎓', 'Super scholar', 'Hand in 20 pieces of work', s => (s.counts.item || 0) >= 20],
  ['perfect', '🎯', 'Bullseye', 'Get a perfect score on a quiz', s => (s.counts.perfect || 0) >= 1],
  ['perfect5', '🏹', 'Sharpshooter', 'Get 5 perfect scores', s => (s.counts.perfect || 0) >= 5],
  ['lessons', '📖', 'Lesson legend', 'Finish 10 lessons', s => (s.counts.lesson || 0) >= 10],
  ['helper', '🤝', 'Helpful friend', 'Write 10 helpful comments', s => (s.counts.comment || 0) >= 10],
  ['liked', '💛', 'Crowd favourite', 'Get 10 likes on your posts', s => (s.counts.like || 0) >= 10],
  ['attend', '🙋', 'Always there', 'Attend 10 classes', s => (s.counts.attend || 0) >= 10],
  ['star', '⭐', 'Rising star', 'Get a star from a teacher', s => (s.counts.star || 0) >= 1],
  ['star5', '🌟', 'Star student', 'Get 5 stars from teachers', s => (s.counts.star || 0) >= 5],
  ['streak3', '🔥', 'On fire', 'Learn 3 days in a row', s => s.streak >= 3],
  ['streak7', '⚡', 'Unstoppable', 'Learn 7 days in a row', s => s.streak >= 7],
  ['club100', '💯', '100 club', 'Earn 100 Nest Points', s => s.total >= 100],
  ['flyer', '🚀', 'High flyer', 'Earn 500 Nest Points', s => s.total >= 500]
];
function levelOf(total) {
  let i = 0; LEVELS.forEach((l, k) => { if (total >= l[0]) i = k; });
  const next = LEVELS[i + 1];
  return { name: LEVELS[i][1], icon: LEVELS[i][2], index: i, next: next ? { name: next[1], icon: next[2], at: next[0] } : null,
           progress: next ? Math.round((total - LEVELS[i][0]) / (next[0] - LEVELS[i][0]) * 100) : 100 };
}
function streakOf(days) {
  const set = new Set(days || []);
  const fmt = d => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
  let d = new Date(), n = 0;
  if (!set.has(fmt(d))) d = new Date(Date.now() - 864e5);
  while (set.has(fmt(d))) { n++; d = new Date(d.getTime() - 864e5); }
  return n;
}
async function getRewards(sid) {
  const { data, error } = await db.rpc('reward_summary', sid ? { sid } : {});
  if (error || !data) return null;
  const s = data; s.streak = streakOf(s.days); s.level = levelOf(s.total);
  s.badges = BADGES.map(([id, ic, name, desc, test]) => ({ id, ic, name, desc, earned: !!test(s) }));
  return s;
}
// Small card (community banner, dashboards, parent view)
function rewardMiniHtml(s, opts = {}) {
  if (!s) return '';
  const earned = s.badges.filter(b => b.earned);
  return `<div class="rw-mini">
    <div class="rw-level"><span class="rw-ic">${s.level.icon}</span><div><b>${esc(s.level.name)}</b><span class="meta">${s.total} Nest Points${s.streak ? ` · 🔥 ${s.streak}-day streak` : ''}</span></div></div>
    ${s.level.next ? `<div class="rw-bar" title="${s.level.next.at - s.total} points to ${esc(s.level.next.name)}"><i style="width:${s.level.progress}%"></i></div><p class="meta">${s.level.next.at - s.total} points to ${s.level.next.icon} ${esc(s.level.next.name)}</p>` : '<p class="meta">Top level reached! 🏆</p>'}
    ${earned.length ? `<div class="rw-badges-mini">${earned.slice(-6).map(b => `<span title="${esc(b.name)}">${b.ic}</span>`).join('')}</div>` : ''}
    ${opts.link === false ? '' : '<a class="rw-link" href="rewards.html">See my rewards →</a>'}
  </div>`;
}
async function leaderboardHtml(gid, title) {
  const { data } = await db.rpc('class_leaderboard', { gid });
  if (!(data || []).length) return '';
  const medal = i => ['🥇', '🥈', '🥉'][i] || `<span class="rw-pos">${i + 1}</span>`;
  return `<div class="rw-board"><h4>🏆 ${esc(title || 'Class leaderboard')} <span class="meta">this month</span></h4><ol>${data.map((r, i) => `<li class="${r.is_me ? 'me' : ''}">${medal(i)}<span>${esc(r.name)}${r.is_me ? ' (you)' : ''}</span><b>${r.points}</b></li>`).join('')}</ol></div>`;
}

// ---------- My rewards page ----------
async function startRewards() {
  const { profile } = await initShell();
  const box = document.getElementById('rw-page');
  if (profile.role !== 'student') { box.innerHTML = '<div class="empty-box"><p>Rewards are for student accounts.</p></div>'; return; }
  const s = await getRewards();
  if (!s) { box.innerHTML = '<p class="empty">Rewards aren’t switched on yet.</p>'; return; }
  const { data: groups } = await db.rpc('my_groups');
  const classes = (groups || []).filter(g => g.kind === 'class' && g.my_status === 'active');
  const boards = (await Promise.all(classes.map(c => leaderboardHtml(c.id, c.name)))).join('');
  box.innerHTML = `
    <section class="rw-hero">
      <div class="rw-hero-ic">${s.level.icon}</div>
      <div><span class="meta">Your level</span><h2>${esc(s.level.name)}</h2>
        ${s.level.next ? `<div class="rw-bar big"><i style="width:${s.level.progress}%"></i></div><p>${s.level.next.at - s.total} more points to become ${s.level.next.icon} <b>${esc(s.level.next.name)}</b></p>` : '<p>You’ve reached the top level! 🏆</p>'}</div>
      <div class="rw-stats"><div><b>${s.total}</b><span>Nest Points</span></div><div><b>${s.month}</b><span>This month</span></div><div><b>🔥 ${s.streak}</b><span>Day streak</span></div><div><b>⭐ ${s.counts.star || 0}</b><span>Teacher stars</span></div></div>
    </section>
    <h2 class="dash-h">Badges <span class="count">${s.badges.filter(b => b.earned).length} / ${s.badges.length}</span></h2>
    <section class="rw-badges">${s.badges.map(b => `<div class="rw-badge ${b.earned ? 'on' : ''}"><span>${b.earned ? b.ic : '🔒'}</span><b>${esc(b.name)}</b><span class="meta">${esc(b.desc)}</span></div>`).join('')}</section>
    <div class="rw-cols">
      <section class="panel"><h3>How to earn Nest Points</h3><ul class="rw-how">
        <li><b>+10</b> Hand in a worksheet, quiz or task</li><li><b>+5</b> Bonus for a perfect score</li><li><b>+5</b> Finish a lesson</li><li><b>+2</b> Come to class (or ✋ check in to a live class)</li>
        <li><b>+5</b> For every ⭐ star from a teacher</li><li><b>+3</b> Share a post (up to 3 a day)</li><li><b>+2</b> Post in a group (up to 5 a day)</li>
        <li><b>+1</b> Write a helpful comment (up to 10 a day)</li><li><b>+1</b> When someone likes your post</li></ul></section>
      <section class="panel"><h3>Recent points</h3>${s.recent.length ? `<ul class="rw-recent">${s.recent.map(r => `<li><b>+${r.points}</b><span>${esc(r.reason)}</span><span class="meta">${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></li>`).join('')}</ul>` : '<p class="empty">Hand in some work or join the community to earn your first points!</p>'}</section>
    </div>
    ${boards ? `<h2 class="dash-h">Leaderboards</h2><section class="rw-boards">${boards}</section>` : ''}`;
}

// ---------- Teachers: give stars ----------
function ensureStarDialog() {
  let d = document.getElementById('star-dialog'); if (d) return d;
  d = document.createElement('dialog'); d.id = 'star-dialog'; d.className = 'dlg';
  d.innerHTML = `<form class="auth-form star-form"><h2>⭐ Give stars</h2><p class="meta" id="star-who"></p>
    <div class="star-pick" role="radiogroup" aria-label="Number of stars">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="n" value="${n}" ${n === 1 ? 'checked' : ''}><span>${'⭐'.repeat(n)}</span></label>`).join('')}</div>
    <label>What for? <input type="text" name="why" maxlength="120" list="star-reasons" placeholder="For example: Great teamwork"></label>
    <datalist id="star-reasons"><option value="Great teamwork"><option value="Kindness"><option value="Excellent effort"><option value="Brilliant question"><option value="Helping a classmate"><option value="Outstanding work"><option value="Big improvement"></datalist>
    <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-sclose>Cancel</button><button class="btn btn-red auth-btn">Give stars</button></div></form>`;
  document.body.appendChild(d);
  d.querySelector('[data-sclose]').addEventListener('click', () => d.close());
  return d;
}
function giveStars(sid, name) {
  const d = ensureStarDialog(), f = d.querySelector('form');
  f.reset(); d.querySelector('#star-who').textContent = 'To ' + name; d.showModal();
  f.onsubmit = async e => {
    e.preventDefault();
    const { error } = await db.rpc('give_stars', { sid, stars: Number(f.n.value), why: f.why.value.trim() });
    if (error) return say(friendly(error));
    d.close(); say(`⭐ Stars given to ${name}. They’ve been told!`);
  };
}
