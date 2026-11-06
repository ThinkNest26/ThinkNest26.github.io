// ===== Think Nest weekly calendar (students, teachers, parents) =====
const WC_SUBJECT = [[/math|further/i, '#3E4B94'], [/english|literacy|reading|phonics/i, '#F27A6F'], [/science|biology|chemistry|physics/i, '#2FA08A'],
  [/arabic|عرب/i, '#D4A017'], [/islamic|social/i, '#8A5CF6'], [/computer|coding|ict|technology/i, '#3E8EDE']];
const WC_KID = ['#3E4B94', '#F27A6F', '#2FA08A', '#D4A017', '#8A5CF6'];
const wcColor = s => (WC_SUBJECT.find(([re]) => re.test(s || '')) || [null, '#6A78C9'])[1];
const wcEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wcTime = d => d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });

function weekCalendar(host, events, opts = {}) {
  let start = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();
  const days = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  function draw() {
    const ds = days(), end = new Date(start); end.setDate(end.getDate() + 7);
    const week = events.filter(e => e.start >= start && e.start < end);
    let h0 = 7, h1 = 20;
    week.forEach(e => { h0 = Math.min(h0, e.start.getHours()); h1 = Math.max(h1, Math.ceil((e.end.getHours() * 60 + e.end.getMinutes()) / 60)); });
    h1 = Math.min(24, Math.max(h1, h0 + 6));
    const H = 52, top = h => (h - h0) * H;
    const label = ds[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' – ' + ds[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const now = new Date();
    host.innerHTML = `<div class="wc-bar"><div class="wc-nav"><button type="button" data-wc="-1" aria-label="Previous week">‹</button><button type="button" data-wc="0">This week</button><button type="button" data-wc="1" aria-label="Next week">›</button></div>
        <h2 class="wc-title">${label}</h2><span class="meta">${week.length ? week.length + ' event' + (week.length === 1 ? '' : 's') + ' this week' : 'Nothing this week'}</span></div>
      ${opts.legend ? `<div class="wc-legend">${opts.legend.map(([n, c]) => `<span><i style="background:${c}"></i>${wcEsc(n)}</span>`).join('')}</div>` : ''}
      <div class="wc-scroll"><div class="wc-grid" style="--rows:${h1 - h0};--h:${H}px">
        <div class="wc-head wc-corner"></div>${ds.map(d => `<div class="wc-head ${same(d, now) ? 'today' : ''}"><span>${d.toLocaleDateString('en-GB', { weekday: 'short' })}</span><b>${d.getDate()}</b></div>`).join('')}
        <div class="wc-times">${Array.from({ length: h1 - h0 }, (_, i) => `<span style="top:${i * H}px">${((h0 + i) % 12) || 12}${h0 + i < 12 ? 'am' : 'pm'}</span>`).join('')}</div>
        ${ds.map(d => {
          const evs = week.filter(e => same(e.start, d)).sort((a, b) => a.start - b.start);
          const cols = []; evs.forEach(e => { let c = cols.findIndex(end => end <= e.start); if (c < 0) { c = cols.length; cols.push(e.end); } else cols[c] = e.end; e._col = c; });
          const n = Math.max(1, cols.length);
          const line = same(d, now) && now.getHours() >= h0 && now.getHours() < h1 ? `<div class="wc-now" style="top:${top(now.getHours() + now.getMinutes() / 60)}px"></div>` : '';
          return `<div class="wc-day ${same(d, now) ? 'today' : ''}">${line}${evs.map(e => {
            const y = top(e.start.getHours() + e.start.getMinutes() / 60), hgt = Math.max(26, ((e.end - e.start) / 36e5) * H - 3);
            return `<button type="button" class="wc-ev" data-ev="${events.indexOf(e)}" style="top:${y}px;height:${hgt}px;left:calc(${e._col * 100 / n}% + 2px);width:calc(${100 / n}% - 4px);--c:${e.color}">
              <b>${wcEsc(e.title)}</b><span>${wcTime(e.start)}${e.who ? ' · ' + wcEsc(e.who) : ''}</span></button>`; }).join('')}</div>`;
        }).join('')}
      </div></div>`;
    const sc = host.querySelector('.wc-scroll'); if (sc && week.length) { const first = Math.min(...week.map(e => e.start.getHours())); sc.scrollTop = Math.max(0, top(first) - 20); }
  }
  host.addEventListener('click', e => {
    const n = e.target.closest('[data-wc]');
    if (n) { const v = Number(n.dataset.wc); if (!v) { start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); } else start.setDate(start.getDate() + 7 * v); return draw(); }
    const b = e.target.closest('[data-ev]'); if (!b) return;
    const ev = events[Number(b.dataset.ev)];
    let d = document.getElementById('wc-dialog');
    if (!d) { d = document.createElement('dialog'); d.id = 'wc-dialog'; d.className = 'wc-dialog'; document.body.appendChild(d); d.addEventListener('click', x => { if (x.target === d || x.target.closest('[data-close]')) d.close(); }); }
    const soon = ev.start - Date.now() < 15 * 60e3 && ev.end > Date.now();
    d.innerHTML = `<div class="wc-d-top" style="--c:${ev.color}"><b>${wcEsc(ev.title)}</b><button type="button" class="link-btn" data-close aria-label="Close">✕</button></div>
      <p>🗓️ ${ev.start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}<br>🕒 ${wcTime(ev.start)} – ${wcTime(ev.end)}</p>
      ${ev.sub ? `<p class="meta">${wcEsc(ev.sub)}</p>` : ''}${ev.who ? `<p class="meta">👧 ${wcEsc(ev.who)}</p>` : ''}
      <div class="wc-d-btns">${ev.link ? `<a class="btn btn-red" href="${wcEsc(ev.link)}" target="_blank" rel="noopener">${soon ? '🔴 Join now' : 'Join link'}</a>` : ''}${ev.page ? `<a class="btn btn-white outline" href="${wcEsc(ev.page)}">Open course</a>` : ''}</div>`;
    d.showModal();
  });
  draw();
}
const wcSession = (s, extra) => Object.assign({ start: new Date(s.starts_at), end: s.ends_at ? new Date(s.ends_at) : new Date(new Date(s.starts_at).getTime() + 60 * 60e3),
  title: s.title, sub: s.courses ? s.courses.title : '', link: s.meeting_link, color: wcColor((s.courses && (s.courses.subject || s.courses.title)) || s.title) }, extra || {});

async function weekForStudent(host, uid) {
  const { data: en } = await db.from('enrollments').select('course_id').eq('user_id', uid);
  const ids = (en || []).map(e => e.course_id);
  const [{ data: ses }, { data: bk }] = await Promise.all([
    ids.length ? db.from('sessions').select('*, courses(title, subject)').in('course_id', ids) : Promise.resolve({ data: [] }),
    db.from('bookings').select('*, mentors(name, meeting_link)').eq('user_id', uid).in('status', ['booked', 'accepted'])
  ]);
  const ev = (ses || []).map(s => wcSession(s, { page: 'course.html?id=' + s.course_id }))
    .concat((bk || []).map(b => ({ start: new Date(b.starts_at), end: new Date(new Date(b.starts_at).getTime() + 30 * 60e3), title: 'Mentor: ' + (b.mentors ? b.mentors.name : ''), link: b.mentors && b.mentors.meeting_link, color: '#2FA08A', sub: 'Mentor session' })));
  weekCalendar(host, ev, { legend: [['Maths', '#3E4B94'], ['English', '#F27A6F'], ['Science', '#2FA08A'], ['Arabic', '#D4A017'], ['Other', '#6A78C9']] });
}
async function weekForTeacher(host, uid) {
  const { data: cs } = await db.from('courses').select('id').eq('teacher_id', uid);
  const ids = (cs || []).map(c => c.id);
  const { data: ses } = ids.length ? await db.from('sessions').select('*, courses(title, subject)').in('course_id', ids) : { data: [] };
  weekCalendar(host, (ses || []).map(s => wcSession(s, { page: 'teacher-course.html?id=' + s.course_id })), { legend: [['Maths', '#3E4B94'], ['English', '#F27A6F'], ['Science', '#2FA08A'], ['Arabic', '#D4A017'], ['Other', '#6A78C9']] });
}
async function startFamilyCalendar() {
  const { user } = await initParent();
  const host = document.getElementById('week-cal');
  const { data: links } = await db.from('parent_links').select('student_id').eq('parent_id', user.id);
  const kidIds = (links || []).map(l => l.student_id);
  if (!kidIds.length) { host.innerHTML = '<div class="empty-box"><p>Link your children to see their live classes here.</p><a class="btn btn-red" href="parent-dashboard.html">My children</a></div>'; return; }
  const [{ data: kids }, { data: en }] = await Promise.all([db.from('profiles').select('id, full_name').in('id', kidIds), db.from('enrollments').select('user_id, course_id').in('user_id', kidIds)]);
  const name = id => ((kids || []).find(k => k.id === id) || {}).full_name || 'My child', first = id => name(id).split(' ')[0];
  const colour = id => WC_KID[kidIds.indexOf(id) % WC_KID.length];
  const cids = [...new Set((en || []).map(e => e.course_id))];
  const { data: ses } = cids.length ? await db.from('sessions').select('*, courses(title, subject)').in('course_id', cids) : { data: [] };
  const ev = [];
  const seen = new Set();
  (ses || []).forEach(s => (en || []).filter(e => e.course_id === s.course_id && !seen.has(s.id + '-' + e.user_id) && seen.add(s.id + '-' + e.user_id)).forEach(e => ev.push(wcSession(s, { who: first(e.user_id), color: colour(e.user_id), page: 'child.html?id=' + e.user_id }))));
  weekCalendar(host, ev, { legend: kidIds.map(id => [first(id), colour(id)]) });
}
