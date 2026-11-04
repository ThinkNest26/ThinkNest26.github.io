// ===== Think Nest lesson materials: 10 tools teachers can add to any lesson =====
// Uses db, say(), friendly(), esc() from app.js. AI_FN, Q_TYPES, lCurName from lessons.js.
const TOOLS = [
  { k: 'file', ic: '📄', name: 'Upload a worksheet', desc: 'PDF, Word, PowerPoint or a picture. Students can hand in their work.' },
  { k: 'form', ic: '📝', name: 'Google or Microsoft Form', desc: 'Paste a form link. Students fill it in inside Think Nest.' },
  { k: 'quiz', ic: '✅', name: 'Quiz', desc: 'Auto-marked questions. Gemini can write it for you.', ai: true },
  { k: 'worksheet', ic: '📋', name: 'On-screen worksheet', desc: 'Practice questions students answer on screen.', ai: true },
  { k: 'video', ic: '🎥', name: 'Video + questions', desc: 'A YouTube video with questions underneath.', ai: true },
  { k: 'writing', ic: '✍️', name: 'Writing task', desc: 'A prompt with tips and success criteria. You mark it.', ai: true },
  { k: 'flashcards', ic: '🗂️', name: 'Flashcards', desc: 'Words and meanings to flip and practise.', ai: true },
  { k: 'activities', ic: '🧩', name: 'Activities', desc: 'Step-by-step tasks for class or home.', ai: true },
  { k: 'link', ic: '🎮', name: 'Interactive tool', desc: 'Kahoot, Quizizz, Wordwall, Padlet, Canva, Desmos and more.' },
  { k: 'exit', ic: '💬', name: 'Exit ticket', desc: '3 quick questions to check learning at the end.', ai: true }
];
const TOOL = k => TOOLS.find(t => t.k === k) || { ic: '📎', name: k };
const LINK_TOOLS = [['Kahoot', 'https://create.kahoot.it'], ['Quizizz', 'https://quizizz.com'], ['Wordwall', 'https://wordwall.net'], ['Blooket', 'https://www.blooket.com'], ['Padlet', 'https://padlet.com'], ['Canva', 'https://www.canva.com'], ['Desmos', 'https://www.desmos.com'], ['PhET simulations', 'https://phet.colorado.edu'], ['Nearpod', 'https://nearpod.com'], ['Scratch', 'https://scratch.mit.edu'], ['Other', '']];
const QUESTION_KINDS = ['quiz', 'worksheet', 'exit', 'video'];
const MARKABLE = ['quiz', 'worksheet', 'exit', 'video', 'writing', 'file'];
const matYt = u => { const m = String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : null; };
function formEmbed(u) {
  u = String(u || '');
  if (/docs\.google\.com\/forms\//.test(u)) return u.replace(/\/(edit|viewform)(\?.*)?$/, '/viewform') + (u.includes('?') ? '&' : '?') + 'embedded=true';
  if (/forms\.(office|microsoft)\.com/.test(u)) return u + (u.includes('?') ? '&' : '?') + 'embed=true';
  return null;
}

// ---------- Shared question editor ----------
function questionEditorHtml(qs, key) {
  return qs.map((q, i) => `<div class="panel act-edit" data-qi="${i}">
      <div class="act-edit-top"><span class="act-num">${i + 1}</span>
        <select data-qf="type" aria-label="Question type">${Object.entries(Q_TYPES).map(([v, n]) => `<option value="${v}"${v === q.type ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <input type="number" data-qf="marks" value="${esc(q.marks || 1)}" min="1" max="20" aria-label="Marks"><span class="meta">marks</span>
        <button type="button" class="link-btn" data-qrm="${i}">Remove</button></div>
      <label>Question <textarea data-qf="question" rows="2">${esc(q.question || '')}</textarea></label>
      ${['multiple_choice', 'true_false'].includes(q.type) ? `<label>Options (one per line) <textarea data-qf="options" rows="4">${esc((q.options || []).join('\n'))}</textarea></label>` : ''}
      <label class="key-field">🔒 Answer (only you see this)${q.type === 'fill_blank' ? ' – separate other accepted answers with |' : ''} <input type="text" data-qk value="${esc((key[i] || {}).answer || '')}"></label>
    </div>`).join('') + '<button type="button" class="pill pill-soft big" data-qadd>+ Add a question</button>';
}

// ---------- Teacher: the "Add to this lesson" dialog ----------
function ensureItemDialog() {
  let d = document.getElementById('item-dialog');
  if (d) return d;
  d = document.createElement('dialog');
  d.id = 'item-dialog'; d.className = 'dlg wide-dlg item-dlg';
  d.innerHTML = '<div class="item-wrap"><header class="path-head"><h2 id="item-title">Add to this lesson</h2><button type="button" class="link-btn" data-iclose>✕ Close</button></header><div id="item-body"></div></div>';
  document.body.appendChild(d);
  d.querySelector('[data-iclose]').addEventListener('click', () => d.close());
  return d;
}

async function openItemBuilder(lesson, course, onSaved) {
  const dlg = ensureItemDialog(), body = dlg.querySelector('#item-body'), title = dlg.querySelector('#item-title');
  let st = null;   // the item being built
  function menu() {
    title.textContent = 'Add to “' + lesson.title + '”';
    body.innerHTML = `<p class="hint">Choose what to add. You can add as many as you like to one lesson.</p>
      <div class="tool-grid">${TOOLS.map(t => `<button type="button" class="tool" data-tool="${t.k}"><span class="tool-ic">${t.ic}</span><b>${esc(t.name)}</b><span>${esc(t.desc)}</span>${t.ai ? '<i class="ai-badge">✨ Gemini</i>' : ''}</button>`).join('')}</div>`;
  }
  function start(k) {
    st = { kind: k, title: '', instructions: '', due: '', data: {}, key: [] };
    if (QUESTION_KINDS.includes(k)) st.data.questions = [];
    if (k === 'flashcards') st.data.cards = [{ front: '', back: '' }];
    if (k === 'activities') st.data.items = [];
    if (k === 'writing') Object.assign(st.data, { prompt: '', tips: [], word_target: '', success_criteria: [] });
    if (k === 'file') st.data.handin = true;
    if (k === 'exit') st.title = 'Exit ticket';
    draw();
  }
  const aiRow = (label) => `<div class="ai-row panel"><div class="obj-filters">
      ${['quiz', 'worksheet', 'video', 'flashcards'].includes(st.kind) ? `<label>How many <select id="ai-count">${(st.kind === 'flashcards' ? [6, 8, 10, 12, 15] : [3, 5, 8, 10, 12, 15]).map(n => `<option${n === (st.kind === 'video' ? 5 : 8) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
      ${st.kind === 'activities' ? '<label>How many <select id="ai-count"><option>1</option><option>2</option><option selected>3</option><option>4</option></select></label>' : ''}
      <label>Difficulty <select id="ai-level"><option value="easier (support)">Easier</option><option value="on level" selected>On level</option><option value="harder (challenge)">Harder</option></select></label>
      <label>Notes (optional) <input type="text" id="ai-notes" maxlength="300" placeholder="For example: use football examples"></label></div>
      <button type="button" class="btn btn-red" id="ai-go">✨ ${label}</button>
      <p class="meta">Only the objective, grade, subject and your notes are sent to Gemini. Always check what it creates.</p></div>`;

  function draw() {
    const t = TOOL(st.kind);
    title.innerHTML = `<span class="tool-ic sm">${t.ic}</span> ${esc(t.name)}`;
    let f = '';
    if (st.kind === 'file') f = `<label>File (PDF, Word, PowerPoint, Excel or picture, up to 20 MB) <input type="file" id="it-file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"></label>
        <label class="remember row"><input type="checkbox" id="it-handin" ${st.data.handin ? 'checked' : ''}> Students hand in their completed work (photo or file)</label>`;
    if (st.kind === 'form') f = `<div class="helper-row"><a class="pill pill-soft big" href="https://forms.new" target="_blank" rel="noopener">+ Create a new Google Form ↗</a><a class="pill pill-soft big" href="https://forms.office.com" target="_blank" rel="noopener">+ Create a Microsoft Form ↗</a></div>
        <p class="note">When your form is ready, click <b>Send</b> in Google Forms, choose the 🔗 link tab, copy it and paste it here. Google Forms can also mark quizzes and collect the results for you.</p>
        <label>Form link <input type="url" id="it-url" value="${esc(st.data.url || '')}" placeholder="https://docs.google.com/forms/... or https://forms.gle/..."></label>`;
    if (st.kind === 'link') f = `<p class="hint">Which tool?</p><div class="cur-grades">${LINK_TOOLS.map(([n, u]) => `<button type="button" class="chip ${st.data.tool === n ? 'on' : ''}" data-lt="${esc(n)}" data-lu="${esc(u)}">${esc(n)}</button>`).join('')}</div>
        ${st.data.tool && st.data.tool !== 'Other' ? `<p class="meta">Make your ${esc(st.data.tool)} activity at <a href="${esc((LINK_TOOLS.find(x => x[0] === st.data.tool) || [])[1])}" target="_blank" rel="noopener">${esc(st.data.tool)} ↗</a>, then copy its share link.</p>` : ''}
        <label>Link for students <input type="url" id="it-url" value="${esc(st.data.url || '')}" placeholder="https://..."></label>`;
    if (st.kind === 'video') f = `<label>YouTube link <input type="url" id="it-url" value="${esc(st.data.url || '')}" placeholder="https://www.youtube.com/watch?v=..."></label>
        ${matYt(st.data.url) ? `<div class="video-box"><iframe src="https://www.youtube-nocookie.com/embed/${matYt(st.data.url)}" title="Video preview" allowfullscreen></iframe></div>` : ''}
        <p class="hint">Questions under the video (optional)</p>` + aiRow('Write questions with Gemini') + `<div id="q-editor">${questionEditorHtml(st.data.questions, st.key)}</div>`;
    if (['quiz', 'worksheet', 'exit'].includes(st.kind)) f = aiRow(st.kind === 'exit' ? 'Write an exit ticket with Gemini' : 'Create with Gemini') +
        `<label>Success criteria (one per line) <textarea id="it-sc" rows="2">${esc((st.data.success_criteria || []).join('\n'))}</textarea></label><div id="q-editor">${questionEditorHtml(st.data.questions, st.key)}</div>`;
    if (st.kind === 'writing') f = aiRow('Draft the task with Gemini') + `
        <label>Writing prompt for students <textarea id="w-prompt" rows="3">${esc(st.data.prompt || '')}</textarea></label>
        <div class="two"><label>Planning tips (one per line) <textarea id="w-tips" rows="4">${esc((st.data.tips || []).join('\n'))}</textarea></label>
        <label>Success criteria (one per line) <textarea id="w-sc" rows="4">${esc((st.data.success_criteria || []).join('\n'))}</textarea></label></div>
        <div class="two"><label>Word target (optional) <input type="number" id="w-words" min="20" max="3000" value="${esc(st.data.word_target || '')}"></label>
        <label class="key-field">🔒 What a strong answer includes (only you see this) <textarea id="w-key" rows="3">${esc(((st.key[0] || {}).marking_points || []).join('\n'))}</textarea></label></div>
        <label class="remember row"><input type="checkbox" id="w-upload" ${st.data.allow_upload !== false ? 'checked' : ''}> Students can also upload a photo of handwritten work</label>`;
    if (st.kind === 'flashcards') f = aiRow('Create cards with Gemini') + `<p class="hint">Cards</p><div id="fc-editor">${st.data.cards.map((c, i) => `<div class="fc-edit" data-ci="${i}"><span class="act-num">${i + 1}</span><input type="text" data-cf="front" value="${esc(c.front)}" placeholder="Front: word or question"><input type="text" data-cf="back" value="${esc(c.back)}" placeholder="Back: meaning or answer"><button type="button" class="link-btn" data-crm="${i}">Remove</button></div>`).join('')}
        <button type="button" class="pill pill-soft big" data-cadd>+ Add a card</button></div>`;
    if (st.kind === 'activities') f = aiRow('Create activities with Gemini') + `<div id="a-editor">${st.data.items.map((a, i) => `<div class="panel act-edit" data-ai="${i}">
          <div class="act-edit-top"><span class="act-num">${i + 1}</span><input type="text" data-af="name" value="${esc(a.name || '')}" placeholder="Activity name"><input type="number" data-af="minutes" value="${esc(a.minutes || '')}" min="1" max="120"><span class="meta">min</span><button type="button" class="link-btn" data-arm="${i}">Remove</button></div>
          <label>Materials <input type="text" data-af="materials" value="${esc(a.materials || '')}"></label>
          <label>Steps for students (one per line) <textarea data-af="steps" rows="4">${esc((a.steps || []).join('\n'))}</textarea></label></div>`).join('')}
        <button type="button" class="pill pill-soft big" data-aadd>+ Add an activity</button></div>`;
    body.innerHTML = `<button type="button" class="link-btn" data-back-menu>‹ All tools</button>
      <div class="item-form">
        <label>Title students will see <input type="text" id="it-title" maxlength="200" value="${esc(st.title)}" placeholder="For example: Fractions practice"></label>
        <div class="panel op-box" id="it-obj"></div>
        ${f}
        <label>Instructions for students (optional) <textarea id="it-instr" rows="2" maxlength="1000">${esc(st.instructions)}</textarea></label>
        <label class="due">Due date (optional) <input type="date" id="it-due" value="${esc(st.due)}"></label>
        <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-back-menu>Cancel</button><button type="button" class="btn btn-red auth-btn" id="it-save">Add to lesson</button></div>
      </div>`;
    st.picker = objectivePicker(body.querySelector('#it-obj'), course, st.objective || lesson.objective_text || '');
  }
  // keep typed values when redrawing
  function capture() {
    if (st.picker) st.objective = st.picker.value();
    const v = id => { const el = body.querySelector('#' + id); return el ? el.value : undefined; };
    if (v('it-title') !== undefined) st.title = v('it-title');
    if (v('it-instr') !== undefined) st.instructions = v('it-instr');
    if (v('it-due') !== undefined) st.due = v('it-due');
    if (v('it-url') !== undefined) st.data.url = v('it-url').trim();
    const h = body.querySelector('#it-handin'); if (h) st.data.handin = h.checked;
    if (v('it-sc') !== undefined) st.data.success_criteria = v('it-sc').split('\n').map(s => s.trim()).filter(Boolean);
    if (v('w-prompt') !== undefined) {
      st.data.prompt = v('w-prompt'); st.data.tips = v('w-tips').split('\n').map(s => s.trim()).filter(Boolean);
      st.data.success_criteria = v('w-sc').split('\n').map(s => s.trim()).filter(Boolean); st.data.word_target = v('w-words') ? Number(v('w-words')) : '';
      st.key = [{ marking_points: v('w-key').split('\n').map(s => s.trim()).filter(Boolean) }];
      st.data.allow_upload = body.querySelector('#w-upload').checked;
    }
  }
  body.addEventListener('input', e => {
    const t = e.target;
    const qi = t.closest('[data-qi]');
    if (qi) { const i = Number(qi.dataset.qi), q = st.data.questions[i];
      if (t.dataset.qk !== undefined) { st.key[i] = st.key[i] || {}; st.key[i].answer = t.value; }
      else if (t.dataset.qf) q[t.dataset.qf] = t.dataset.qf === 'options' ? t.value.split('\n').map(s => s.trim()).filter(Boolean) : t.dataset.qf === 'marks' ? Number(t.value) || 1 : t.value; }
    const ci = t.closest('[data-ci]'); if (ci && t.dataset.cf) st.data.cards[Number(ci.dataset.ci)][t.dataset.cf] = t.value;
    const ai = t.closest('[data-ai]'); if (ai && t.dataset.af) { const a = st.data.items[Number(ai.dataset.ai)]; a[t.dataset.af] = t.dataset.af === 'steps' ? t.value.split('\n').map(s => s.trim()).filter(Boolean) : t.dataset.af === 'minutes' ? Number(t.value) || null : t.value; }
  });
  body.addEventListener('change', e => {
    if (e.target.dataset.qf === 'type') { capture(); const q = st.data.questions[Number(e.target.closest('[data-qi]').dataset.qi)]; q.type = e.target.value; if (q.type === 'true_false') q.options = ['True', 'False']; draw(); }
    if (e.target.id === 'it-url' && st.kind === 'video') { capture(); draw(); }
  });
  body.addEventListener('click', async e => {
    const t = e.target;
    const tool = t.closest('[data-tool]'); if (tool) return start(tool.dataset.tool);
    if (t.closest('[data-back-menu]')) return menu();
    const lt = t.closest('[data-lt]'); if (lt) { capture(); st.data.tool = lt.dataset.lt; if (!st.title) st.title = lt.dataset.lt + ' activity'; return draw(); }
    if (t.closest('[data-qadd]')) { capture(); st.data.questions.push({ type: 'multiple_choice', question: '', options: ['', '', '', ''], marks: 1 }); st.key.push({ answer: '' }); return draw(); }
    const qrm = t.closest('[data-qrm]'); if (qrm) { capture(); const i = Number(qrm.dataset.qrm); st.data.questions.splice(i, 1); st.key.splice(i, 1); return draw(); }
    if (t.closest('[data-cadd]')) { capture(); st.data.cards.push({ front: '', back: '' }); return draw(); }
    const crm = t.closest('[data-crm]'); if (crm) { capture(); st.data.cards.splice(Number(crm.dataset.crm), 1); return draw(); }
    if (t.closest('[data-aadd]')) { capture(); st.data.items.push({ name: '', minutes: 10, steps: [] }); return draw(); }
    const arm = t.closest('[data-arm]'); if (arm) { capture(); st.data.items.splice(Number(arm.dataset.arm), 1); return draw(); }
    if (t.id === 'ai-go') return runAi(t);
    if (t.id === 'it-save') return save(t);
  });

  async function runAi(btn) {
    capture();
    const obj = st.objective;
    if (!obj) return say('Choose a learning objective first, or write your own.');
    const kindMap = { quiz: 'quiz', worksheet: 'worksheet', exit: 'exit', video: 'quiz', writing: 'writing', flashcards: 'flashcards', activities: 'activities' };
    const cnt = body.querySelector('#ai-count');
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Gemini is writing… (up to 30 seconds)';
    try {
      const { data, error } = await db.functions.invoke(AI_FN, { body: { kind: kindMap[st.kind], objective: obj, curriculum: lCurName(course.curriculum || ''), grade: course.grade || '', subject: course.subject || '',
        count: cnt ? Number(cnt.value) : undefined, level: body.querySelector('#ai-level').value, notes: body.querySelector('#ai-notes').value.trim() } });
      if (error) { let m = 'Gemini couldn’t create this right now. Please try again.'; try { const j = await error.context.json(); if (j.error) m = j.error; } catch (_) {} throw new Error(m); }
      if (data.error) throw new Error(data.error);
      if (!st.title && data.title) st.title = data.title;
      if (QUESTION_KINDS.includes(st.kind)) {
        const qs = data.questions || [];
        st.data.questions = qs.map(q => ({ type: q.type, question: q.question, options: q.options || [], marks: q.marks || 1 }));
        st.key = qs.map(q => ({ answer: q.answer || '', explanation: q.explanation || '' }));
        if (data.instructions && !st.instructions) st.instructions = data.instructions;
        if (data.success_criteria) st.data.success_criteria = data.success_criteria;
      }
      if (st.kind === 'flashcards') st.data.cards = (data.cards || []).map(c => ({ front: c.front || '', back: c.back || '' }));
      if (st.kind === 'activities') { st.data.items = data.activities || []; st.data.success_criteria = data.success_criteria || []; }
      if (st.kind === 'writing') { Object.assign(st.data, { prompt: data.prompt || '', tips: data.tips || [], word_target: data.word_target || '', success_criteria: data.success_criteria || [] }); st.key = [{ marking_points: data.marking_points || [] }]; }
      draw(); say('Done! Check it, change anything you like, then click Add to lesson.');
    } catch (err) { say(err.message); btn.disabled = false; btn.textContent = label; }
  }

  async function save(btn) {
    capture();
    const k = st.kind, d = st.data;
    if (!st.title.trim()) return say('Give it a title students will see.');
    if (k === 'file' && !body.querySelector('#it-file').files[0]) return say('Choose a file to upload.');
    if (['form', 'link'].includes(k) && !/^https?:\/\//.test(d.url || '')) return say('Paste the full link, starting with https://');
    if (k === 'video' && !matYt(d.url)) return say('Paste a YouTube link, for example https://www.youtube.com/watch?v=...');
    if (['quiz', 'worksheet', 'exit'].includes(k) && !d.questions.length) return say('Add at least one question, or use Gemini.');
    if (QUESTION_KINDS.includes(k)) {
      if (d.questions.some(q => !String(q.question || '').trim())) return say('Every question needs some text.');
      if (d.questions.some(q => ['multiple_choice', 'true_false'].includes(q.type) && (q.options || []).filter(Boolean).length < 2)) return say('Multiple-choice questions need at least two options.');
      if (d.questions.some((q, i) => ['multiple_choice', 'true_false', 'fill_blank'].includes(q.type) && !String((st.key[i] || {}).answer || '').trim())) return say('Add the answer for each multiple-choice, true/false and fill-in-the-blank question.');
      d.questions.forEach(q => q.options = (q.options || []).filter(Boolean));
    }
    if (k === 'writing' && !String(d.prompt || '').trim()) return say('Write the prompt for students.');
    if (k === 'flashcards') { d.cards = d.cards.filter(c => c.front.trim() && c.back.trim()); if (!d.cards.length) return say('Add at least one card with a front and a back.'); }
    if (k === 'activities' && (!d.items.length || d.items.some(a => !String(a.name || '').trim() || !(a.steps || []).length))) return say('Every activity needs a name and at least one step.');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      if (k === 'file') {
        const file = body.querySelector('#it-file').files[0];
        if (file.size > 20 * 1024 * 1024) throw new Error('Files must be smaller than 20 MB.');
        const path = `${course.id}/${lesson.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
        const up = await db.storage.from('lesson-files').upload(path, file, { contentType: file.type || undefined });
        if (up.error) throw up.error;
        Object.assign(d, { path, name: file.name, type: file.type, size: file.size });
      }
      if (st.instructions.trim()) d.instructions = st.instructions.trim();
      if (st.objective) d.objective = st.objective;
      const { data: pos } = await db.from('lesson_items').select('position').eq('lesson_id', lesson.id).order('position', { ascending: false }).limit(1);
      const { data: it, error } = await db.from('lesson_items').insert({ lesson_id: lesson.id, kind: k, title: st.title.trim(), data: d, due_date: st.due || null, position: ((pos && pos[0] && pos[0].position) || 0) + 1 }).select().single();
      if (error) throw error;
      const needsKey = QUESTION_KINDS.includes(k) && d.questions.length || k === 'writing';
      if (needsKey) { const r = await db.from('item_keys').upsert({ item_id: it.id, answers: k === 'writing' ? st.key : d.questions.map((q, i) => ({ answer: String((st.key[i] || {}).answer || '').trim(), explanation: (st.key[i] || {}).explanation || '' })) }); if (r.error) throw r.error; }
      dlg.close(); say('Added. Students in this course have been told.'); if (onSaved) onSaved();
    } catch (err) { btn.disabled = false; btn.textContent = 'Add to lesson'; say(friendly(err)); }
  }

  menu();
  if (!dlg.open) dlg.showModal();
}

// ---------- Teacher: items under each lesson ----------
async function loadTeacherItems(lessons, course) {
  const ids = lessons.map(l => l.id);
  const { data } = ids.length ? await db.from('lesson_items').select('*').in('lesson_id', ids).order('position') : { data: [] };
  const byLesson = {};
  (data || []).forEach(i => (byLesson[i.lesson_id] = byLesson[i.lesson_id] || []).push(i));
  lessons.forEach(l => {
    const row = document.getElementById('lesson-' + l.id); if (!row) return;
    const host = row.closest('.lesson');
    let box = document.getElementById('items-' + l.id);
    if (!box) { box = document.createElement('div'); box.id = 'items-' + l.id; box.className = 'items-row'; host.after(box); }
    const items = byLesson[l.id] || [];
    box.innerHTML = items.map(i => `<div class="item-chip" id="item-${i.id}" title="${esc(i.data.objective ? '🎯 ' + i.data.objective : '')}"><span>${TOOL(i.kind).ic}</span><b>${esc(i.title)}</b><span class="meta">${esc(TOOL(i.kind).name)}${i.data.objective ? ' · 🎯' : ''}${i.due_date ? ' · due ' + new Date(i.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
        ${MARKABLE.includes(i.kind) && !(i.kind === 'file' && !i.data.handin) && !(i.kind === 'video' && !(i.data.questions || []).length) ? `<button type="button" class="pill pill-live" data-iresults="${i.id}">Results</button>` : ''}
        <button type="button" class="link-btn" data-idel="${i.id}">Delete</button></div>`).join('') +
      `<button type="button" class="pill pill-soft big add-item" data-iadd="${l.id}">+ Add to this lesson</button>`;
    box.onclick = async e => {
      const a = e.target.closest('[data-iadd]'), r = e.target.closest('[data-iresults]'), d = e.target.closest('[data-idel]');
      if (a) openItemBuilder(l, course, () => loadTeacherItems(lessons, course));
      if (r) showItemResults(items.find(x => x.id === Number(r.dataset.iresults)));
      if (d) { if (!confirm('Delete this from the lesson? Students’ answers to it will be deleted too.')) return;
        const it = items.find(x => x.id === Number(d.dataset.idel));
        const { error } = await db.from('lesson_items').delete().eq('id', it.id);
        if (error) return say(friendly(error));
        if (it.kind === 'file' && it.data.path) db.storage.from('lesson-files').remove([it.data.path]);
        loadTeacherItems(lessons, course); }
    };
  });
  const m = location.hash.match(/^#item-(\d+)$/);
  if (m) { const it = (data || []).find(x => x.id === Number(m[1])); if (it && MARKABLE.includes(it.kind)) showItemResults(it); }
}

async function showItemResults(item) {
  const dlg = document.getElementById('results-dialog'), body = dlg.querySelector('.results-body');
  dlg.querySelector('h2').textContent = 'Results: ' + item.title;
  body.innerHTML = '<p class="empty">Loading…</p>'; dlg.showModal();
  const [{ data: rows }, { data: k }] = await Promise.all([db.rpc('item_results', { iid: item.id }), db.from('item_keys').select('answers').eq('item_id', item.id).maybeSingle()]);
  const qs = item.data.questions || [], keys = (k && k.answers) || [];
  const total = qs.reduce((s, q) => s + (Number(q.marks) || 1), 0);
  const keyBox = qs.length ? `<details class="key-box"><summary>🔒 Answer key</summary><ol>${qs.map((q, i) => `<li>${esc(q.question)}<br><b>${esc((keys[i] || {}).answer || '—')}</b></li>`).join('')}</ol></details>`
    : item.kind === 'writing' && keys[0] && (keys[0].marking_points || []).length ? `<details class="key-box"><summary>🔒 What a strong answer includes</summary><ul>${keys[0].marking_points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></details>` : '';
  body.innerHTML = keyBox + ((rows || []).length ? rows.map(r => `<article class="panel result" data-sid="${r.student_id}">
      <header><b>${esc(r.full_name || 'Student')}</b><span class="meta">Handed in ${new Date(r.submitted_at).toLocaleString('en-GB')}</span><span class="tag ${r.needs_marking ? 'tag-wait' : 'tag-now'}">${r.needs_marking ? 'Needs marking' : 'Marked'}</span></header>
      ${qs.length ? `<p>Auto-marked: <b>${r.auto_score ?? 0} / ${r.auto_total ?? 0}</b></p><ol class="result-answers">${qs.map((q, i) => { const a = (r.answers || [])[i] ?? ''; const auto = ['multiple_choice', 'true_false', 'fill_blank'].includes(q.type);
          const ok = auto && String((keys[i] || {}).answer || '').toLowerCase().split('|').map(s => s.trim()).includes(String(a).trim().toLowerCase().replace(/\.$/, ''));
          return `<li><span class="meta">${esc(q.question)}</span><br>${auto ? (ok ? '✅ ' : '❌ ') : '✍️ '}${esc(a || '(no answer)')}</li>`; }).join('')}</ol>` : ''}
      ${r.text_answer ? `<div class="written">${esc(r.text_answer).replace(/\n/g, '<br>')}</div><p class="meta">${r.text_answer.trim().split(/\s+/).length} words</p>` : ''}
      ${r.file_path ? `<button type="button" class="pill pill-soft" data-handin="${esc(r.file_path)}">📎 ${esc(r.file_name || 'Open their work')}</button>` : ''}
      <div class="two"><label>Score${total ? ` (out of ${total})` : ''} <input type="number" name="score" min="0" step="0.5" value="${r.teacher_score ?? (r.needs_marking || !qs.length ? '' : r.auto_score ?? '')}"></label>
        <label>Comment for the student <input type="text" name="comment" maxlength="500" value="${esc(r.teacher_comment || '')}"></label></div>
      <button type="button" class="btn btn-red" data-save-mark>Save mark</button></article>`).join('') : '<p class="empty">No one has handed this in yet.</p>');
  body.onclick = async e => {
    const h = e.target.closest('[data-handin]');
    if (h) { const { data, error } = await db.storage.from('hand-ins').createSignedUrl(h.dataset.handin, 600); if (error) return say(friendly(error)); return window.open(data.signedUrl, '_blank', 'noopener'); }
    const b = e.target.closest('[data-save-mark]'); if (!b) return;
    const card = b.closest('[data-sid]'), score = card.querySelector('[name=score]').value;
    const { error } = await db.from('item_responses').update({ teacher_score: score === '' ? null : Number(score), teacher_comment: card.querySelector('[name=comment]').value.trim() || null, needs_marking: false }).eq('item_id', item.id).eq('student_id', card.dataset.sid);
    if (error) return say(friendly(error));
    say('Saved. The student has been told.'); showItemResults(item);
  };
}

// ---------- Students ----------
function questionsForm(item, resp) {
  const qs = item.data.questions || [], ans = (resp && resp.answers) || [];
  if (!qs.length) return '';
  return `<form class="lesson-quiz" data-iquiz="${item.id}">${qs.map((q, i) => `<fieldset class="quiz-q"><legend><span class="act-num">${i + 1}</span> ${esc(q.question)} <span class="meta">(${q.marks || 1} mark${(q.marks || 1) == 1 ? '' : 's'})</span></legend>
      ${['multiple_choice', 'true_false'].includes(q.type) ? (q.options || []).map(o => `<label class="remember"><input type="radio" name="q${i}" value="${esc(o)}" ${String(ans[i]) === String(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')
        : q.type === 'long_answer' ? `<textarea name="q${i}" rows="4" maxlength="3000">${esc(ans[i] || '')}</textarea>` : `<input type="text" name="q${i}" maxlength="500" value="${esc(ans[i] || '')}">`}</fieldset>`).join('')}
    <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-print>🖨️ Print</button><button class="btn btn-red auth-btn">${resp ? 'Hand in again' : 'Hand in my answers'}</button></div></form>`;
}
function resultBox(resp) {
  if (!resp) return '';
  return `<div class="result-box">✅ Handed in ${new Date(resp.submitted_at).toLocaleDateString('en-GB')}${resp.teacher_score != null ? ` · 🏅 Score: <b>${resp.teacher_score}</b>` : resp.auto_total ? ` · Auto-marked: <b>${resp.auto_score} / ${resp.auto_total}</b>${resp.needs_marking ? ' (your teacher will mark the rest)' : ''}` : resp.needs_marking ? ' · Waiting for your teacher to mark it' : ''}
    ${resp.teacher_comment ? `<p>💬 ${esc(resp.teacher_comment)}</p>` : ''}</div>`;
}
function handInBox(item, resp, opts = {}) {
  return `<form class="panel submit-box" data-ihand="${item.id}">
    ${opts.text ? `<label>Your answer <textarea name="txt" rows="${opts.rows || 8}" maxlength="20000">${esc((resp && resp.text_answer) || '')}</textarea></label><p class="meta wordcount">${opts.target ? 'Aim for about ' + opts.target + ' words · ' : ''}<span>0</span> words</p>` : ''}
    ${opts.file ? `<label>${opts.text ? 'Or add a photo or file of your work' : 'Upload a photo or file of your completed work'} (up to 10 MB) <input type="file" name="file" accept="image/*,.pdf,.doc,.docx"></label>${resp && resp.file_name ? `<p class="meta">Uploaded: ${esc(resp.file_name)}</p>` : ''}` : ''}
    <button class="btn btn-red auth-btn">${opts.label || (resp ? 'Hand in again' : 'Hand in')}</button></form>`;
}
function itemViewHtml(item, resp) {
  const d = item.data || {}, instr = (d.objective ? `<p class="obj-line">🎯 <b>Learning objective:</b> ${esc(d.objective)}</p>` : '') + (d.instructions ? `<p class="quiz-instr">${esc(d.instructions)}</p>` : '');
  const sc = (d.success_criteria || []).length ? `<div class="sc-box"><b>Success criteria</b><ul>${d.success_criteria.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : '';
  const due = item.due_date ? `<p class="meta">📅 Due ${new Date(item.due_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>` : '';
  const done = resultBox(resp);
  switch (item.kind) {
    case 'file': return due + instr + `<div class="file-open"><span class="tool-ic">📄</span><div><b>${esc(d.name || 'Worksheet')}</b><span class="meta">${d.size ? Math.round(d.size / 1024) + ' KB' : ''}</span></div><button type="button" class="btn btn-red" data-openfile="${esc(d.path)}">Open</button></div>` + done + (d.handin ? handInBox(item, resp, { file: true }) : '');
    case 'form': { const em = formEmbed(d.url); return due + instr + (em ? `<div class="form-box"><iframe src="${esc(em)}" title="${esc(item.title)}" loading="lazy"></iframe></div>` : '') + `<p><a class="btn btn-white outline" href="${esc(d.url)}" target="_blank" rel="noopener">Open the form in a new tab ↗</a></p>` + done + handInBox(item, resp, { label: resp ? 'Done ✅' : 'I’ve filled in the form ✅' }); }
    case 'link': return due + instr + `<p><a class="btn btn-red" href="${esc(d.url)}" target="_blank" rel="noopener">Open ${esc(d.tool && d.tool !== 'Other' ? d.tool : 'the activity')} ↗</a></p>` + done + handInBox(item, resp, { label: resp ? 'Done ✅' : 'I’ve finished ✅' });
    case 'video': return due + instr + `<div class="video-box"><iframe src="https://www.youtube-nocookie.com/embed/${matYt(d.url)}" title="${esc(item.title)}" allowfullscreen loading="lazy"></iframe></div>` + done + ((d.questions || []).length ? questionsForm(item, resp) : handInBox(item, resp, { label: resp ? 'Watched ✅' : 'I’ve watched it ✅' }));
    case 'quiz': case 'worksheet': case 'exit': return due + instr + sc + done + questionsForm(item, resp);
    case 'writing': return due + `<div class="writing-prompt"><b>✍️ Your task</b><p>${esc(d.prompt || '').replace(/\n/g, '<br>')}</p></div>` + ((d.tips || []).length ? `<div class="sc-box tips"><b>Tips</b><ul>${d.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '') + sc + instr + done + handInBox(item, resp, { text: true, file: d.allow_upload !== false, target: d.word_target });
    case 'flashcards': return instr + `<div class="fc" data-fc="${item.id}" data-i="0"><button type="button" class="fc-card" data-flip><span class="fc-face">${esc((d.cards[0] || {}).front || '')}</span><span class="meta">Tap to flip</span></button>
        <div class="fc-bar"><button type="button" class="pill pill-soft" data-fcprev>‹ Back</button><span class="meta fc-pos">1 / ${d.cards.length}</span><button type="button" class="pill pill-soft" data-fcshuffle>🔀 Shuffle</button><button type="button" class="pill pill-live" data-fcnext>Next ›</button></div></div>` + done + handInBox(item, resp, { label: resp ? 'Practised ✅' : 'I’ve practised these ✅' });
    case 'activities': return due + instr + sc + `<div class="act-list">${(d.items || []).map((a, i) => `<article class="act-card"><div class="act-top"><span class="act-num">${i + 1}</span><div><h4>${esc(a.name || '')}</h4><span class="meta">${a.minutes ? esc(a.minutes) + ' min' : ''}</span></div></div>${a.materials ? `<p class="act-mat"><b>You need:</b> ${esc(a.materials)}</p>` : ''}<ol class="act-steps">${(a.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol></article>`).join('')}</div>` + done + handInBox(item, resp, { label: resp ? 'Done ✅' : 'I’ve finished ✅' });
  }
  return '';
}

async function initStudentItems(lessons, isEnrolled, onDone) {
  const ids = lessons.map(l => l.id);
  if (!ids.length) return;
  const { data: items } = await db.from('lesson_items').select('*').in('lesson_id', ids).order('position');
  if (!(items || []).length) return;
  const { data: { session } } = await db.auth.getSession();
  const { data: rs } = await db.from('item_responses').select('*').in('item_id', items.map(i => i.id)).eq('student_id', session.user.id);
  const resp = {}; (rs || []).forEach(r => resp[r.item_id] = r);
  const shuffled = {};
  function drawLists() {
    const byL = {}; items.forEach(i => (byL[i.lesson_id] = byL[i.lesson_id] || []).push(i));
    Object.entries(byL).forEach(([lid, list]) => {
      const row = document.getElementById('lesson-' + lid); if (!row) return;
      const host = row.closest('.lesson');
      let box = document.getElementById('sitems-' + lid);
      if (!box) { box = document.createElement('div'); box.id = 'sitems-' + lid; box.className = 'items-row student'; (host.nextElementSibling && host.nextElementSibling.classList.contains('lesson-material') ? host.nextElementSibling : host).after(box); }
      box.innerHTML = list.map(i => `<div class="sitem" id="item-${i.id}"><button type="button" class="item-chip open" data-iopen="${i.id}" aria-expanded="false"><span>${TOOL(i.kind).ic}</span><b>${esc(i.title)}</b><span class="meta">${esc(TOOL(i.kind).name)}</span>${resp[i.id] ? '<span class="tag tag-now">Done</span>' : i.due_date ? `<span class="tag tag-wait">Due ${new Date(i.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>` : ''}</button><div class="panel item-view" id="iv-${i.id}" hidden></div></div>`).join('');
    });
  }
  drawLists(); window._drawItems = drawLists;
  const root = document.getElementById('lessons');
  const open = id => { const it = items.find(x => x.id === id), v = document.getElementById('iv-' + id); v.innerHTML = itemViewHtml(it, resp[id]); v.hidden = false; v.previousElementSibling.setAttribute('aria-expanded', 'true'); };
  root.addEventListener('click', async e => {
    const o = e.target.closest('[data-iopen]');
    if (o) { if (!isEnrolled()) return say('Join the course first to open this.'); const id = Number(o.dataset.iopen), v = document.getElementById('iv-' + id); if (v.hidden) open(id); else { v.hidden = true; o.setAttribute('aria-expanded', 'false'); } return; }
    const f = e.target.closest('[data-openfile]');
    if (f) { const { data, error } = await db.storage.from('lesson-files').createSignedUrl(f.dataset.openfile, 900); if (error) return say(friendly(error)); return window.open(data.signedUrl, '_blank', 'noopener'); }
    if (e.target.closest('[data-print]')) return window.print();
    const fc = e.target.closest('[data-fc]');
    if (fc) {
      const it = items.find(x => x.id === Number(fc.dataset.fc)); let cards = shuffled[it.id] || it.data.cards, i = Number(fc.dataset.i);
      const face = fc.querySelector('.fc-face'), card = fc.querySelector('.fc-card');
      if (e.target.closest('[data-fcshuffle]')) { cards = shuffled[it.id] = it.data.cards.slice().sort(() => Math.random() - .5); i = 0; card.classList.remove('back'); }
      else if (e.target.closest('[data-flip]')) { card.classList.toggle('back'); face.textContent = card.classList.contains('back') ? cards[i].back : cards[i].front; return; }
      else if (e.target.closest('[data-fcnext]')) { i = (i + 1) % cards.length; card.classList.remove('back'); }
      else if (e.target.closest('[data-fcprev]')) { i = (i - 1 + cards.length) % cards.length; card.classList.remove('back'); }
      else return;
      fc.dataset.i = i; face.textContent = cards[i].front; fc.querySelector('.fc-pos').textContent = (i + 1) + ' / ' + cards.length;
    }
  });
  root.addEventListener('input', e => { const ta = e.target.closest('.submit-box textarea'); if (ta) { const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; ta.closest('.submit-box').querySelector('.wordcount span').textContent = w; } });
  root.addEventListener('submit', async e => {
    const quiz = e.target.closest('[data-iquiz]'), hand = e.target.closest('[data-ihand]');
    if (!quiz && !hand) return;
    e.preventDefault();
    const form = quiz || hand, id = Number(quiz ? quiz.dataset.iquiz : hand.dataset.ihand), it = items.find(x => x.id === id);
    let ans = [], txt = null, fpath = null, fname = null;
    if (quiz) {
      ans = it.data.questions.map((q, i) => { const el = form.querySelector(`[name=q${i}]:checked`) || form.querySelector(`[name=q${i}]:not([type=radio])`); return el ? el.value.trim() : ''; });
      const blank = ans.filter(a => !a).length;
      if (blank && !confirm(`You haven’t answered ${blank} question${blank === 1 ? '' : 's'}. Hand in anyway?`)) return;
    } else {
      if (form.txt) txt = form.txt.value;
      const file = form.file && form.file.files[0];
      if (it.kind === 'writing' && !String(txt || '').trim() && !file) return say('Write your answer, or upload a photo of your work.');
      if (it.kind === 'file' && !file && !(resp[id] && resp[id].file_path)) return say('Choose a photo or file of your work to upload.');
      if (file) {
        if (file.size > 10 * 1024 * 1024) return say('Files must be smaller than 10 MB.');
        fpath = `${id}/${session.user.id}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`; fname = file.name.slice(0, 150);
        const up = await db.storage.from('hand-ins').upload(fpath, file); if (up.error) return say(friendly(up.error));
      }
    }
    const btn = form.querySelector('.btn-red'); btn.disabled = true;
    const { data, error } = await db.rpc('submit_item', { iid: id, ans, txt, fpath, fname });
    if (error) { btn.disabled = false; return say(friendly(error)); }
    const { data: r } = await db.from('item_responses').select('*').eq('item_id', id).eq('student_id', session.user.id).maybeSingle();
    resp[id] = r; drawLists(); open(id);
    say(data.total ? `Handed in! You scored ${data.score} / ${data.total}${data.needs_marking ? ' so far. Your teacher will mark the rest.' : '. 🎉'}` : 'Handed in! 🎉');
    if (onDone) onDone(it.lesson_id);
  });
  const m = location.hash.match(/^#item-(\d+)$/);
  if (m && items.some(x => x.id === Number(m[1])) && isEnrolled()) { open(Number(m[1])); document.getElementById('item-' + m[1]).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
