// ===== Think Nest: teachers create student accounts =====
const acEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function acCall(body) {
  const { data, error } = await db.functions.invoke('quick-worker', { body });
  if (error) { let msg = error.message; try { const j = await error.context.json(); msg = j.error || msg; } catch (_) {} throw new Error(msg); }
  if (data && data.error) throw new Error(data.error);
  return data;
}
function acNamesFromText(t) {
  return String(t || '').split(/\r?\n/).map(line => {
    const cells = line.split(/[,;\t]/).map(c => c.replace(/^"|"$/g, '').trim()).filter(Boolean);
    return cells.length >= 2 && !/\d/.test(cells[1]) && cells[1].length < 30 ? cells[0] + ' ' + cells[1] : (cells[0] || '');
  }).map(n => n.replace(/\s+/g, ' ').trim()).filter(n => n.length >= 2 && !/^(name|names|student|first name|full name)$/i.test(n));
}
async function startStudentAccounts() {
  const { user } = await initTeacher();
  const $ = id => document.getElementById(id);
  const [{ data: courses }, { data: classes }] = await Promise.all([
    db.from('courses').select('id, title').eq('teacher_id', user.id).order('title'),
    (window.TN_SCHOOL ? db.from('study_groups').select('id, name').eq('owner_id', user.id).eq('kind', 'class').eq('school_id', window.TN_SCHOOL.id) : db.from('study_groups').select('id, name').eq('owner_id', user.id).eq('kind', 'class')).order('name')
  ]);
  $('ac-where').innerHTML = `<option value="">Choose a class or course…</option>
    ${(classes || []).length ? `<optgroup label="My classes">${classes.map(c => `<option value="g${c.id}">🏫 ${acEsc(c.name)}</option>`).join('')}</optgroup>` : ''}
    ${(courses || []).length ? `<optgroup label="My courses">${courses.map(c => `<option value="c${c.id}">📘 ${acEsc(c.title)}</option>`).join('')}</optgroup>` : ''}`;
  const q = new URLSearchParams(location.search); if (q.get('class')) $('ac-where').value = 'g' + q.get('class');
  const count = () => { const n = acNamesFromText($('ac-names').value).length; $('ac-count').textContent = n ? `${n} student${n === 1 ? '' : 's'}` : ''; };
  $('ac-names').addEventListener('input', count);
  $('ac-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) { say('Please save the Excel list as CSV first (File → Save As → CSV), then upload it.'); e.target.value = ''; return; }
    const names = acNamesFromText(await f.text());
    $('ac-names').value = ($('ac-names').value.trim() ? $('ac-names').value.trim() + '\n' : '') + names.join('\n'); count();
    say(`${names.length} names added from ${f.name}.`); e.target.value = '';
  });
  $('ac-go').addEventListener('click', async () => {
    const names = acNamesFromText($('ac-names').value), where = $('ac-where').value;
    if (!where) return say('Choose a class or course first.');
    if (!names.length) return say('Type or upload at least one name.');
    if (names.length > 60) return say('Please add up to 60 students at a time.');
    if (!$('ac-ok').checked) return say('Please tick the box to confirm you have permission.');
    const b = $('ac-go'); b.disabled = true; b.textContent = `Creating ${names.length} account${names.length === 1 ? '' : 's'}…`;
    try {
      const res = await acCall({ names, group_id: where[0] === 'g' ? Number(where.slice(1)) : null, course_id: where[0] === 'c' ? Number(where.slice(1)) : null });
      showResults(res.results || [], $('ac-where').options[$('ac-where').selectedIndex].text.replace(/^\S+\s/, ''));
      $('ac-names').value = ''; count(); loadMine();
    } catch (err) { say(err.message || 'Something went wrong. Please try again.'); }
    b.disabled = false; b.textContent = '✨ Generate accounts';
  });

  function showResults(list, place) {
    const ok = list.filter(r => r.username), bad = list.filter(r => !r.username);
    $('ac-results').hidden = false;
    $('ac-results').innerHTML = `<div class="ac-res-head"><div><h2>✅ ${ok.length} account${ok.length === 1 ? '' : 's'} ready</h2><p class="meta">For ${acEsc(place)}. <b>Passwords are shown only now</b>: print the cards or download the list before leaving this page.</p></div>
        <div class="ac-res-btns"><button type="button" class="btn btn-red" id="ac-print">🖨️ Print login cards</button><button type="button" class="btn btn-white outline" id="ac-csv">⬇ Download CSV</button></div></div>
      ${bad.length ? `<p class="note">⚠️ ${bad.length} couldn’t be created: ${bad.map(r => acEsc(r.name) + ' (' + acEsc(r.error) + ')').join(', ')}</p>` : ''}
      <div class="in-scroll"><table class="ac-table"><thead><tr><th>Student</th><th>Username</th><th>Password</th></tr></thead>
      <tbody>${ok.map(r => `<tr><td>${acEsc(r.name)}</td><td><code>${acEsc(r.username)}</code></td><td><code>${acEsc(r.password)}</code></td></tr>`).join('')}</tbody></table></div>`;
    $('ac-print').onclick = () => printCards(ok, place);
    $('ac-csv').onclick = () => {
      const text = [['Student', 'Username', 'Password', 'Website']].concat(ok.map(r => [r.name, r.username, r.password, 'thinknestonline.com'])).map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv' })); a.download = 'student-logins.csv'; document.body.appendChild(a); a.click(); a.remove();
    };
    $('ac-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function printCards(list, place) {
    const w = window.open('', '_blank'); if (!w) return say('Please allow pop-ups to print the cards.');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Login cards – ${acEsc(place)}</title><style>
      body{font-family:Arial,Helvetica,sans-serif;margin:16px;color:#1D2026} .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
      .card{border:2px dashed #9AA3D6;border-radius:14px;padding:14px 16px;break-inside:avoid;page-break-inside:avoid}
      .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px} .top b{color:#3E4B94;font-size:15px} .top span{font-size:11px;color:#6E7485}
      .name{font-size:18px;font-weight:bold;margin:2px 0 10px} .row{display:flex;justify-content:space-between;background:#F5F6FB;border-radius:8px;padding:7px 10px;margin:5px 0;font-size:14px}
      .row code{font-size:16px;font-weight:bold;letter-spacing:.5px} .site{font-size:12px;color:#6E7485;margin-top:8px} @media print{body{margin:6mm}}</style></head><body>
      <div class="grid">${list.map(r => `<div class="card"><div class="top"><b>🪺 Think Nest</b><span>${acEsc(place)}</span></div><div class="name">${acEsc(r.name)}</div>
        <div class="row">Username <code>${acEsc(r.username)}</code></div><div class="row">Password <code>${acEsc(r.password)}</code></div>
        <div class="site">Log in at <b>thinknestonline.com</b> → Log in → Student. Keep your password secret! 🤫</div></div>`).join('')}</div>
      <script>setTimeout(function(){window.print()},400)<\/script></body></html>`);
    w.document.close();
  }
  async function loadMine() {
    const { data, error } = await db.rpc('my_created_students');
    const box = $('ac-mine');
    if (error) { box.innerHTML = '<p class="empty">Run database update 51 to see your students here.</p>'; return; }
    if (!(data || []).length) { box.innerHTML = '<p class="empty">Students you create will appear here.</p>'; return; }
    box.innerHTML = `<div class="in-scroll"><table class="ac-table"><thead><tr><th>Student</th><th>Username</th><th>Grade</th><th></th></tr></thead><tbody>
      ${data.map(s => `<tr data-sid="${s.id}"><td>${acEsc(s.full_name)}</td><td><code>${acEsc(s.username)}</code></td><td>${acEsc(s.grade || '–')}</td>
        <td><button type="button" class="pill pill-soft" data-reset>🔄 New password</button><span class="ac-newpw"></span></td></tr>`).join('')}</tbody></table></div>`;
  }
  $('ac-mine').addEventListener('click', async e => {
    const b = e.target.closest('[data-reset]'); if (!b) return;
    const row = b.closest('[data-sid]');
    if (!confirm(`Give ${row.cells[0].textContent} a new password? Their old password will stop working.`)) return;
    b.disabled = true;
    try { const r = await acCall({ action: 'reset', student_id: row.dataset.sid }); row.querySelector('.ac-newpw').innerHTML = ` New password: <code>${acEsc(r.password)}</code>`; b.hidden = true; }
    catch (err) { b.disabled = false; say(err.message); }
  });
  loadMine();
}
