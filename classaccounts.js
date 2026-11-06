// ===== Think Nest: add students to a class (usernames + passwords), right on the class page =====
const CA_FN = 'quick-worker';   // the Edge Function "create-students"
const CA_A = ['Sunny', 'Happy', 'Brave', 'Lucky', 'Clever', 'Shiny', 'Jolly', 'Swift', 'Bright', 'Cosy', 'Calm', 'Super', 'Mighty', 'Gentle', 'Bold', 'Merry'];
const CA_B = ['Panda', 'Tiger', 'Rocket', 'Comet', 'Falcon', 'Koala', 'Dolphin', 'Planet', 'Maple', 'River', 'Pebble', 'Lion', 'Owl', 'Cactus', 'Mango', 'Penguin'];
const caE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const caRnd = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const caPw = () => CA_A[caRnd(CA_A.length)] + CA_B[caRnd(CA_B.length)] + String(caRnd(100)).padStart(2, '0');
function caUser(name) {
  const p = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  const first = (p[0] || 'student').replace(/[^a-z]/g, '').slice(0, 12) || 'student', last = p.length > 1 ? (p[p.length - 1].replace(/[^a-z]/g, '')[0] || '') : '';
  return first + (last ? '.' + last : '') + String(10 + caRnd(90));
}
function caNames(t) {
  return String(t || '').split(/\r?\n/).map(line => {
    const c = line.split(/[,;\t]/).map(x => x.replace(/^"|"$/g, '').trim()).filter(Boolean);
    return c.length >= 2 && !/\d/.test(c[1]) && c[1].length < 30 ? c[0] + ' ' + c[1] : (c[0] || '');
  }).map(n => n.replace(/\s+/g, ' ').trim()).filter(n => n.length >= 2 && !/^(name|names|student|first name|full name)$/i.test(n));
}
async function caCall(body) {
  const { data, error } = await db.functions.invoke(CA_FN, { body });
  if (error) { let m = error.message; try { const j = await error.context.json(); m = j.error || m; } catch (_) {} throw new Error(m); }
  if (data && data.error) throw new Error(data.error);
  return data;
}
function caPrint(list, place) {
  const w = window.open('', '_blank'); if (!w) return say('Please allow pop-ups to print the cards.');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Login cards – ${caE(place)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;margin:16px;color:#1D2026}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .card{border:2px dashed #9AA3D6;border-radius:14px;padding:14px 16px;break-inside:avoid;page-break-inside:avoid}
    .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.top b{color:#3E4B94;font-size:15px}.top span{font-size:11px;color:#6E7485}
    .name{font-size:18px;font-weight:bold;margin:2px 0 10px}.row{display:flex;justify-content:space-between;background:#F5F6FB;border-radius:8px;padding:7px 10px;margin:5px 0;font-size:14px}
    .row code{font-size:16px;font-weight:bold;letter-spacing:.5px}.site{font-size:12px;color:#6E7485;margin-top:8px}@media print{body{margin:6mm}}</style></head><body>
    <div class="grid">${list.map(r => `<div class="card"><div class="top"><b>🪺 Think Nest</b><span>${caE(place)}</span></div><div class="name">${caE(r.name)}</div>
      <div class="row">Username <code>${caE(r.username)}</code></div><div class="row">Password <code>${caE(r.password)}</code></div>
      <div class="site">Go to <b>thinknestonline.com</b> → Log in → Student. Keep your password secret! 🤫</div></div>`).join('')}</div>
    <script>setTimeout(function(){window.print()},400)<\/script></body></html>`);
  w.document.close();
}

async function caInit() {
  const gid = Number(new URLSearchParams(location.search).get('id')); if (!gid) return;
  const { data: { session } } = await db.auth.getSession(); if (!session) return;
  const [{ data: g }, { data: me }] = await Promise.all([db.from('study_groups').select('id, name, kind, owner_id, course_id').eq('id', gid).maybeSingle(), db.from('profiles').select('role').eq('id', session.user.id).maybeSingle()]);
  if (!g || g.kind !== 'class' || !(g.owner_id === session.user.id || (me && me.role === 'admin'))) return;
  // the button + panel
  const wait = () => document.querySelector('#ghead .ghead-actions');
  for (let i = 0; i < 30 && !wait(); i++) await new Promise(r => setTimeout(r, 150));
  const head = wait();
  if (head && !document.getElementById('ca-open')) head.insertAdjacentHTML('afterbegin', '<button type="button" class="pill pill-live big ca-open" id="ca-open">➕ Add students</button>');
  if (head && !document.getElementById('ca-del')) {
    head.insertAdjacentHTML('beforeend', '<button type="button" class="pill pill-soft big danger ca-del" id="ca-del">🗑️ Delete class</button>');
    document.getElementById('ca-del').addEventListener('click', async () => {
      if (!confirm('Delete the class “' + g.name + '”?\n\nThis removes its community posts, resources, chat, reports and member list for everyone. Students’ accounts are NOT deleted: they can still log in and be added to another class.')) return;
      const { error } = await db.rpc('delete_group', { gid });
      if (error) { alert('The class couldn’t be deleted:\n\n' + (error.message || error) + '\n\nPlease send a screenshot of this message to the Think Nest team.'); return; }
      say('Class deleted.'); location.href = 'classes.html';
    });
  }
  const panel = document.createElement('section'); panel.className = 'panel ca-panel'; panel.id = 'ca-panel'; panel.hidden = true;
  document.getElementById('ghead').after(panel);
  let rows = [];
  const step1 = () => {
    panel.innerHTML = `<div class="ca-top"><h2>➕ Add students to ${caE(g.name)}</h2><button type="button" class="link-btn" data-ca="close" aria-label="Close">✕</button></div>
      <ol class="ca-steps"><li class="on">1. Names</li><li>2. Check logins</li><li>3. Done</li></ol>
      <p class="meta">Type one name per line, or upload a list (CSV or text; from Excel use File → Save As → CSV).</p>
      <textarea id="ca-names" rows="8" placeholder="Zahra Nabil&#10;Omar Ali&#10;Lina Saad"></textarea>
      <div class="ca-bar"><label class="pill pill-soft ca-up">📄 Upload a list<input type="file" id="ca-file" accept=".csv,.txt" hidden></label><span class="meta" id="ca-count"></span>
        <button type="button" class="btn btn-red" data-ca="gen">Generate usernames and passwords →</button></div>`;
    const t = panel.querySelector('#ca-names'), cnt = () => { const n = caNames(t.value).length; panel.querySelector('#ca-count').textContent = n ? `${n} student${n === 1 ? '' : 's'}` : ''; };
    t.addEventListener('input', cnt); if (rows.length) { t.value = rows.map(r => r.name).join('\n'); cnt(); }
    panel.querySelector('#ca-file').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; const n = caNames(await f.text()); t.value = (t.value.trim() ? t.value.trim() + '\n' : '') + n.join('\n'); cnt(); say(`${n.length} names added.`); e.target.value = ''; });
  };
  const step2 = () => {
    panel.innerHTML = `<div class="ca-top"><h2>➕ Add students to ${caE(g.name)}</h2><button type="button" class="link-btn" data-ca="close" aria-label="Close">✕</button></div>
      <ol class="ca-steps"><li class="done">1. Names</li><li class="on">2. Check logins</li><li>3. Done</li></ol>
      <p class="meta">Check the list. You can change any username (lowercase letters, numbers and dots), or tap 🔄 for a new password.</p>
      <div class="in-scroll"><table class="ac-table"><thead><tr><th>Student</th><th>Username</th><th>Password</th><th></th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr data-i="${i}"><td>${caE(r.name)}</td><td><input class="ca-u" value="${caE(r.username)}" maxlength="24" aria-label="Username for ${caE(r.name)}"></td><td><code>${caE(r.password)}</code> <button type="button" class="link-btn" data-ca="pw" aria-label="New password">🔄</button></td><td><button type="button" class="link-btn" data-ca="del" aria-label="Remove">✕</button></td></tr>`).join('')}</tbody></table></div>
      <label class="agree-box ca-ok"><input type="checkbox" id="ca-ok"> <span>I confirm that my school and the students’ parents have agreed to these students having Think Nest accounts.</span></label>
      <p class="ca-err" id="ca-err" role="alert" hidden></p>
      <div class="ca-bar"><button type="button" class="link-btn" data-ca="back">‹ Back to names</button><span class="meta ca-next">Next: confirm to create the accounts. Then you can 🖨️ print login cards and ⬇ download the list.</span><button type="button" class="btn btn-red" data-ca="create">✅ Confirm and create ${rows.length} account${rows.length === 1 ? '' : 's'}</button></div>`;
    panel.querySelectorAll('.ca-u').forEach(inp => inp.addEventListener('input', () => { rows[Number(inp.closest('tr').dataset.i)].username = inp.value.toLowerCase().replace(/[^a-z0-9.]/g, ''); }));
  };
  const step3 = (done, bad) => {
    panel.innerHTML = `<div class="ca-top"><h2>🎉 ${done.length} student${done.length === 1 ? '' : 's'} added to ${caE(g.name)}</h2><button type="button" class="link-btn" data-ca="close" aria-label="Close">✕</button></div>
      <ol class="ca-steps"><li class="done">1. Names</li><li class="done">2. Check logins</li><li class="on">3. Done</li></ol>
      <p class="note">⚠️ <b>Passwords are shown only now.</b> Print the cards or download the list before closing.</p>
      ${bad.length ? `<p class="note">These couldn’t be created: ${bad.map(r => caE(r.name) + ' (' + caE(r.error) + ')').join(', ')}</p>` : ''}
      ${done.some(r => r.changed) ? '<p class="meta">Some usernames were already taken, so we picked a similar one.</p>' : ''}
      <div class="ca-bar"><button type="button" class="btn btn-red" data-ca="print">🖨️ Print login cards</button><button type="button" class="btn btn-white outline" data-ca="csv">⬇ Download CSV</button><button type="button" class="link-btn" data-ca="more">➕ Add more students</button></div>
      <div class="in-scroll"><table class="ac-table"><thead><tr><th>Student</th><th>Username</th><th>Password</th></tr></thead>
      <tbody>${done.map(r => `<tr><td>${caE(r.name)}</td><td><code>${caE(r.username)}</code></td><td><code>${caE(r.password)}</code></td></tr>`).join('')}</tbody></table></div>`;
    panel._done = done;
  };
  panel.addEventListener('click', async e => {
    const b = e.target.closest('[data-ca]'); if (!b) return;
    const a = b.dataset.ca;
    if (a === 'close') { panel.hidden = true; if (panel._done) location.reload(); return; }
    if (a === 'gen') {
      const names = caNames(panel.querySelector('#ca-names').value);
      if (!names.length) return say('Type or upload at least one name.');
      if (names.length > 60) return say('Please add up to 60 students at a time.');
      const used = new Set(); rows = names.map(n => { let u = caUser(n); while (used.has(u)) u = caUser(n); used.add(u); return { name: n, username: u, password: caPw() }; });
      return step2();
    }
    if (a === 'pw') { const i = Number(b.closest('tr').dataset.i); rows[i].password = caPw(); b.previousElementSibling.textContent = rows[i].password; return; }
    if (a === 'del') { rows.splice(Number(b.closest('tr').dataset.i), 1); return rows.length ? step2() : step1(); }
    if (a === 'back') return step1();
    if (a === 'create') {
      if (!panel.querySelector('#ca-ok').checked) return say('Please tick the box to confirm you have permission.');
      const bad = rows.filter(r => !/^[a-z][a-z0-9.]{2,24}$/.test(r.username));
      if (bad.length) return say(`Please fix the username for ${bad[0].name}: start with a letter, at least 3 characters, only letters, numbers and dots.`);
      b.disabled = true; b.textContent = `Creating ${rows.length} accounts…`;
      try {
        const res = await caCall({ students: rows, names: rows.map(r => r.name), group_id: gid });
        const list = res.results || []; step3(list.filter(r => r.username), list.filter(r => !r.username)); rows = []; caLogins();
      } catch (err) {
        b.disabled = false; b.textContent = '✅ Try again';
        const box = panel.querySelector('#ca-err'); const msg = err.message || 'Something went wrong. Please try again.';
        if (box) { box.hidden = false; box.innerHTML = '⚠️ The accounts couldn’t be created: <b>' + caE(msg) + '</b><br><small>If this keeps happening, send a screenshot of this message to the Think Nest team.</small>'; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        else say(msg);
      }
      return;
    }
    if (a === 'print') return caPrint(panel._done || [], g.name);
    if (a === 'csv') {
      const text = [['Student', 'Username', 'Password', 'Website']].concat((panel._done || []).map(r => [r.name, r.username, r.password, 'thinknestonline.com'])).map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const x = document.createElement('a'); x.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv' })); x.download = g.name.replace(/[^\w]+/g, '-').toLowerCase() + '-logins.csv'; document.body.appendChild(x); x.click(); x.remove(); return;
    }
    if (a === 'more') { panel._done = null; rows = []; return step1(); }
  });
  const open = () => { step1(); panel.hidden = false; panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => { const t = panel.querySelector('#ca-names'); if (t) t.focus(); }, 300); };
  document.getElementById('ca-open').addEventListener('click', open);
  if (/[?&]add=1/.test(location.search)) open();


  // ----- 📊 Insights tab (class teacher only)
  const tabs = document.querySelector('.tabs');
  if (tabs && !document.getElementById('tab-ins')) {
    tabs.insertAdjacentHTML('beforeend', '<button role="tab" aria-selected="false" data-tab="t-ins" id="tab-ins">📊 Insights</button>');
    const sec = document.createElement('section'); sec.id = 't-ins'; sec.className = 'tab-panel insights'; sec.hidden = true;
    document.getElementById('t-mem').after(sec);
    const drawIns = async () => {
      if (!g.course_id) {
        const { data: cs } = await db.from('courses').select('id, title').eq('teacher_id', session.user.id).order('title');
        sec.innerHTML = `<div class="panel ca-link"><h3>📘 Link a course to this class</h3>
          <p class="meta">Lessons, quizzes and activities live inside a course. Link one of your courses so your students can see its lessons, and so insights can show their progress. Everyone in the class is enrolled automatically.</p>
          ${(cs || []).length ? `<div class="ca-bar"><select id="ca-course">${cs.map(c => `<option value="${c.id}">${caE(c.title)}</option>`).join('')}</select><button type="button" class="btn btn-red" id="ca-link">Link course</button></div>`
            : '<a class="btn btn-red" href="teacher-courses.html">Create a course first</a>'}</div>`;
        const lb = document.getElementById('ca-link');
        if (lb) lb.onclick = async () => {
          lb.disabled = true;
          const cid = Number(document.getElementById('ca-course').value);
          const { data: n, error } = await db.rpc('link_class_course', { gid, cid });
          if (error) { lb.disabled = false; return say(typeof friendly === 'function' ? friendly(error) : error.message); }
          g.course_id = cid; say(`Course linked. ${n || 0} student${n === 1 ? '' : 's'} enrolled.`); drawIns();
        };
        return;
      }
      if (typeof inClassTab === 'function') inClassTab(sec, gid, g.course_id, g.name);
    };
    document.getElementById('tab-ins').addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.tab === 't-ins')));
      document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = p.id !== 't-ins'; });
      drawIns();
    });
    if (location.hash === '#t-ins') document.getElementById('tab-ins').click();
  }

  // ----- Student logins (in the Members tab)
  const memTab = document.getElementById('t-mem');
  const logins = document.createElement('div'); logins.className = 'panel ca-logins'; logins.id = 'ca-logins'; memTab.prepend(logins);
  async function caLogins() {
    const [{ data: mine }, { data: mem }] = await Promise.all([db.rpc('my_created_students'), db.rpc('group_member_list', { gid })]);
    const ids = new Set((mem || []).map(m => m.user_id)), list = (mine || []).filter(s => ids.has(s.id));
    logins.innerHTML = `<h3>🔑 Student logins</h3>` + (list.length ? `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Student</th><th>Username</th><th></th></tr></thead><tbody>
      ${list.map(s => `<tr data-sid="${s.id}"><td>${caE(s.full_name)}</td><td><code>${caE(s.username)}</code></td><td><button type="button" class="pill pill-soft" data-reset>🔄 New password</button><span class="ac-newpw"></span></td></tr>`).join('')}</tbody></table></div>`
      : '<p class="meta">Students you add with ➕ Add students appear here, so you can give them a new password if they forget it.</p>');
  }
  logins.addEventListener('click', async e => {
    const b = e.target.closest('[data-reset]'); if (!b) return;
    const row = b.closest('[data-sid]');
    if (!confirm(`Give ${row.cells[0].textContent} a new password? Their old password will stop working.`)) return;
    b.disabled = true;
    try { const r = await caCall({ action: 'reset', student_id: row.dataset.sid }); row.querySelector('.ac-newpw').innerHTML = ` New password: <code>${caE(r.password)}</code>`; b.hidden = true; }
    catch (err) { b.disabled = false; say(err.message); }
  });
  caLogins();
}
document.addEventListener('DOMContentLoaded', () => setTimeout(caInit, 500));
