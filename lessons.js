// ===== Think Nest lesson objectives, worksheets and tests =====
// Uses db, say(), friendly(), esc() from app.js
const AI_FN = 'generate-activities-txc';   // name of the Edge Function in Supabase
const L_CURRICULA = [['british', 'British Curriculum'], ['ib', 'International Baccalaureate (IB)'], ['american', 'American Curriculum']];
const L_GRADES = ['KG1', 'KG2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const Q_TYPES = { multiple_choice: 'Multiple choice', true_false: 'True or false', fill_blank: 'Fill in the blank', short_answer: 'Short answer', long_answer: 'Written answer' };
const KIND_NAMES = { worksheet: 'Worksheet', test: 'Test', activities: 'Activities' };
// Subjects that mean the same thing in different curricula
const SUBJECT_GROUPS = [['maths', 'math', 'mathematics', 'early math'], ['english', 'english language arts', 'literacy', 'early literacy', 'english language', 'english literature'], ['science'], ['understanding the world']];
function sameSubject(a, b) {
  a = String(a || '').toLowerCase().trim(); b = String(b || '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (b === 'science' && ['biology', 'chemistry', 'physics'].includes(a)) return true;
  return SUBJECT_GROUPS.some(g => g.includes(a) && g.includes(b));
}
const lCurName = k => (L_CURRICULA.find(c => c[0] === k) || [k, k])[1];

// ---------- Teacher: build a lesson ----------
function initLessonBuilder(course) {
  const box = document.getElementById('lesson-extra');
  let objectives = [], material = null, key = [];
  box.innerHTML = `
    <div class="lb-objective" id="lb-picker"></div>
    <fieldset class="lb-kind"><legend>Add a worksheet, test or activities (optional)</legend>
      <label class="remember"><input type="radio" name="lb-kind" value="" checked> None</label>
      <label class="remember"><input type="radio" name="lb-kind" value="worksheet"> 📝 Worksheet</label>
      <label class="remember"><input type="radio" name="lb-kind" value="test"> ✅ Test</label>
      <label class="remember"><input type="radio" name="lb-kind" value="activities"> 🧩 Activities</label>
    </fieldset>
    <div class="lb-gen" id="lb-gen" hidden>
      <div class="obj-filters">
        <label>How many <select id="lb-count"></select></label>
        <label>Difficulty <select id="lb-level"><option value="easier (support)">Easier</option><option value="on level" selected>On level</option><option value="harder (challenge)">Harder</option></select></label>
        <label>Notes for Gemini (optional) <input type="text" id="lb-notes" maxlength="300" placeholder="For example: use money examples, EAL learners"></label>
      </div>
      <p class="note">Only the objective, grade, subject and your notes are sent to Gemini, never students’ names. Always check what it creates.</p>
      <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" id="lb-manual">Write it myself</button><button type="button" class="btn btn-red auth-btn" id="lb-ai">✨ Create with Gemini</button></div>
      <div id="lb-editor" class="lb-editor"></div>
    </div>`;
  const gen = box.querySelector('#lb-gen'), editor = box.querySelector('#lb-editor');
  let picker = objectivePicker(box.querySelector('#lb-picker'), course);
  // Materials are now added with "+ Add to this lesson" (materials.js), so the old single-material picker is hidden
  if (typeof openItemBuilder === 'function') { box.querySelector('.lb-kind').hidden = true; box.insertAdjacentHTML('beforeend', '<p class="note">💡 After you add the lesson, click <b>+ Add to this lesson</b> under it to add worksheets, quizzes, Google Forms, videos, writing tasks, flashcards and more.</p>'); }
  const kind = () => (box.querySelector('input[name=lb-kind]:checked') || {}).value || '';
  box.querySelectorAll('input[name=lb-kind]').forEach(r => r.addEventListener('change', () => {
    gen.hidden = !kind();
    const k = kind();
    box.querySelector('#lb-count').innerHTML = (k === 'activities' ? [1, 2, 3, 4, 5] : [5, 8, 10, 12, 15]).map(n => `<option${n === (k === 'activities' ? 3 : 8) ? ' selected' : ''}>${n}</option>`).join('');
    material = null; key = []; editor.innerHTML = '';
  }));

  function objectiveText() { return picker.value(); }
  box.querySelector('#lb-ai').addEventListener('click', async e => {
    const obj = objectiveText();
    if (!obj) return say('Choose or write a learning objective first.');
    const btn = e.target; btn.disabled = true; btn.textContent = 'Gemini is writing… (up to 30 seconds)';
    try {
      const { data, error } = await db.functions.invoke(AI_FN, { body: { kind: kind(), objective: obj, curriculum: lCurName(course.curriculum || ''), grade: course.grade || '', subject: course.subject || '',
        count: Number(box.querySelector('#lb-count').value), level: box.querySelector('#lb-level').value, notes: box.querySelector('#lb-notes').value.trim() } });
      if (error) { let m = 'Gemini couldn’t create this right now. Please try again.'; try { const j = await error.context.json(); if (j.error) m = j.error; } catch (_) {} throw new Error(m); }
      if (data.error) throw new Error(data.error);
      if (kind() === 'activities') { material = { title: data.title, success_criteria: data.success_criteria || [], items: data.activities || [] }; key = []; }
      else {
        const qs = data.questions || [];
        material = { title: data.title, instructions: data.instructions || '', success_criteria: data.success_criteria || [], questions: qs.map(q => ({ type: q.type, question: q.question, options: q.options || [], marks: q.marks || 1 })) };
        key = qs.map(q => ({ answer: q.answer || '', explanation: q.explanation || '' }));
      }
      const t = document.querySelector('#lesson-form [name=title]'); if (t && !t.value.trim() && data.title) t.value = data.title;
      drawEditor(); say('Done! Check and edit it below, then click Add lesson.');
    } catch (err) { say(err.message); }
    btn.disabled = false; btn.textContent = '✨ Create with Gemini';
  });
  box.querySelector('#lb-manual').addEventListener('click', () => {
    if (kind() === 'activities') material = material || { title: '', success_criteria: [], items: [{ name: '', type: 'practice', minutes: 10, steps: [] }] };
    else { material = material || { title: '', instructions: '', success_criteria: [], questions: [{ type: 'short_answer', question: '', options: [], marks: 1 }] }; if (!key.length) key = [{ answer: '' }]; }
    drawEditor();
  });

  function drawEditor() {
    if (!material) { editor.innerHTML = ''; return; }
    const sc = `<label>Success criteria (one per line) <textarea data-m="sc" rows="3">${esc((material.success_criteria || []).join('\n'))}</textarea></label>`;
    if (kind() === 'activities') {
      editor.innerHTML = sc + material.items.map((a, i) => `<div class="panel act-edit" data-i="${i}">
          <div class="act-edit-top"><span class="act-num">${i + 1}</span><input type="text" data-f="name" value="${esc(a.name || '')}" placeholder="Activity name" aria-label="Activity name"><input type="number" data-f="minutes" value="${esc(a.minutes || '')}" min="1" max="120" aria-label="Minutes"><span class="meta">min</span><button type="button" class="link-btn" data-rm="${i}">Remove</button></div>
          <label>Materials <input type="text" data-f="materials" value="${esc(a.materials || '')}"></label>
          <label>Steps for students (one per line) <textarea data-f="steps" rows="4">${esc((a.steps || []).join('\n'))}</textarea></label>
          <div class="two"><label>Extra support <input type="text" data-f="support" value="${esc(a.support || '')}"></label><label>Extra challenge <input type="text" data-f="challenge" value="${esc(a.challenge || '')}"></label></div></div>`).join('')
        + '<button type="button" class="pill pill-soft big" data-add>+ Add an activity</button>';
    } else {
      editor.innerHTML = `<label>Instructions for students <textarea data-m="instructions" rows="2">${esc(material.instructions || '')}</textarea></label>` + sc +
        material.questions.map((q, i) => `<div class="panel act-edit" data-i="${i}">
          <div class="act-edit-top"><span class="act-num">${i + 1}</span>
            <select data-f="type" aria-label="Question type">${Object.entries(Q_TYPES).map(([v, n]) => `<option value="${v}"${v === q.type ? ' selected' : ''}>${n}</option>`).join('')}</select>
            <input type="number" data-f="marks" value="${esc(q.marks || 1)}" min="1" max="20" aria-label="Marks"><span class="meta">marks</span><button type="button" class="link-btn" data-rm="${i}">Remove</button></div>
          <label>Question <textarea data-f="question" rows="2">${esc(q.question || '')}</textarea></label>
          ${['multiple_choice', 'true_false'].includes(q.type) ? `<label>Options (one per line) <textarea data-f="options" rows="4">${esc((q.options || []).join('\n'))}</textarea></label>` : ''}
          <label class="key-field">🔒 Answer (only you can see this)${q.type === 'fill_blank' ? ' – separate other accepted answers with |' : ''} <input type="text" data-k="answer" value="${esc((key[i] || {}).answer || '')}"></label>
        </div>`).join('') + '<button type="button" class="pill pill-soft big" data-add>+ Add a question</button>';
    }
  }
  editor.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.m === 'sc') { material.success_criteria = t.value.split('\n').map(s => s.trim()).filter(Boolean); return; }
    if (t.dataset.m === 'instructions') { material.instructions = t.value; return; }
    const card = t.closest('[data-i]'); if (!card) return;
    const i = Number(card.dataset.i);
    if (t.dataset.k) { key[i] = key[i] || {}; key[i].answer = t.value; return; }
    const f = t.dataset.f; if (!f) return;
    const item = kind() === 'activities' ? material.items[i] : material.questions[i];
    item[f] = ['steps', 'options'].includes(f) ? t.value.split('\n').map(s => s.trim()).filter(Boolean) : ['marks', 'minutes'].includes(f) ? Number(t.value) || 1 : t.value;
  });
  editor.addEventListener('change', e => {
    if (e.target.dataset.f !== 'type') return;
    const q = material.questions[Number(e.target.closest('[data-i]').dataset.i)];
    q.type = e.target.value;
    if (q.type === 'true_false') q.options = ['True', 'False'];
    drawEditor();
  });
  editor.addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { const i = Number(rm.dataset.rm); (kind() === 'activities' ? material.items : material.questions).splice(i, 1); key.splice(i, 1); drawEditor(); }
    if (e.target.closest('[data-add]')) {
      if (kind() === 'activities') material.items.push({ name: '', type: 'practice', minutes: 10, steps: [] });
      else { material.questions.push({ type: 'short_answer', question: '', options: [], marks: 1 }); key.push({ answer: '' }); }
      drawEditor();
    }
  });

  return {
    // what to save with the lesson; returns null if something needs fixing
    payload() {
      const obj = objectiveText(), k = kind();
      if (picker.isOwnEmpty()) { say('Type your objective, or choose one from the list.'); return null; }
      const out = { objective_id: picker.id(), objective_text: obj || null, material_kind: null, material: null, key: null };
      if (k && material) {
        if (k === 'activities') {
          if (!material.items.length || material.items.some(a => !String(a.name || '').trim() || !(a.steps || []).length)) { say('Every activity needs a name and at least one step.'); return null; }
        } else {
          if (!material.questions.length || material.questions.some(q => !String(q.question || '').trim())) { say('Every question needs some text.'); return null; }
          if (material.questions.some(q => ['multiple_choice', 'true_false'].includes(q.type) && (q.options || []).length < 2)) { say('Multiple-choice questions need at least two options.'); return null; }
          if (material.questions.some((q, i) => ['multiple_choice', 'true_false', 'fill_blank'].includes(q.type) && !String((key[i] || {}).answer || '').trim())) { say('Add the answer for each multiple-choice, true/false and fill-in-the-blank question.'); return null; }
        }
        out.material_kind = k; out.material = material; out.key = k === 'activities' ? null : material.questions.map((q, i) => ({ answer: String((key[i] || {}).answer || '').trim(), explanation: (key[i] || {}).explanation || '' }));
      } else if (k && !material) { say('Click “Create with Gemini” or “Write it myself” first, or choose None.'); return null; }
      return out;
    },
    reset() { picker = objectivePicker(box.querySelector('#lb-picker'), course); box.querySelector('input[name=lb-kind][value=""]').checked = true; gen.hidden = true; material = null; key = []; editor.innerHTML = ''; },
    setCourse(c) { course = c; picker = objectivePicker(box.querySelector('#lb-picker'), course); }
  };
}

