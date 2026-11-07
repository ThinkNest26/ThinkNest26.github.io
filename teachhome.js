// ===== Think Nest for Schools: the school teacher's home =====
const TH_E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const thIso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const thMonday = () => { const x = new Date(); x.setHours(12); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return thIso(x); };
const TH_PLAN = { draft: ['draft', '✏️ Draft'], review: ['rev', '⏳ In review'], returned: ['ret', '↩ Returned'], approved: ['ok', '✅ Approved'] };

async function startTeacherHome() {
  const { user, profile } = await initTeacher();
  const box = document.getElementById('th');
  const { data: scs } = await db.rpc('my_schools');
  const S = (scs || []).find(s => !['student', 'parent'].includes(s.my_role));
  if (!S) { location.replace('teacher-dashboard.html'); return; }
  document.documentElement.style.setProperty('--school', S.color_primary || '#3E4B94'); document.documentElement.style.setProperty('--school2', S.color_accent || '#F27A6F');
  const sid = S.id, today = thIso(new Date()), monday = thMonday();
  const safe = p => p.then(r => r, () => ({ data: null }));
  const [{ data: att }, { data: pc }, { data: ann }, { data: obs }, { data: wb }] = await Promise.all([
    safe(db.rpc('school_attendance', { sid, aday: today })), safe(db.rpc('planning_classes', { sid })), safe(db.rpc('my_announcements')),
    safe(db.from('observations').select('id, observed_on, kind, read_at').eq('teacher_id', user.id).eq('status', 'shared').order('observed_on', { ascending: false }).limit(5)),
    safe(db.rpc('wellbeing_overview', { sid, gid: null }))]);
  const mine = (pc || []).filter(c => c.mine), ids = mine.map(c => c.id);
  const attOf = id => ((att && att.classes) || []).find(c => c.id === id) || {};
  const [{ data: wps }, cyRes] = await Promise.all([
    ids.length ? safe(db.from('weekly_plans').select('id, group_id, status, stage').eq('week_start', monday).in('group_id', ids)) : Promise.resolve({ data: [] }),
    ids.length ? safe(db.rpc('my_report_cycles', { gid: ids[0] })) : Promise.resolve({ data: [] })]);
  const cycle = ((cyRes && cyRes.data) || []).find(c => c.status === 'open');
  let cards = [];
  if (cycle && ids.length) { const { data } = await safe(db.from('report_cards').select('group_id, status').eq('cycle_id', cycle.id).in('group_id', ids)); cards = data || []; }
  const unreadAnn = (ann || []).filter(a => !a.is_read), newObs = (obs || []).filter(o => !o.read_at), checkIns = ((wb && wb.attention) || []);
  const first = String(profile.full_name || '').split(' ')[0] || 'there';
  const hour = new Date().getHours(), hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const regDone = mine.filter(c => attOf(c.id).taken).length;
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  box.innerHTML = `<section class="th-hero"><div><p class="th-hello">${hello}, ${TH_E(first)} 👋</p><h1>${TH_E(profile.full_name || '')}</h1><p>Teacher at <b>${TH_E(S.name)}</b> · ${TH_E(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))}</p></div>
      <div class="th-quick"><a class="th-q" href="classes.html?new=1">➕ New class</a><a class="th-q" href="planner.html" data-weeks>📅 Weekly plans</a><a class="th-q" href="school.html#dashboard">📊 My data</a></div></section>
    ${(unreadAnn.length || newObs.length || checkIns.length || cycle) ? `<section class="th-alerts">
      ${unreadAnn.length ? `<a class="th-al" href="announcements.html#a${unreadAnn[0].id}"><span>📣</span><div><b>${unreadAnn.length} new announcement${unreadAnn.length === 1 ? '' : 's'}</b><small>${TH_E(unreadAnn[0].title)}</small></div></a>` : ''}
      ${newObs.length ? `<a class="th-al" href="observe.html?o=${newObs[0].id}"><span>👀</span><div><b>New observation feedback</b><small>${fmt(newObs[0].observed_on)} · read and comment</small></div></a>` : ''}
      ${checkIns.length ? `<a class="th-al warm" href="wellbeing.html"><span>💛</span><div><b>${checkIns.length} student${checkIns.length === 1 ? '' : 's'} to check in with</b><small>${TH_E(checkIns.map(c => c.name.split(' ')[0]).slice(0, 3).join(', '))}</small></div></a>` : ''}
      ${cycle ? `<a class="th-al" href="#th-reports"><span>📝</span><div><b>${TH_E(cycle.title)}</b><small>${cycle.deadline ? 'Deadline ' + fmt(cycle.deadline) : 'Reports are open'}</small></div></a>` : ''}</section>` : ''}
    ${mine.length ? `
    <section class="panel th-sec"><div class="th-head"><h2>📋 Today’s registers</h2><span class="meta">${regDone} of ${mine.length} taken</span></div>
      <div class="th-regs">${mine.map(c => { const a = attOf(c.id); return `<div class="th-reg ${a.taken ? 'done' : ''}"><b>${TH_E(c.name)}</b>
        <span>${a.taken ? `✅ Taken · ${a.present || 0} present${a.absent ? ` · ❌ ${a.absent} absent` : ''}${a.late ? ` · ⏰ ${a.late} late` : ''}` : `⏳ Not taken yet · ${a.students || 0} students`}</span>
        <button type="button" class="btn ${a.taken ? 'btn-white outline' : 'btn-red'}" data-reg="${c.id}" data-name="${TH_E(c.name)}">${a.taken ? 'Open' : 'Take register'}</button></div>`; }).join('')}</div></section>
    <div class="th-two">
      <section class="panel th-sec"><div class="th-head"><h2>🏫 My classes</h2><a class="link-btn" href="classes.html?new=1">➕ New class</a></div>
        <div class="th-classes">${mine.map(c => { const a = attOf(c.id); return `<div class="th-cls"><a class="th-cls-name" href="group.html?id=${c.id}">${TH_E(c.name)}</a><small>${TH_E(c.grade || '')} · ${a.students || 0} students</small>
          <div class="th-cls-links"><a href="group.html?id=${c.id}">💬 Class</a><a href="group.html?id=${c.id}#t-ins">📊 Insights</a><a href="group.html?id=${c.id}#t-mem">🔑 Logins</a></div></div>`; }).join('')}</div></section>
      <section class="panel th-sec"><div class="th-head"><h2>📅 This week’s plans</h2><a class="link-btn" href="planner.html" data-weeks>All weeks →</a></div>
        ${mine.map(c => { const w = (wps || []).find(x => x.group_id === c.id), st = w ? TH_PLAN[w.status] || TH_PLAN.draft : null;
          return `<div class="th-plan"><b>${TH_E(c.name)}</b>${st ? `<span class="rc-st ${st[0]}">${st[1]}</span>${w.stage ? `<small class="meta">${TH_E(w.stage)}</small>` : ''}<a class="pill pill-soft" href="planner.html?week=${w.id}">Open</a>`
            : `<span class="meta">Not started</span><a class="pill pill-soft" href="planner.html" data-weeks>➕ Start</a>`}</div>`; }).join('')}</section></div>
    ${cycle ? `<section class="panel th-sec" id="th-reports"><div class="th-head"><h2>📝 ${TH_E(cycle.title)}</h2><span class="meta">${cycle.deadline ? 'Deadline ' + fmt(cycle.deadline) : ''}</span></div>
      ${mine.map(c => { const cc = cards.filter(x => x.group_id === c.id), n = attOf(c.id).students || 0, cnt = s2 => cc.filter(x => x.status === s2).length, done = cc.filter(x => ['submitted', 'approved', 'published', 'ready'].includes(x.status)).length;
        return `<div class="th-plan"><b>${TH_E(c.name)}</b><div class="sc-bar th-bar"><i style="width:${n ? Math.round(100 * done / n) : 0}%"></i></div><small class="meta">${done} of ${n} finished${cnt('returned') ? ` · ↩ ${cnt('returned')} returned` : ''}${cnt('draft') ? ` · ✏️ ${cnt('draft')} draft` : ''}</small>
          <a class="pill pill-soft" href="group.html?id=${c.id}#t-rc">Write reports</a></div>`; }).join('')}</section>` : ''}`
    : `<section class="panel th-empty"><div class="th-empty-ic">🏫</div><h2>Create your first class</h2><p>Name your class, then choose your students from ${TH_E(S.name)}’s list and give them their logins.</p>
      <a class="btn btn-red" href="classes.html?new=1">➕ New class</a></section>`}`;
  box.querySelectorAll('[data-weeks]').forEach(a => a.addEventListener('click', () => sessionStorage.setItem('tn_pl_mode', 'weeks')));
  box.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => {
    if (typeof openAttendanceDialog !== 'function') { location.href = 'group.html?id=' + b.dataset.reg; return; }
    openAttendanceDialog({ gid: Number(b.dataset.reg), title: b.dataset.name });
    const d = document.getElementById('att-dialog'); if (d) d.addEventListener('close', () => startTeacherHome(), { once: true });
  });
}
