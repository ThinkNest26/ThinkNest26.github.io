// ===== Think Nest: My resources (teachers) and resources sent to students =====
// Uses db, say(), friendly(), esc() from app.js
const TR_BUCKET = 'teacher-resources';
const trIcon = r => r.kind === 'video' ? '🎬' : r.kind === 'link' ? '🔗' : /\.pdf$/i.test(r.file_name || '') ? '📕' : /\.(png|jpe?g|gif|webp|heic)$/i.test(r.file_name || '') ? '🖼️' : /\.(docx?|pages)$/i.test(r.file_name || '') ? '📄' : /\.(pptx?|key)$/i.test(r.file_name || '') ? '📊' : '📁';
async function trOpen(r) {
  if (r.url) { window.open(r.url, '_blank', 'noopener'); return; }
  if (!r.file_path) return;
  const { data, error } = await db.storage.from(TR_BUCKET).createSignedUrl(r.file_path, 600);
  if (error) return say(friendly(error));
  window.open(data.signedUrl, '_blank', 'noopener');
}
const trNeedsUpdate = e => /teacher_resources|resource_shares|relation|does not exist|schema cache/i.test((e && e.message) || '');

// ---------- Teachers: the library page ----------
async function startTeacherResources() {
  const { user } = await initTeacher();
  const uid = user.id;
  const box = document.getElementById('tr-page');
  const params = new URLSearchParams(location.search);
  const preStudents = (params.get('students') || '').split(',').filter(Boolean);
  let res = [], shares = [], students = [];

  // my students, by class (course + class time)
  const { data: cs } = await db.from('courses').select('id, title').eq('teacher_id', uid);
  const cById = {}; (cs || []).forEach(c => cById[c.id] = c);
  if ((cs || []).length) {
    const { data: en } = await db.from('enrollments').select('user_id, course_id, time_slot, student_name, profiles(full_name)').in('course_id', cs.map(c => c.id));
    const seen = new Map();
    (en || []).forEach(e => { const k = e.user_id + '|' + e.course_id; if (!seen.has(k)) seen.set(k, { id: e.user_id, name: e.student_name || (e.profiles && e.profiles.full_name) || 'Student', course_id: e.course_id, cls: cById[e.course_id].title + (e.time_slot ? ' · ' + e.time_slot : '') }); });
    students = [...seen.values()].sort((a, b) => a.cls.localeCompare(b.cls) || a.name.localeCompare(b.name));
  }

  async function load() {
    const [r, s] = await Promise.all([
      db.from('teacher_resources').select('*').eq('owner_id', uid).order('created_at', { ascending: false }),
      db.from('resource_shares').select('id, resource_id, student_id, parents_see, created_at').eq('sent_by', uid)]);
    if (r.error) { box.innerHTML = `<div class="empty-box"><p>${trNeedsUpdate(r.error) ? 'My resources needs the latest Supabase update (step_c_my_resources.sql).' : esc(friendly(r.error))}</p></div>`; return false; }
    res = r.data || []; shares = s.data || []; draw(); return true;
  }
  function draw() {
    const q = (document.getElementById('tr-q') || {}).value || '';
    const t = q.trim().toLowerCase();
    const list = res.filter(r => !t || [r.title, r.subject, r.grade, r.notes, r.file_name].join(' ').toLowerCase().includes(t));
    document.getElementById('tr-list').innerHTML = list.length ? list.map(r => { const n = shares.filter(s => s.resource_id === r.id).length;
      return `<div class="tr-row" data-r="${r.id}"><span class="tr-ic" aria-hidden="true">${trIcon(r)}</span>
        <div class="tr-info"><b>${esc(r.title)}</b><span class="meta">${esc([r.subject, r.grade, new Date(r.created_at).toLocaleDateString('en-GB')].filter(Boolean).join(' · '))}${n ? ' · sent to ' + n + ' student' + (n === 1 ? '' : 's') : ''}</span>${r.notes ? `<span class="meta">${esc(r.notes)}</span>` : ''}</div>
        <div class="tr-acts"><button type="button" class="pill pill-soft" data-open>Open</button><button type="button" class="pill pill-live" data-send>📤 Send to students</button><button type="button" class="link-btn" data-del>Delete</button></div></div>`; }).join('')
      : `<div class="empty-box"><p>${res.length ? 'No resources match your search.' : 'Your library is empty. Add worksheets, videos and links once, then reuse them and send them to students.'}</p></div>`;
  }

  box.innerHTML = `${preStudents.length ? `<p class="note big-note">📤 You chose ${preStudents.length} student${preStudents.length === 1 ? '' : 's'} in My classes. Press <b>Send to students</b> on a resource below, or add a new one first.</p>` : ''}
    <div class="tr-head"><input type="search" id="tr-q" placeholder="Search your resources" class="cx-search"><button type="button" class="btn btn-red" id="tr-new">+ Add a resource</button></div>
    <form class="panel auth-form" id="tr-form" hidden style="display:grid;gap:12px">
      <label>Title <input name="title" maxlength="200" required placeholder="For example, Sound worksheet (easier)"></label>
      <fieldset style="border:0;padding:0;margin:0;display:flex;gap:18px;flex-wrap:wrap"><legend style="font-weight:700;margin-bottom:6px">What is it?</legend>
        <label><input type="radio" name="kind" value="file" checked> A file (PDF, Word, slides, picture)</label><label><input type="radio" name="kind" value="link"> A link</label><label><input type="radio" name="kind" value="video"> A video link</label></fieldset>
      <label class="tr-file">File (up to 20 MB) <input type="file" name="file"></label>
      <label class="tr-url" hidden>Link <input type="url" name="url" placeholder="https://…"></label>
      <div class="two"><label>Subject (optional) <input name="subject" maxlength="60" placeholder="For example, Science"></label><label>Grade or year (optional) <input name="grade" maxlength="40" placeholder="For example, Grade 3"></label></div>
      <label>Notes for you (optional) <input name="notes" maxlength="300" placeholder="For example, easier version for extra support"></label>
      <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" id="tr-cancel">Cancel</button><button class="btn btn-red auth-btn">Save to My resources</button></div></form>
    <section class="panel tr-list" id="tr-list"><p class="empty">Loading…</p></section>`;
  const f = document.getElementById('tr-form');
  document.getElementById('tr-new').onclick = () => { f.hidden = false; f.title.focus(); };
  document.getElementById('tr-cancel').onclick = () => { f.reset(); f.hidden = true; };
  f.addEventListener('change', e => { if (e.target.name === 'kind') { const file = e.target.value === 'file'; f.querySelector('.tr-file').hidden = !file; f.querySelector('.tr-url').hidden = file; } });
  document.getElementById('tr-q').addEventListener('input', draw);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const kind = f.kind.value, title = f.title.value.trim(); if (!title) return say('Give it a title.');
    const row = { title, kind, subject: f.subject.value.trim() || null, grade: f.grade.value.trim() || null, notes: f.notes.value.trim() || null };
    const b = f.querySelector('.btn-red'); b.disabled = true; b.textContent = 'Saving…';
    try {
      if (kind === 'file') {
        const file = f.file.files[0]; if (!file) throw new Error('Choose a file to upload.');
        if (file.size > 20 * 1024 * 1024) throw new Error('Please choose a file smaller than 20 MB.');
        const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
        const up = await db.storage.from(TR_BUCKET).upload(path, file, { contentType: file.type || undefined });
        if (up.error) throw up.error;
        row.file_path = path; row.file_name = file.name;
      } else {
        const u = f.url.value.trim(); if (!/^https?:\/\//i.test(u)) throw new Error('Paste a full link, starting with https://');
        row.url = u;
      }
      const { error } = await db.from('teacher_resources').insert(row);
      if (error) throw error;
      f.reset(); f.hidden = true; say('Saved to My resources.'); load();
    } catch (x) { say(trNeedsUpdate(x) || /bucket/i.test(x.message || '') ? 'My resources needs the latest Supabase update (step_c_my_resources.sql).' : (x.message || friendly(x))); }
    b.disabled = false; b.textContent = 'Save to My resources';
  });
  document.getElementById('tr-list').addEventListener('click', async e => {
    const row = e.target.closest('[data-r]'); if (!row) return;
    const r = res.find(x => x.id === Number(row.dataset.r)); if (!r) return;
    if (e.target.closest('[data-open]')) return trOpen(r);
    if (e.target.closest('[data-send]')) return sendDialog(r);
    if (e.target.closest('[data-del]')) {
      if (!confirm(`Delete “${r.title}”? Students you sent it to won’t see it any more.`)) return;
      if (r.file_path) await db.storage.from(TR_BUCKET).remove([r.file_path]);
      const { error } = await db.from('teacher_resources').delete().eq('id', r.id);
      if (error) return say(friendly(error)); say('Deleted.'); load();
    }
  });

  function sendDialog(r) {
    let d = document.getElementById('tr-send');
    if (!d) { d = document.createElement('dialog'); d.id = 'tr-send'; d.className = 'dlg'; document.body.appendChild(d); }
    const already = new Set(shares.filter(s => s.resource_id === r.id).map(s => s.student_id));
    const classes = [...new Set(students.map(s => s.cls))];
    d.innerHTML = `<form class="auth-form" style="padding:22px;display:grid;gap:12px;min-width:min(560px,92vw);max-height:86vh;overflow:auto">
      <h2 style="margin:0">📤 Send “${esc(r.title)}”</h2>
      ${students.length ? `<label>Show students from <select name="cls"><option value="">All my classes</option>${classes.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
      <div class="tr-pick" style="display:grid;gap:6px;max-height:260px;overflow:auto;border:1px solid #E3E6F0;border-radius:12px;padding:10px 12px">
        ${students.map(s => `<label data-cls="${esc(s.cls)}" style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-sid="${s.id}" data-cid="${s.course_id}" ${preStudents.includes(s.id) && !already.has(s.id) ? 'checked' : ''} ${already.has(s.id) ? 'disabled' : ''}> <span>${esc(s.name)}<span class="meta" style="display:block">${esc(s.cls)}${already.has(s.id) ? ' · already sent' : ''}</span></span></label>`).join('')}</div>
      <button type="button" class="link-btn" data-all style="justify-self:start">Tick everyone shown</button>
      <fieldset style="border:0;padding:0;margin:0;display:grid;gap:6px"><legend style="font-weight:700;margin-bottom:6px">Who can see it?</legend>
        <label><input type="radio" name="who" value="students" checked> Only the students I choose</label>
        <label><input type="radio" name="who" value="parents"> The students and their parents</label></fieldset>
      <label>Message (optional) <textarea name="msg" rows="2" maxlength="600" placeholder="For example, Try this easier worksheet before Wednesday’s class"></textarea></label>
      <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-x>Cancel</button><button class="btn btn-red auth-btn">Send</button></div>`
      : `<p class="empty">You don’t have any students yet. Students appear here once you confirm their place on one of your courses.</p><button type="button" class="btn btn-white outline" data-x>Close</button>`}</form>`;
    const sf = d.querySelector('form');
    d.querySelector('[data-x]').onclick = () => d.close();
    if (sf.cls) {
      const filt = () => d.querySelectorAll('[data-cls]').forEach(l => { l.hidden = !!sf.cls.value && l.dataset.cls !== sf.cls.value; });
      sf.cls.onchange = filt;
      d.querySelector('[data-all]').onclick = () => d.querySelectorAll('[data-cls]').forEach(l => { const c = l.querySelector('input'); if (!l.hidden && !c.disabled) c.checked = true; });
      sf.onsubmit = async e => {
        e.preventDefault();
        const picked = [...d.querySelectorAll('[data-sid]:checked')];
        if (!picked.length) return say('Tick at least one student.');
        const parents = sf.who.value === 'parents', msg = sf.msg.value.trim() || null;
        const rows = [...new Map(picked.map(c => [c.dataset.sid, { resource_id: r.id, student_id: c.dataset.sid, course_id: Number(c.dataset.cid) || null, parents_see: parents, message: msg }])).values()];
        const b = sf.querySelector('.btn-red'); b.disabled = true; b.textContent = 'Sending…';
        const { error } = await db.from('resource_shares').insert(rows);
        b.disabled = false; b.textContent = 'Send';
        if (error) return say(/duplicate/i.test(error.message || '') ? 'Some of these students already have it.' : friendly(error));
        d.close(); say(`Sent to ${rows.length} student${rows.length === 1 ? '' : 's'}${parents ? ' and their parents' : ''}. They’ve been told.`); load();
      };
    }
    d.showModal();
  }
  load();
}

