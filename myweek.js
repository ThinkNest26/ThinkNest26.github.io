// ===== Think Nest for Schools: my weekly calendar (leaders) =====
const MW_E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mwIso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const mwMonday = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const MW_KIND = { meeting: ['🤝', 'Meeting'], event: ['🎉', 'Event'], deadline: ['⏰', 'Deadline'], observation: ['👀', 'Planned observation'], other: ['📌', 'Other'] };

async function startMyWeek() {
  const { user } = await initTeacher();
  const box = document.getElementById('mw');
  const { data: scs } = await db.rpc('my_schools');
  const S = (scs || []).find(s => !['student', 'parent', 'teacher', 'inclusion_team'].includes(s.my_role));
  if (!S) { box.innerHTML = '<div class="empty-box"><p>🗓️ My weekly calendar is for school leaders.</p></div>'; return; }
  document.documentElement.style.setProperty('--school', S.color_primary || '#3E4B94'); document.documentElement.style.setProperty('--school2', S.color_accent || '#F27A6F');
  let mon = mwMonday(sessionStorage.getItem('tn_mw') ? new Date(sessionStorage.getItem('tn_mw') + 'T12:00:00') : new Date());
  const safe = p => Promise.resolve(p).then(r => r, () => ({ data: null }));

  async function draw() {
    sessionStorage.setItem('tn_mw', mwIso(mon));
    const days = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(d.getDate() + i); return d; }), from = mwIso(days[0]), to = mwIso(days[6]), today = mwIso(new Date());
    box.innerHTML = '<p class="empty">Loading…</p>';
    const [{ data: ev, error: ee }, { data: obs }, { data: cyc }, { data: ppl }, wpR, rcR] = await Promise.all([
      safe(db.from('calendar_events').select('*').eq('owner_id', user.id).gte('starts_on', from).lte('starts_on', to).order('start_time', { ascending: true, nullsFirst: true })),
      safe(db.from('observations').select('id, observed_on, teacher_id, class_name, subject, status').eq('observer_id', user.id).gte('observed_on', from).lte('observed_on', to)),
      safe(db.from('report_cycles').select('id, title, deadline').eq('school_id', S.id).gte('deadline', from).lte('deadline', to)),
      safe(db.rpc('school_people', { sid: S.id })),
      safe(db.from('weekly_plans').select('id', { count: 'exact', head: true }).eq('school_id', S.id).eq('status', 'review')),
      safe(db.from('report_cards').select('id', { count: 'exact', head: true }).eq('status', 'submitted'))]);
    if (ee && /calendar_events/.test(ee.message || '')) { box.innerHTML = '<p class="note">My weekly calendar needs database update 75. Please run it in Supabase.</p>'; return; }
    const nameOf = id => ((ppl || []).find(p => p.user_id === id) || {}).full_name || 'a teacher';
    const items = d => {
      const iso = mwIso(d), L = [];
      (ev || []).filter(e => e.starts_on === iso).forEach(e => L.push(`<button type="button" class="mw-item k-${e.kind}" data-ev="${e.id}"><span>${MW_KIND[e.kind][0]}</span><div>${e.start_time ? `<small>${e.start_time.slice(0, 5)}${e.end_time ? '–' + e.end_time.slice(0, 5) : ''}</small>` : ''}<b>${MW_E(e.title)}</b></div></button>`));
      (obs || []).filter(o => o.observed_on === iso).forEach(o => L.push(`<a class="mw-item k-obs" href="observe.html?o=${o.id}"><span>👀</span><div><small>Observed${o.status === 'shared' ? ' · shared' : ' · draft'}</small><b>${MW_E(nameOf(o.teacher_id))}</b>${o.class_name ? `<small>${MW_E(o.class_name)}${o.subject ? ' · ' + MW_E(o.subject) : ''}</small>` : ''}</div></a>`));
      (cyc || []).filter(c => c.deadline === iso).forEach(c => L.push(`<a class="mw-item k-deadline" href="school.html#reports"><span>📝</span><div><small>Report deadline</small><b>${MW_E(c.title)}</b></div></a>`));
      return L.join('') || '<span class="mw-none">–</span>';
    };
    const wp = (wpR && wpR.count) || 0, rc = (rcR && rcR.count) || 0;
    box.innerHTML = `<div class="page-head"><h1 class="title">🗓️ My weekly calendar</h1></div>
      <div class="mw-bar"><button type="button" class="pill pill-soft" id="mw-prev" aria-label="Previous week">‹</button>
        <b>${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
        <button type="button" class="pill pill-soft" id="mw-next" aria-label="Next week">›</button><button type="button" class="link-btn" id="mw-today">This week</button>
        <button type="button" class="btn btn-red" id="mw-add">➕ Add to my calendar</button></div>
      ${wp || rc ? `<section class="mw-todo"><b>📋 Waiting for your review</b>${wp ? `<a href="planner.html?mode=weeks&all=1">📅 ${wp} weekly plan${wp === 1 ? '' : 's'}</a>` : ''}${rc ? `<a href="school.html#reports">📝 ${rc} report card${rc === 1 ? '' : 's'}</a>` : ''}</section>` : ''}
      <div class="mw-grid">${days.map(d => `<section class="mw-day ${mwIso(d) === today ? 'today' : ''} ${d.getDay() === 0 || d.getDay() === 6 ? 'wkend' : ''}">
        <header><b>${d.toLocaleDateString('en-GB', { weekday: 'long' })}</b><span>${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></header>
        <div class="mw-list">${items(d)}</div><button type="button" class="mw-plus" data-add="${mwIso(d)}" aria-label="Add on ${d.toLocaleDateString('en-GB', { weekday: 'long' })}">+</button></section>`).join('')}</div>
      <dialog class="mw-dlg" id="mw-dlg"><form method="dialog" id="mw-f"><h2 id="mw-h">➕ Add to my calendar</h2>
        <label>Title <input name="title" required maxlength="160" placeholder="e.g. Grade 4 team meeting"></label>
        <div class="mw-two"><label>Type <select name="kind">${Object.entries(MW_KIND).map(([k, [ic, l]]) => `<option value="${k}">${ic} ${l}</option>`).join('')}</select></label><label>Date <input type="date" name="starts_on" required></label></div>
        <div class="mw-two"><label>From <input type="time" name="start_time"></label><label>To <input type="time" name="end_time"></label></div>
        <label>Notes <textarea name="notes" rows="3" maxlength="2000"></textarea></label>
        <div class="ca-bar"><button type="button" class="link-btn danger" id="mw-del" hidden>Delete</button><span></span><button type="button" class="btn btn-white outline" id="mw-cancel">Cancel</button><button class="btn btn-red" id="mw-save">Save</button></div></form></dialog>`;
    const dlg = document.getElementById('mw-dlg'), f = document.getElementById('mw-f'); let editing = null;
    const open = (ev2, date) => {
      editing = ev2 || null; f.reset();
      document.getElementById('mw-h').textContent = editing ? '✏️ Edit' : '➕ Add to my calendar'; document.getElementById('mw-del').hidden = !editing;
      f.title.value = editing ? editing.title : ''; f.kind.value = editing ? editing.kind : 'meeting'; f.starts_on.value = editing ? editing.starts_on : (date || today);
      f.start_time.value = editing && editing.start_time ? editing.start_time.slice(0, 5) : ''; f.end_time.value = editing && editing.end_time ? editing.end_time.slice(0, 5) : ''; f.notes.value = editing ? editing.notes || '' : '';
      dlg.showModal(); setTimeout(() => f.title.focus(), 50);
    };
    document.getElementById('mw-prev').onclick = () => { mon.setDate(mon.getDate() - 7); draw(); };
    document.getElementById('mw-next').onclick = () => { mon.setDate(mon.getDate() + 7); draw(); };
    document.getElementById('mw-today').onclick = () => { mon = mwMonday(new Date()); draw(); };
    document.getElementById('mw-add').onclick = () => open(null, mwIso(days[0]) <= today && today <= mwIso(days[6]) ? today : mwIso(days[0]));
    box.querySelectorAll('[data-add]').forEach(b => b.onclick = () => open(null, b.dataset.add));
    box.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => open((ev || []).find(e => String(e.id) === b.dataset.ev)));
    document.getElementById('mw-cancel').onclick = () => dlg.close();
    document.getElementById('mw-del').onclick = async () => { if (!editing || !confirm('Delete this from your calendar?')) return; const { error } = await db.from('calendar_events').delete().eq('id', editing.id); if (error) return say(friendly(error)); dlg.close(); draw(); };
    f.onsubmit = async e => {
      e.preventDefault(); if (!f.title.value.trim() || !f.starts_on.value) return;
      const row = { title: f.title.value.trim(), kind: f.kind.value, starts_on: f.starts_on.value, start_time: f.start_time.value || null, end_time: f.end_time.value || null, notes: f.notes.value.trim() || null };
      const { error } = editing ? await db.from('calendar_events').update(row).eq('id', editing.id) : await db.from('calendar_events').insert(Object.assign({ school_id: S.id, owner_id: user.id }, row));
      if (error) return say(friendly(error)); dlg.close(); say(editing ? '✓ Saved.' : '🗓️ Added to your calendar.'); draw();
    };
  }
  draw();
}
