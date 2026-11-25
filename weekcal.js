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
async function weekForTeacher(host, uid, opts = {}) {
  // live classes I teach
  const { data: cs } = await db.from('courses').select('id').eq('teacher_id', uid);
  const own = (cs || []).map(c => c.id);
  // workshops I joined (Beyond the Bell) and my mentor profile
  const [{ data: en }, { data: me }] = await Promise.all([db.from('enrollments').select('course_id').eq('user_id', uid), db.from('mentors').select('id').eq('teacher_id', uid).maybeSingle()]);
  const joined = (en || []).map(e => e.course_id).filter(id => !own.includes(id));
  const safe = p => Promise.resolve(p).then(r => r, () => ({ data: [] }));
  const [{ data: ses }, { data: jses }, { data: bk }, { data: rs }] = await Promise.all([
    own.length ? safe(db.from('sessions').select('*, courses(title, subject)').in('course_id', own)) : { data: [] },
    joined.length ? safe(db.from('sessions').select('*, courses(title, subject)').in('course_id', joined)) : { data: [] },
    me ? safe(db.from('bookings').select('*, profiles(full_name)').eq('mentor_id', me.id).in('status', ['booked', 'accepted'])) : { data: [] },
    safe(db.from('meetup_rsvps').select('meetup_id, cafe_meetups(id, title, starts_at, hub, meeting_link)').eq('user_id', uid))
  ]);
  // lessons opening for students (whole course, or per class on its own date)
  let les = [];
  if (own.length) {
    const { data: ls } = await safe(db.from('lessons').select('id, title, course_id, publish_at, courses(title)').in('course_id', own));
    const lmap = {}; (ls || []).forEach(l => lmap[l.id] = l);
    const { data: gd } = (ls || []).length ? await safe(db.from('lesson_group_dates').select('lesson_id, group_id, publish_at').in('lesson_id', (ls || []).map(l => l.id))) : { data: [] };
    const per = new Set((gd || []).map(r => r.lesson_id)), soon = new Date(Date.now() - 3600e3);
    const gids = [...new Set((gd || []).map(r => r.group_id))], slot = {};
    if (gids.length) { const { data: gs } = await safe(db.from('study_groups').select('id, slot').in('id', gids)); (gs || []).forEach(g => slot[g.id] = g.slot); }
    const mk = (l, at, cls) => { const st = new Date(at); return { start: st, end: new Date(st.getTime() + 30 * 60e3), title: '📘 ' + l.title, color: '#D4A017', sub: 'Lesson opens for ' + (cls || 'all students') + (l.courses ? ' · ' + l.courses.title : ''), page: 'teacher-course.html?id=' + l.course_id }; };
    (ls || []).forEach(l => { if (l.publish_at && !per.has(l.id) && new Date(l.publish_at) > soon) les.push(mk(l, l.publish_at)); });
    (gd || []).forEach(r => { const l = lmap[r.lesson_id]; if (l && r.publish_at && new Date(r.publish_at) > soon) les.push(mk(l, r.publish_at, slot[r.group_id] ? 'class ' + slot[r.group_id] : 'one class')); });
  }
  const ev = (ses || []).map(s => wcSession(s, { page: 'teacher-course.html?id=' + s.course_id }))
    .concat(les)
    .concat((jses || []).map(s => wcSession(s, { color: '#8A5CF6', sub: '🔔 My workshop: ' + (s.courses ? s.courses.title : ''), page: 'course.html?id=' + s.course_id })))
    .concat((bk || []).map(b => ({ start: new Date(b.starts_at), end: new Date(new Date(b.starts_at).getTime() + 30 * 60e3), title: 'Mentor session' + (b.profiles && b.profiles.full_name ? ': ' + b.profiles.full_name : ''), color: '#2FA08A', sub: 'Mentor session', page: 'teacher-requests.html' })))
    .concat((rs || []).map(r => r.cafe_meetups).filter(Boolean).map(m => ({ start: new Date(m.starts_at), end: new Date(new Date(m.starts_at).getTime() + 60 * 60e3), title: '☕ ' + m.title, color: '#F27A6F', sub: 'Café meetup', link: m.meeting_link, page: m.hub === 'parents' ? 'parent-connect.html#meetups' : 'teacher-connect.html#meetups' })));
  weekCalendar(host, ev, { legend: [['My live classes', '#3E4B94'], ['Lessons opening', '#D4A017'], ['My workshops', '#8A5CF6'], ['Mentor sessions', '#2FA08A'], ['Café meetups', '#F27A6F']] });
  if (opts.upcoming) {
    const next = ev.filter(e => e.end > new Date()).sort((a, b) => a.start - b.start).slice(0, 12);
    opts.upcoming.innerHTML = next.length ? next.map(e => `<div class="pending-row"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${e.color}"></span><div><b>${wcEsc(e.title)}</b><span class="meta">${e.start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${wcTime(e.start)}${e.sub ? ' · ' + wcEsc(e.sub) : ''}</span></div>${e.page ? `<a class="pill pill-soft" href="${wcEsc(e.page)}">Open</a>` : ''}</div>`).join('')
      : '<p class="empty">Nothing coming up. Add a live class from your course, or join a workshop in Beyond the Bell.</p>';
  }
}
// weekly class times written like "Sunday 6-8" or "Tue 4:30pm - 5:30pm" → one event a week
function wcWeekly(slotText, from, to) {
  const DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }, out = [];
  String(slotText || '').split(/\n|;|,(?=\s*[A-Za-z])/).forEach(line => {
    const m = /(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i.exec(line);
    if (!m) return;
    let h1 = +m[2], m1 = +(m[3] || 0), h2 = +m[5], m2 = +(m[6] || 0);
    const p1 = (m[4] || m[7] || '').toLowerCase(), p2 = (m[7] || '').toLowerCase();
    if (p1 === 'pm' && h1 < 12) h1 += 12; else if (!p1 && h1 >= 1 && h1 <= 7) h1 += 12;
    if (p2 === 'pm' && h2 < 12) h2 += 12; else if (p2 === 'am' && h2 === 12) h2 = 0; else if (!p2 && h2 * 60 + m2 <= h1 * 60 + m1 && h2 < 12) h2 += 12;
    const d = new Date(from); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((DAYS[m[1].toLowerCase().slice(0, 3)] - d.getDay() + 7) % 7));
    for (; d <= to; d.setDate(d.getDate() + 7)) {
      const st = new Date(d); st.setHours(h1, m1, 0, 0); const en = new Date(d); en.setHours(h2, m2, 0, 0);
      out.push([st, en > st ? en : new Date(st.getTime() + 60 * 60e3), line.trim()]);
    }
  });
  return out;
}
async function startFamilyCalendar() {
  const { user, me } = await initParent();
  const host = document.getElementById('week-cal');
  const { data: links } = await db.from('parent_links').select('student_id').eq('parent_id', user.id);
  const kidIds = (links || []).map(l => l.student_id);
  const { data: kids } = kidIds.length ? await db.from('profiles').select('id, full_name').in('id', kidIds) : { data: [] };
  const name = id => id === user.id ? 'Me' : (((kids || []).find(k => k.id === id) || {}).full_name || 'My child').split(' ')[0];
  const ME = '#C0694A', colour = id => id === user.id ? ME : WC_KID[kidIds.indexOf(id) % WC_KID.length];
  const page = (who, cid) => cid ? (who === user.id ? 'course.html?id=' + cid : 'child.html?id=' + who) : '';
  const ev = [];
  const { data: items, error } = await db.rpc('family_calendar_items');
  if (error) {
    // the database update hasn't been run yet: show the children's live classes the old way
    const { data: en } = kidIds.length ? await db.from('enrollments').select('user_id, course_id').in('user_id', kidIds) : { data: [] };
    const cids = [...new Set((en || []).map(e => e.course_id))];
    const { data: ses } = cids.length ? await db.from('sessions').select('*, courses(title, subject)').in('course_id', cids) : { data: [] };
    (ses || []).forEach(s => (en || []).filter(e => e.course_id === s.course_id).forEach(e => ev.push(wcSession(s, { who: name(e.user_id), color: colour(e.user_id), page: page(e.user_id, s.course_id) }))));
  } else {
    const from = new Date(Date.now() - 120 * 864e5), to = new Date(Date.now() + 240 * 864e5);
    (items || []).forEach(it => {
      const base = { who: name(it.who), color: colour(it.who), link: it.link, page: page(it.who, it.course_id) };
      if (it.kind === 'weekly') {
        const f = it.course_start && new Date(it.course_start) > from ? new Date(it.course_start) : from, t = it.course_end && new Date(it.course_end + 'T23:59') < to ? new Date(it.course_end + 'T23:59') : to;
        wcWeekly(it.slot, f, t).forEach(([st, en, line]) => ev.push(Object.assign({}, base, { start: st, end: en, title: it.title, sub: it.sub + ' · every week: ' + line })));
      } else {
        const st = new Date(it.starts_at);
        ev.push(Object.assign({}, base, { start: st, end: it.ends_at ? new Date(it.ends_at) : new Date(st.getTime() + 60 * 60e3), title: it.title, sub: it.sub || '' }));
      }
    });
  }
  if (!ev.length && !kidIds.length) { host.innerHTML = '<div class="empty-box"><p>Your workshops and your children’s classes will show here. Add your child, or join a parent workshop to get started.</p><a class="btn btn-red" href="add-child.html">Add a child</a> <a class="btn btn-white outline" href="parent-hub.html">Parent workshops</a></div>'; return; }
  weekCalendar(host, ev, { legend: [['Me (my workshops)', ME]].concat(kidIds.map(id => [name(id), colour(id)])) });
}