// ---------- Students and parents: "From my teachers" ----------
async function tnSharedResources(host, studentId, forParent) {
  if (!host) return;
  const { data, error } = await db.from('resource_shares').select('id, message, created_at, parents_see, teacher_resources(*)').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) { host.hidden = true; return; }
  const rows = (data || []).filter(s => s.teacher_resources);
  host.hidden = !rows.length && forParent;
  host.innerHTML = `<h2 class="dash-h" style="margin-top:0">📚 ${forParent ? 'Extra resources from teachers' : 'From my teachers'}</h2>` + (rows.length
    ? rows.map(s => { const r = s.teacher_resources; return `<div class="tr-row"><span class="tr-ic" aria-hidden="true">${trIcon(r)}</span><div class="tr-info"><b>${esc(r.title)}</b><span class="meta">Sent ${new Date(s.created_at).toLocaleDateString('en-GB')}</span>${s.message ? `<span class="meta">💬 ${esc(s.message)}</span>` : ''}</div><div class="tr-acts"><button type="button" class="pill pill-live" data-tr-open="${r.id}">Open</button></div></div>`; }).join('')
    : '<p class="empty">Nothing yet. When a teacher sends you extra resources, they appear here.</p>');
  host.onclick = e => { const b = e.target.closest('[data-tr-open]'); if (!b) return; const s = rows.find(x => x.teacher_resources.id === Number(b.dataset.trOpen)); if (s) trOpen(s.teacher_resources); };
  if (location.hash === '#' + host.id) setTimeout(() => host.scrollIntoView({ behavior: 'smooth' }), 300);
}
