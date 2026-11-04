// ===== Think Nest objectives and activities =====
const AI_FUNCTION = 'generate-activities-txc'; // the name of the Edge Function in Supabase
// Uses db, say(), friendly(), esc(), showError() from app.js; CUR_GRADES from curriculum.js
const OBJ_CURRICULA = [['british', 'British Curriculum'], ['ib', 'International Baccalaureate (IB)'], ['american', 'American Curriculum']];
const ACT_TYPES = ['warm-up', 'hands-on', 'practice', 'game', 'discussion', 'challenge', 'reflection'];
const curName = k => (OBJ_CURRICULA.find(c => c[0] === k) || [k, k])[1];
const fmtDate = d => d ? new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

// One activity shown to students (read only)
function activityView(a, i) {
  return `<article class="act-card">
    <div class="act-top"><span class="act-num">${i + 1}</span><div><h4>${esc(a.name || 'Activity')}</h4><span class="meta">${esc(a.type || '')}${a.minutes ? ' · ' + esc(a.minutes) + ' min' : ''}</span></div></div>
    ${a.materials ? `<p class="act-mat"><b>You need:</b> ${esc(a.materials)}</p>` : ''}
    ${(a.steps || []).length ? `<ol class="act-steps">${a.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    ${a.support ? `<p class="act-extra"><b>Need help?</b> ${esc(a.support)}</p>` : ''}
    ${a.challenge ? `<p class="act-extra"><b>Challenge:</b> ${esc(a.challenge)}</p>` : ''}
  </article>`;
}
function planView(plan) {
  const sc = (plan && plan.success_criteria) || [], items = (plan && plan.items) || [];
  return `${sc.length ? `<div class="sc-box"><b>Success criteria</b><ul>${sc.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
    <div class="act-list">${items.map(activityView).join('')}</div>`;
}

// ---------- Teacher planner ----------
async function startTeacherObjectives() {
  const { user } = await initTeacher();
  const pick = document.getElementById('obj-pick');
  pick.c.innerHTML = OBJ_CURRICULA.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
  pick.g.innerHTML = CUR_GRADES.map(g => `<option>${g}</option>`).join('');
  let objectives = [], chosen = null, plan = { success_criteria: [], items: [] };

  async function loadObjectives() {
    const { data, error } = await db.from('objectives').select('*').eq('curriculum', pick.c.value).eq('grade', pick.g.value).order('subject').order('topic', { nullsFirst: false }).order('source').order('id');
    if (error) return say(friendly(error));
    objectives = data;
    const subjects = [...new Set(data.map(o => o.subject))];
    const keep = pick.s.value;
    pick.s.innerHTML = '<option value="">All subjects</option>' + subjects.map(s => `<option${s === keep ? ' selected' : ''}>${esc(s)}</option>`).join('');
    document.getElementById('own-subjects').innerHTML = subjects.map(s => `<option value="${esc(s)}">`).join('');
    drawObjectives();
  }
  function drawObjectives() {
    const s = pick.s.value, q = pick.q.value.trim().toLowerCase();
    const list = objectives.filter(o => (!s || o.subject === s) && (!q || o.text.toLowerCase().includes(q)));
    const groups = {};
    list.forEach(o => { const g = o.subject + (o.topic ? ' · ' + o.topic : ''); (groups[g] = groups[g] || []).push(o); });
    document.getElementById('obj-list').innerHTML = list.length ? Object.entries(groups).map(([subj, items]) => `<div class="obj-group"><h4>${esc(subj)}</h4>${items.map(o => `
        <label class="obj-row ${chosen && chosen.id === o.id ? 'on' : ''}"><input type="radio" name="obj" value="${o.id}" ${chosen && chosen.id === o.id ? 'checked' : ''}>
          <span>${esc(o.text)}${o.source === 'teacher' ? ' <span class="role-tag">Added by a teacher</span>' : ''}</span>
          ${o.source === 'teacher' && o.created_by === user.id ? `<button type="button" class="link-btn" data-del-obj="${o.id}">Delete</button>` : ''}</label>`).join('')}</div>`).join('')
      : `<p class="empty">No objectives here yet${pick.g.value.startsWith('Grade 9') || /Grade 1[0-2]/.test(pick.g.value) ? ' (for exam years, add the objectives from your exam board)' : ''}. Add your own below.</p>`;
  }
  ['c', 'g'].forEach(n => pick[n].addEventListener('change', () => { chosen = null; showChosen(); loadObjectives(); }));
  pick.s.addEventListener('change', drawObjectives);
  pick.q.addEventListener('input', drawObjectives);
  document.getElementById('obj-list').addEventListener('change', e => {
    if (e.target.name !== 'obj') return;
    chosen = objectives.find(o => o.id === Number(e.target.value)); showChosen(); drawObjectives();
  });
  document.getElementById('obj-list').addEventListener('click', async e => {
    const d = e.target.closest('[data-del-obj]'); if (!d) return;
    e.preventDefault();
    if (!confirm('Delete this objective you added?')) return;
    const { error } = await db.from('objectives').delete().eq('id', Number(d.dataset.delObj));
    if (error) return say(friendly(error));
    if (chosen && chosen.id === Number(d.dataset.delObj)) { chosen = null; showChosen(); }
    loadObjectives();
  });
  const own = document.getElementById('own-form');
  own.addEventListener('submit', async e => {
    e.preventDefault();
    const subject = own.subject.value.trim(), text = own.text.value.trim();
    if (!subject || text.length < 3) return say('Add a subject and the objective.');
    const { data, error } = await db.from('objectives').insert({ curriculum: pick.c.value, grade: pick.g.value, subject, text, source: 'teacher', created_by: user.id }).select().single();
    if (error) return say(String(error.message).includes('duplicate') ? 'That objective is already in the list.' : friendly(error));
    own.reset(); await loadObjectives(); chosen = data; showChosen(); drawObjectives(); say('Objective added and chosen.');
  });

  // Step 2 – activities
  const step2 = document.getElementById('step2'), step3 = document.getElementById('step3');
  function showChosen() {
    document.getElementById('chosen-obj').innerHTML = chosen
      ? `<span class="meta">${esc(curName(chosen.curriculum))} · ${esc(chosen.grade)} · ${esc(chosen.subject)}</span><b>${esc(chosen.text)}</b>` : '';
    step2.hidden = !chosen;
    if (chosen && !document.getElementById('plan-title').value) document.getElementById('plan-title').value = chosen.subject + ': ' + chosen.text.slice(0, 60);
  }
  const gen = document.getElementById('gen-form');
  gen.addEventListener('submit', async e => {
    e.preventDefault();
    if (!chosen) return say('Choose an objective first.');
    const btn = gen.querySelector('.btn-red'); btn.disabled = true; btn.textContent = 'Creating activities… (up to 30 seconds)';
    try {
      const { data, error } = await db.functions.invoke(AI_FUNCTION, { body: {
        objective: chosen.text, curriculum: curName(chosen.curriculum), grade: chosen.grade, subject: chosen.subject,
        count: Number(gen.count.value), minutes: Number(gen.minutes.value), style: gen.style.value, notes: gen.notes.value.trim() } });
      if (error) {
        let msg = 'The AI couldn’t create activities right now. Please try again.';
        try { const j = await error.context.json(); if (j.error) msg = j.error; } catch (_) {}
        throw new Error(msg);
      }
      if (data.error) throw new Error(data.error);
      plan = { success_criteria: data.success_criteria || [], items: (data.activities || []).map(a => ({ ...a, steps: a.steps || [] })) };
      if (data.title) document.getElementById('plan-title').value = data.title;
      drawEditor(); say('Done! Check and edit the activities before assigning.');
    } catch (err) { say(err.message); }
    btn.disabled = false; btn.textContent = '✨ Create activities with AI';
  });
  document.getElementById('write-own').addEventListener('click', () => { if (!plan.items.length) plan.items.push({ name: '', type: 'practice', minutes: 15, materials: '', steps: [], support: '', challenge: '' }); drawEditor(); });

  const editor = document.getElementById('plan-editor');
  function drawEditor() {
    step3.hidden = !plan.items.length;
    document.getElementById('plan-box').hidden = !plan.items.length;
    document.getElementById('plan-sc').value = (plan.success_criteria || []).join('\n');
    editor.innerHTML = plan.items.map((a, i) => `<div class="panel act-edit" data-i="${i}">
        <div class="act-edit-top"><span class="act-num">${i + 1}</span><input type="text" data-f="name" value="${esc(a.name || '')}" placeholder="Activity name" aria-label="Activity name">
          <select data-f="type" aria-label="Type">${ACT_TYPES.map(t => `<option${t === String(a.type || '').toLowerCase() ? ' selected' : ''}>${t}</option>`).join('')}</select>
          <input type="number" data-f="minutes" value="${esc(a.minutes || '')}" min="1" max="120" aria-label="Minutes"><span class="meta">min</span>
          <button type="button" class="link-btn" data-rm="${i}">Remove</button></div>
        <label>Materials <input type="text" data-f="materials" value="${esc(a.materials || '')}"></label>
        <label>Steps for students (one per line) <textarea data-f="steps" rows="${Math.max(3, (a.steps || []).length + 1)}">${esc((a.steps || []).join('\n'))}</textarea></label>
        <div class="two"><label>Extra support <textarea data-f="support" rows="2">${esc(a.support || '')}</textarea></label><label>Extra challenge <textarea data-f="challenge" rows="2">${esc(a.challenge || '')}</textarea></label></div>
      </div>`).join('');
  }
  editor.addEventListener('input', e => {
    const card = e.target.closest('[data-i]'), f = e.target.dataset.f; if (!card || !f) return;
    const a = plan.items[Number(card.dataset.i)];
    a[f] = f === 'steps' ? e.target.value.split('\n').map(s => s.trim()).filter(Boolean) : f === 'minutes' ? Number(e.target.value) || null : e.target.value;
  });
  editor.addEventListener('change', e => { if (e.target.dataset.f === 'type') plan.items[Number(e.target.closest('[data-i]').dataset.i)].type = e.target.value; });
  editor.addEventListener('click', e => { const r = e.target.closest('[data-rm]'); if (r) { plan.items.splice(Number(r.dataset.rm), 1); drawEditor(); } });
  document.getElementById('plan-sc').addEventListener('input', e => { plan.success_criteria = e.target.value.split('\n').map(s => s.trim()).filter(Boolean); });
  document.getElementById('add-act').addEventListener('click', () => { plan.items.push({ name: '', type: 'practice', minutes: 10, materials: '', steps: [], support: '', challenge: '' }); drawEditor(); });

  // Step 3 – assign
  const { data: studs } = await db.rpc('my_students');
  const byCourse = {};
  (studs || []).forEach(s => (byCourse[s.course_title] = byCourse[s.course_title] || []).push(s));
  document.getElementById('stud-list').innerHTML = (studs || []).length ? Object.entries(byCourse).map(([c, list]) => `<div class="stud-group">
      <label class="remember"><input type="checkbox" data-all="${esc(c)}"> <b>${esc(c)}</b> <span class="meta">(${list.length})</span></label>
      ${list.map(s => `<label class="remember stud"><input type="checkbox" name="stud" value="${s.id}" data-course="${esc(c)}"> ${esc(s.full_name || 'Student')} <span class="meta">${esc([s.grade, s.curriculum].filter(Boolean).join(' · '))}</span></label>`).join('')}</div>`).join('')
    : '<p class="empty">No students yet. Students appear here once they join one of your courses.</p>';
  document.getElementById('stud-list').addEventListener('change', e => {
    if (e.target.dataset.all) document.querySelectorAll(`[data-course="${CSS.escape(e.target.dataset.all)}"]`).forEach(c => c.checked = e.target.checked);
  });
  const asg = document.getElementById('assign-form');
  asg.addEventListener('submit', async e => {
    e.preventDefault();
    const ids = [...new Set([...document.querySelectorAll('input[name=stud]:checked')].map(c => c.value))];
    if (!chosen) return say('Choose an objective first.');
    if (!plan.items.length) return say('Add at least one activity.');
    if (plan.items.some(a => !String(a.name || '').trim() || !(a.steps || []).length)) return say('Every activity needs a name and at least one step.');
    if (!ids.length) return say('Choose at least one student.');
    const title = document.getElementById('plan-title').value.trim() || chosen.text.slice(0, 80);
    const btn = asg.querySelector('button'); btn.disabled = true;
    const { data: a, error } = await db.from('assignments').insert({ objective_id: chosen.id, objective_text: chosen.text, curriculum: chosen.curriculum, grade: chosen.grade, subject: chosen.subject,
      title, message: asg.message.value.trim() || null, due_date: asg.due.value || null, activities: plan }).select().single();
    if (error) { btn.disabled = false; return say(friendly(error)); }
    const { error: e2 } = await db.from('assignment_students').insert(ids.map(id => ({ assignment_id: a.id, student_id: id })));
    btn.disabled = false;
    if (e2) return say(friendly(e2));
    say(`Assigned to ${ids.length} student${ids.length === 1 ? '' : 's'}. They’ve been notified.`);
    plan = { success_criteria: [], items: [] }; drawEditor(); asg.reset(); document.querySelectorAll('input[name=stud]').forEach(c => c.checked = false);
    document.getElementById('plan-title').value = '';
    loadAssigned();
  });

  // My assignments
  async function loadAssigned() {
    const { data } = await db.from('assignments').select('*, assignment_students(status)').eq('teacher_id', user.id).order('created_at', { ascending: false });
    const box = document.getElementById('assigned');
    box.innerHTML = (data || []).length ? data.map(a => {
      const total = a.assignment_students.length, done = a.assignment_students.filter(s => s.status === 'done').length;
      return `<details class="panel asg" id="a-${a.id}" data-aid="${a.id}">
        <summary><div><b>${esc(a.title)}</b><span class="meta">${esc(a.subject || '')} · ${esc(a.grade || '')}${a.due_date ? ' · due ' + fmtDate(a.due_date) : ''}</span></div>
          <span class="prog"><span class="bar"><i style="width:${total ? Math.round(done / total * 100) : 0}%"></i></span>${done}/${total} done</span></summary>
        <p class="obj-line">🎯 ${esc(a.objective_text)}</p>
        <div class="asg-progress"><p class="empty">Loading…</p></div>
        <details class="asg-plan"><summary>View the activities</summary>${planView(a.activities)}</details>
        <p class="unlink-row"><button class="pill pill-soft danger" data-del-asg="${a.id}">Delete this assignment</button></p>
      </details>`;
    }).join('') : '<p class="empty">You haven’t assigned anything yet.</p>';
    const m = location.hash.match(/^#a-(\d+)$/); if (m) { const el = document.getElementById('a-' + m[1]); if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth' }); loadProgress(el); } }
  }
  async function loadProgress(el) {
    const { data } = await db.rpc('assignment_progress', { aid: Number(el.dataset.aid) });
    el.querySelector('.asg-progress').innerHTML = (data || []).map(s => `<div class="pending-row"><span class="initials">${esc((s.full_name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
        <div><b>${esc(s.full_name)}</b><span class="meta">${s.status === 'done' ? '✅ Done ' + (s.done_at ? new Date(s.done_at).toLocaleDateString('en-GB') : '') : '⏳ Not done yet'}</span>${s.student_note ? `<span class="meta bio">“${esc(s.student_note)}”</span>` : ''}</div>
        ${s.file_path ? `<button class="pill pill-soft" data-work="${esc(s.file_path)}">📎 ${esc(s.file_name || 'Open work')}</button>` : ''}</div>`).join('') || '<p class="empty">No students.</p>';
  }
  const assigned = document.getElementById('assigned');
  assigned.addEventListener('toggle', e => { if (e.target.classList.contains('asg') && e.target.open) loadProgress(e.target); }, true);
  assigned.addEventListener('click', async e => {
    const w = e.target.closest('[data-work]'), d = e.target.closest('[data-del-asg]');
    if (w) { const { data, error } = await db.storage.from('assignments').createSignedUrl(w.dataset.work, 600); if (error) return say(friendly(error)); window.open(data.signedUrl, '_blank', 'noopener'); }
    if (d) {
      if (!confirm('Delete this assignment for all students?')) return;
      const { error } = await db.from('assignments').delete().eq('id', Number(d.dataset.delAsg));
      if (error) return say(friendly(error)); say('Assignment deleted.'); loadAssigned();
    }
  });

  loadObjectives(); loadAssigned();
}

// ---------- Student: My Activities ----------
async function startMyActivities() {
  const { user } = await initShell();
  async function load() {
    const { data, error } = await db.from('assignment_students').select('*, assignments(*)').eq('student_id', user.id);
    if (error) return say(friendly(error));
    const rows = (data || []).filter(r => r.assignments).sort((a, b) => (a.status === b.status ? new Date(b.assignments.created_at) - new Date(a.assignments.created_at) : a.status === 'done' ? 1 : -1));
    const todo = rows.filter(r => r.status !== 'done').length;
    document.getElementById('n-todo').textContent = todo;
    document.getElementById('acts').innerHTML = rows.length ? rows.map(r => { const a = r.assignments; return `<details class="panel asg ${r.status === 'done' ? 'is-done' : ''}" id="a-${a.id}" data-aid="${a.id}" ${rows.length === 1 ? 'open' : ''}>
        <summary><div><b>${r.status === 'done' ? '✅ ' : ''}${esc(a.title)}</b><span class="meta">${esc(a.teacher_name || 'Your teacher')} · ${esc(a.subject || '')}${a.due_date ? ' · due ' + fmtDate(a.due_date) : ''}</span></div>
          <span class="tag ${r.status === 'done' ? 'tag-now' : 'tag-wait'}">${r.status === 'done' ? 'Done' : 'To do'}</span></summary>
        <p class="obj-line">🎯 <b>Learning objective:</b> ${esc(a.objective_text)}</p>
        ${a.message ? `<p class="teacher-msg">💬 ${esc(a.message)}</p>` : ''}
        ${planView(a.activities)}
        <form class="panel submit-box">
          <h4>${r.status === 'done' ? 'You marked this as done' : 'When you’ve finished'}</h4>
          <label>A note for your teacher (optional) <textarea name="note" rows="2" maxlength="1000">${esc(r.student_note || '')}</textarea></label>
          <label>Add a photo or file of your work (optional, up to 10 MB) <input type="file" name="file"></label>
          ${r.file_name ? `<p class="meta">Uploaded: ${esc(r.file_name)}</p>` : ''}
          <div class="step-buttons">${r.status === 'done' ? '<button type="button" class="btn btn-white auth-btn outline" data-undo>Not done yet</button><button class="btn btn-red auth-btn">Update</button>' : '<button class="btn btn-red auth-btn">I’ve finished ✅</button>'}</div>
        </form></details>`; }).join('')
      : '<div class="empty-box"><p>No activities yet. When a teacher sets you an activity, it will appear here.</p></div>';
    const m = location.hash.match(/^#a-(\d+)$/); if (m) { const el = document.getElementById('a-' + m[1]); if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth' }); } }
  }
  const box = document.getElementById('acts');
  async function submit(form, done) {
    const aid = Number(form.closest('[data-aid]').dataset.aid), file = form.file.files[0];
    let fpath = null, fname = null;
    if (file) {
      if (file.size > 10 * 1024 * 1024) return say('Files must be smaller than 10 MB.');
      fpath = `${aid}/${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`; fname = file.name.slice(0, 150);
      const up = await db.storage.from('assignments').upload(fpath, file);
      if (up.error) return say(friendly(up.error));
    }
    const { error } = await db.rpc('submit_assignment', { aid, done, note: form.note.value, fpath, fname });
    if (error) return say(friendly(error));
    say(done ? 'Well done! Your teacher has been told. 🎉' : 'Marked as not done.'); load();
  }
  box.addEventListener('submit', e => { const f = e.target.closest('.submit-box'); if (!f) return; e.preventDefault(); submit(f, true); });
  box.addEventListener('click', e => { if (e.target.closest('[data-undo]')) submit(e.target.closest('.submit-box'), false); });
  load();
}

// ---------- Parent: a child's activities ----------
async function childActivities(kidId) {
  const box = document.getElementById('k-activities'); if (!box) return;
  const { data } = await db.from('assignment_students').select('status, done_at, student_note, assignments(id, title, objective_text, subject, due_date, teacher_name, activities, created_at)').eq('student_id', kidId);
  const rows = (data || []).filter(r => r.assignments).sort((a, b) => new Date(b.assignments.created_at) - new Date(a.assignments.created_at));
  box.innerHTML = rows.length ? rows.map(r => { const a = r.assignments; return `<details class="panel asg">
      <summary><div><b>${esc(a.title)}</b><span class="meta">${esc(a.teacher_name || '')} · ${esc(a.subject || '')}${a.due_date ? ' · due ' + fmtDate(a.due_date) : ''}</span></div>
        <span class="tag ${r.status === 'done' ? 'tag-now' : 'tag-wait'}">${r.status === 'done' ? 'Done' : 'To do'}</span></summary>
      <p class="obj-line">🎯 ${esc(a.objective_text)}</p>${planView(a.activities)}</details>`; }).join('')
    : '<p class="empty">No activities set yet.</p>';
}