// ---------- Teacher: see and mark students' answers ----------
async function showLessonResults(lesson) {
  const dlg = document.getElementById('results-dialog');
  const body = dlg.querySelector('.results-body');
  dlg.querySelector('h2').textContent = 'Results: ' + lesson.title;
  body.innerHTML = '<p class="empty">Loading…</p>';
  dlg.showModal();
  const [{ data: rows }, { data: k }] = await Promise.all([db.rpc('lesson_results', { lid: lesson.id }), db.from('lesson_keys').select('answers').eq('lesson_id', lesson.id).maybeSingle()]);
  const qs = (lesson.material && lesson.material.questions) || [], keys = (k && k.answers) || [];
  const totalMarks = qs.reduce((s, q) => s + (Number(q.marks) || 1), 0);
  body.innerHTML = `<details class="key-box"><summary>🔒 Answer key</summary><ol>${qs.map((q, i) => `<li>${esc(q.question)}<br><b>${esc((keys[i] || {}).answer || '—')}</b></li>`).join('')}</ol></details>` +
    ((rows || []).length ? rows.map(r => `<article class="panel result" data-sid="${r.student_id}">
      <header><b>${esc(r.full_name || 'Student')}</b><span class="meta">Submitted ${new Date(r.submitted_at).toLocaleString('en-GB')}</span>
        <span class="tag ${r.needs_marking ? 'tag-wait' : 'tag-now'}">${r.needs_marking ? 'Needs marking' : 'Marked'}</span></header>
      <p>Auto-marked: <b>${r.auto_score ?? 0} / ${r.auto_total ?? 0}</b>${r.teacher_score != null ? ` · Final score: <b>${r.teacher_score} / ${totalMarks}</b>` : ''}</p>
      <ol class="result-answers">${qs.map((q, i) => { const a = (r.answers || [])[i] ?? ''; const auto = ['multiple_choice', 'true_false', 'fill_blank'].includes(q.type); const ok = auto && String(a).trim().toLowerCase() !== '' && String((keys[i] || {}).answer || '').toLowerCase().split('|').map(s => s.trim()).includes(String(a).trim().toLowerCase().replace(/\.$/, ''));
        return `<li><span class="meta">${esc(q.question)}</span><br>${auto ? (ok ? '✅ ' : '❌ ') : '✍️ '}${esc(a || '(no answer)')}</li>`; }).join('')}</ol>
      <div class="two"><label>Final score (out of ${totalMarks}) <input type="number" name="score" min="0" max="${totalMarks}" step="0.5" value="${r.teacher_score ?? (r.needs_marking ? '' : r.auto_score ?? '')}"></label>
        <label>Comment for the student <input type="text" name="comment" maxlength="500" value="${esc(r.teacher_comment || '')}"></label></div>
      <button type="button" class="btn btn-red" data-save-mark>Save mark</button>
    </article>`).join('') : '<p class="empty">No one has submitted this yet.</p>');
  body.onclick = async e => {
    const b = e.target.closest('[data-save-mark]'); if (!b) return;
    const card = b.closest('[data-sid]'), score = card.querySelector('[name=score]').value;
    const { error } = await db.from('lesson_responses').update({ teacher_score: score === '' ? null : Number(score), teacher_comment: card.querySelector('[name=comment]').value.trim() || null, needs_marking: false })
      .eq('lesson_id', lesson.id).eq('student_id', card.dataset.sid);
    if (error) return say(friendly(error));
    say('Mark saved. The student has been told.'); showLessonResults(lesson);
  };
}

