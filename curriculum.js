// ===== Think Nest curriculum guide =====
// Uses db and esc() from app.js
const CUR_GRADES = ['KG1', 'KG2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
function curKey(label) {
  const s = String(label || '').toLowerCase();
  if (s.includes('british') || s.includes('igcse') || s.includes('cambridge') || s.includes('england')) return 'british';
  if (s.includes('ib') || s.includes('baccalaureate')) return 'ib';
  if (s.includes('american') || s.includes('common core')) return 'american';
  return null;
}
function gradeKey(g) { return g === 'KG' ? 'KG2' : g; }
// Turn "## Heading" and "- point" lines into HTML
function curDetailsHtml(text) {
  let html = '', open = false;
  String(text || '').split('\n').forEach(line => {
    const l = line.trim(); if (!l) return;
    if (l.startsWith('## ')) { if (open) { html += '</ul></section>'; open = false; } html += `<section class="cur-sub"><h4>${esc(l.slice(3))}</h4><ul>`; open = true; }
    else { if (!open) { html += '<section class="cur-sub"><ul>'; open = true; } html += `<li>${esc(l.replace(/^-\s*/, ''))}</li>`; }
  });
  return html + (open ? '</ul></section>' : '');
}
async function curGet(key, grade) {
  const { data } = await db.from('curriculum_grades').select('*').eq('curriculum', key).eq('grade', gradeKey(grade)).maybeSingle();
  return data;
}
function curCardHtml(row, opts = {}) {
  if (!row) return '';
  return `<div class="cur-head"><span class="cur-stage">${esc(row.stage || '')}</span><span class="meta">Ages ${esc(row.ages || '')}</span></div>
    <p class="cur-overview">${esc(row.overview || '')}</p>
    ${opts.short ? '' : `<div class="cur-details">${curDetailsHtml(row.details)}</div>`}`;
}

// ---------- Public curriculum page ----------
async function startCurriculumPage() {
  const p = new URLSearchParams(location.search);
  let key = curKey(p.get('c')) || 'british', grade = gradeKey(p.get('g')) || 'KG1';
  if (!CUR_GRADES.includes(grade)) grade = 'KG1';
  const { data: curricula } = await db.from('curricula').select('*').order('sort');
  const tabs = document.getElementById('cur-tabs'), chips = document.getElementById('cur-grades');
  if (!curricula || !curricula.length) { document.getElementById('cur-body').innerHTML = '<p class="empty">The curriculum guide isn’t available yet.</p>'; return; }
  tabs.innerHTML = curricula.map(c => `<button role="tab" data-c="${esc(c.key)}">${esc(c.name)}</button>`).join('');
  chips.innerHTML = CUR_GRADES.map(g => `<button class="chip" data-g="${g}">${g.replace('Grade ', 'Gr ')}</button>`).join('');
  async function show() {
    const c = curricula.find(x => x.key === key) || curricula[0];
    tabs.querySelectorAll('[data-c]').forEach(b => b.setAttribute('aria-selected', b.dataset.c === key));
    chips.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('on', b.dataset.g === grade));
    document.getElementById('cur-intro').innerHTML = `<h2>${esc(c.name)}</h2><p class="meta">${esc(c.full_name || '')}</p><p>${esc(c.intro || '')}</p>${c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener" class="cur-link">Official information ↗</a>` : ''}`;
    const row = await curGet(key, grade);
    document.getElementById('cur-body').innerHTML = row ? `<h3>${esc(grade)}</h3>` + curCardHtml(row) : '<p class="empty">No details for this grade yet.</p>';
    history.replaceState(null, '', `curriculum.html?c=${key}&g=${encodeURIComponent(grade)}`);
  }
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { key = b.dataset.c; show(); } });
  chips.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) { grade = b.dataset.g; show(); } });
  show();
}

// ---------- Box on the sign up page ----------
function curriculumHelper(form, boxId) {
  const box = document.getElementById(boxId); if (!box) return;
  async function update() {
    const key = curKey(form.curriculum.value), g = form.grade.value;
    if (!form.curriculum.value || !g) { box.hidden = true; return; }
    if (!key) { box.hidden = false; box.innerHTML = '<p class="meta">We’ll add a guide for this curriculum soon.</p>'; return; }
    const row = await curGet(key, g);
    box.hidden = !row;
    if (row) box.innerHTML = `<b>What you’ll learn</b>` + curCardHtml(row, { short: true }) + `<a href="curriculum.html?c=${key}&g=${encodeURIComponent(gradeKey(g))}" target="_blank" rel="noopener">See the full ${esc(gradeKey(g))} guide ↗</a>`;
  }
  form.grade.addEventListener('change', update);
  form.curriculum.addEventListener('change', update);
}

// ---------- Card on the student dashboard ----------
async function curriculumCard(profile) {
  const box = document.getElementById('my-curriculum'); if (!box || !profile) return;
  const key = curKey(profile.curriculum);
  if (!key || !profile.grade) return;
  const row = await curGet(key, profile.grade);
  if (!row) return;
  box.hidden = false;
  box.innerHTML = `<div class="cur-card-head"><div><h2>Your curriculum</h2><p class="meta">${esc(profile.curriculum)} · ${esc(gradeKey(profile.grade))}</p></div>
    <a class="pill pill-soft big" href="curriculum.html?c=${key}&g=${encodeURIComponent(gradeKey(profile.grade))}">See what you’ll learn →</a></div>` + curCardHtml(row, { short: true });
}

// ---------- Admin editor ----------
async function startCurriculumAdmin() {
  await initTeacher();
  const f = document.getElementById('cur-form'), cf = document.getElementById('cur-intro-form');
  const { data: curricula } = await db.from('curricula').select('*').order('sort');
  f.c.innerHTML = cf.c.innerHTML = (curricula || []).map(c => `<option value="${esc(c.key)}">${esc(c.name)}</option>`).join('');
  f.g.innerHTML = CUR_GRADES.map(g => `<option>${g}</option>`).join('');
  const preview = document.getElementById('cur-preview');
  async function loadGrade() {
    const row = await curGet(f.c.value, f.g.value) || {};
    f.stage.value = row.stage || ''; f.ages.value = row.ages || ''; f.overview.value = row.overview || ''; f.details.value = row.details || '';
    drawPreview();
  }
  function drawPreview() { preview.innerHTML = curCardHtml({ stage: f.stage.value, ages: f.ages.value, overview: f.overview.value, details: f.details.value }); }
  function loadIntro() { const c = (curricula || []).find(x => x.key === cf.c.value) || {}; cf.name.value = c.name || ''; cf.full_name.value = c.full_name || ''; cf.intro.value = c.intro || ''; cf.link.value = c.link || ''; }
  f.c.addEventListener('change', loadGrade); f.g.addEventListener('change', loadGrade);
  ['stage', 'ages', 'overview', 'details'].forEach(n => f[n].addEventListener('input', drawPreview));
  cf.c.addEventListener('change', loadIntro);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await db.from('curriculum_grades').update({ stage: f.stage.value.trim(), ages: f.ages.value.trim(), overview: f.overview.value.trim(), details: f.details.value.trim(), updated_at: new Date().toISOString() }).eq('curriculum', f.c.value).eq('grade', f.g.value);
    say(error ? friendly(error) : 'Saved. The guide is updated for everyone.');
  });
  cf.addEventListener('submit', async e => {
    e.preventDefault();
    const row = { name: cf.name.value.trim(), full_name: cf.full_name.value.trim(), intro: cf.intro.value.trim(), link: cf.link.value.trim() || null };
    const { error } = await db.from('curricula').update(row).eq('key', cf.c.value);
    if (error) return say(friendly(error));
    Object.assign(curricula.find(x => x.key === cf.c.value), row); say('Saved.');
  });
  document.getElementById('cur-view').addEventListener('click', () => window.open(`curriculum.html?c=${f.c.value}&g=${encodeURIComponent(f.g.value)}`, '_blank'));
  loadGrade(); loadIntro();
}