// ---------- Student: do the worksheet or test ----------
function lessonMaterialHtml(l, resp) {
  const m = l.material || {};
  const sc = (m.success_criteria || []).length ? `<div class="sc-box"><b>Success criteria</b><ul>${m.success_criteria.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : '';
  const obj = l.objective_text ? `<p class="obj-line">🎯 <b>Learning objective:</b> ${esc(l.objective_text)}</p>` : '';
  if (l.material_kind === 'activities') {
    return obj + sc + `<div class="act-list">${(m.items || []).map((a, i) => `<article class="act-card"><div class="act-top"><span class="act-num">${i + 1}</span><div><h4>${esc(a.name || '')}</h4><span class="meta">${a.minutes ? esc(a.minutes) + ' min' : ''}</span></div></div>
      ${a.materials ? `<p class="act-mat"><b>You need:</b> ${esc(a.materials)}</p>` : ''}<ol class="act-steps">${(a.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      ${a.support ? `<p class="act-extra"><b>Need help?</b> ${esc(a.support)}</p>` : ''}${a.challenge ? `<p class="act-extra"><b>Challenge:</b> ${esc(a.challenge)}</p>` : ''}</article>`).join('')}</div>`;
  }
  if (!m.questions) return obj;
  const done = !!resp, ans = (resp && resp.answers) || [];
  const total = m.questions.reduce((s, q) => s + (Number(q.marks) || 1), 0);
  const result = done ? `<div class="result-box">${resp.teacher_score != null ? `🏅 Your score: <b>${resp.teacher_score} / ${total}</b>` : resp.needs_marking ? `Auto-marked so far: <b>${resp.auto_score} / ${resp.auto_total}</b>. Your teacher will mark your written answers.` : `🏅 Your score: <b>${resp.auto_score} / ${resp.auto_total}</b>`}
      ${resp.teacher_comment ? `<p>💬 ${esc(resp.teacher_comment)}</p>` : ''}</div>` : '';
  return obj + sc + result + `<form class="lesson-quiz" data-quiz="${l.id}">
      ${m.instructions ? `<p class="quiz-instr">${esc(m.instructions)}</p>` : ''}
      ${m.questions.map((q, i) => `<fieldset class="quiz-q"><legend><span class="act-num">${i + 1}</span> ${esc(q.question)} <span class="meta">(${q.marks || 1} mark${(q.marks || 1) == 1 ? '' : 's'})</span></legend>
        ${['multiple_choice', 'true_false'].includes(q.type) ? (q.options || []).map(o => `<label class="remember"><input type="radio" name="q${i}" value="${esc(o)}" ${String(ans[i]) === String(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')
          : q.type === 'long_answer' ? `<textarea name="q${i}" rows="4" maxlength="3000">${esc(ans[i] || '')}</textarea>`
          : `<input type="text" name="q${i}" maxlength="500" value="${esc(ans[i] || '')}">`}
      </fieldset>`).join('')}
      <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-print>🖨️ Print</button><button class="btn btn-red auth-btn">${done ? 'Submit again' : 'Submit my answers'}</button></div>
    </form>`;
}
async function initStudentLessons(lessons, courseId, isEnrolled, onDone) {
  const ids = lessons.filter(l => l.material).map(l => l.id);
  let responses = {};
  if (ids.length) {
    const { data: { session } } = await db.auth.getSession();
    const { data } = await db.from('lesson_responses').select('*').in('lesson_id', ids).eq('student_id', session.user.id);
    (data || []).forEach(r => responses[r.lesson_id] = r);
  }
  const box = document.getElementById('lessons');
  box.addEventListener('click', e => {
    const o = e.target.closest('[data-open-lesson]');
    if (o) {
      const panel = document.getElementById('lm-' + o.dataset.openLesson);
      const l = lessons.find(x => x.id === Number(o.dataset.openLesson));
      if (!isEnrolled()) return say('Join the course first to open this.');
      if (panel.hidden) { panel.innerHTML = lessonMaterialHtml(l, responses[l.id]); }
      panel.hidden = !panel.hidden;
      o.textContent = panel.hidden ? (o.dataset.label) : 'Close';
    }
    if (e.target.closest('[data-print]')) window.print();
  });
  box.addEventListener('submit', async e => {
    const f = e.target.closest('[data-quiz]'); if (!f) return;
    e.preventDefault();
    const l = lessons.find(x => x.id === Number(f.dataset.quiz));
    const ans = l.material.questions.map((q, i) => { const el = f.querySelector(`[name=q${i}]:checked`) || f.querySelector(`[name=q${i}]:not([type=radio])`); return el ? el.value.trim() : ''; });
    const blank = ans.filter(a => !a).length;
    if (blank && !confirm(`You haven’t answered ${blank} question${blank === 1 ? '' : 's'}. Submit anyway?`)) return;
    f.querySelector('.btn-red').disabled = true;
    const { data, error } = await db.rpc('submit_lesson', { lid: l.id, ans });
    if (error) { f.querySelector('.btn-red').disabled = false; return say(friendly(error)); }
    const { data: r } = await db.from('lesson_responses').select('*').eq('lesson_id', l.id).eq('student_id', (await db.auth.getSession()).data.session.user.id).maybeSingle();
    responses[l.id] = r;
    document.getElementById('lm-' + l.id).innerHTML = lessonMaterialHtml(l, r);
    say(data.needs_marking ? `Submitted! You scored ${data.score} / ${data.total} so far. Your teacher will mark the written answers.` : `Submitted! You scored ${data.score} / ${data.total}. 🎉`);
    if (onDone) onDone(l.id);
  });
  return responses;
}
