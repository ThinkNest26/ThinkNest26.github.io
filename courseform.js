// ===== Think Nest: simpler "New course" form (tap to choose subject, curriculum and grade) =====
const CF_CURRICULA = { default: [['british', 'British'], ['ib', 'IB'], ['american', 'American']], Arabic: [['arabic_a', 'Arabic A (speakers)'], ['arabic_b', 'Arabic B (learners)']] };
const CF_CUR_SHORT = { british: 'British', ib: 'IB', american: 'American', arabic_a: 'Arabic A', arabic_b: 'Arabic B' };
const CF_GRADES = ['KG1', 'KG2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const CF_COLORS = { English: '#3E4B94', Maths: '#F27A6F', Science: '#2FA08A', Arabic: '#E3A43B' };
const CF_ICONS = { English: 'Aa', Maths: '+×', Science: '🔬', Arabic: 'أب' };
let cfTitleTouched = false, cfLastSuggested = '';
function cfForm() { return document.getElementById('course-form'); }
function cfSubject() { const f = cfForm(); return f.subject.value; }
function cfDraw() {
  const f = cfForm(); if (!f) return;
  const subj = f.subject.value, isOther = subj && !CF_COLORS[subj];
  f.querySelectorAll('[data-cf=subject] button').forEach(b => b.classList.toggle('on', b.dataset.v === subj || (b.dataset.v === 'other' && isOther)));
  f.querySelector('.cf-other').hidden = !isOther && f.querySelector('[data-cf=subject] .on')?.dataset.v !== 'other';
  const curs = subj === 'Arabic' ? CF_CURRICULA.Arabic : CF_CURRICULA.default;
  if (f.curriculum.value && !curs.some(c => c[0] === f.curriculum.value)) f.curriculum.value = '';
  f.querySelector('[data-cf=curriculum]').innerHTML = curs.map(([k, n]) => `<button type="button" class="chip ${f.curriculum.value === k ? 'on' : ''}" data-v="${k}">${n}</button>`).join('');
  f.querySelector('[data-cf=grade]').innerHTML = CF_GRADES.map(g => `<button type="button" class="chip ${f.grade.value === g ? 'on' : ''}" data-v="${g}">${g}</button>`).join('');
  // suggest a name
  const suggestion = subj && f.grade.value ? `${f.grade.value} ${subj}${f.curriculum.value ? ' (' + CF_CUR_SHORT[f.curriculum.value] + ')' : ''}` : '';
  if (suggestion && (!f.title.value.trim() || (!cfTitleTouched && f.title.value === cfLastSuggested))) { f.title.value = suggestion; cfLastSuggested = suggestion; }
  // preview
  const col = CF_COLORS[subj] || '#6E7485';
  document.getElementById('cf-preview').innerHTML = subj || f.title.value ? `<div class="cf-card"><div class="cf-art" style="background:${col}">${CF_ICONS[subj] || '📘'}</div><div><b>${(f.title.value || 'Your course').replace(/</g, '&lt;')}</b><span class="meta">${[subj, CF_CUR_SHORT[f.curriculum.value], f.grade.value, f.weeks.value ? f.weeks.value + ' weeks' : ''].filter(Boolean).join(' · ')}</span></div><span class="meta">Preview</span></div>` : '';
}
function syncCourseForm(course) {
  const f = cfForm(); if (!f) return;
  cfTitleTouched = !!course; cfLastSuggested = '';
  if (!course) { f.subject.value = ''; f.curriculum.value = ''; f.grade.value = ''; f.category.value = 'Think Paths'; f.level.value = 'All levels'; }
  const isOther = f.subject.value && !CF_COLORS[f.subject.value];
  document.getElementById('cf-other').value = isOther ? f.subject.value : '';
  f.querySelector('.cf-more').open = !!(course && (course.description || course.weeks || course.image_url));
  cfDraw();
}
document.addEventListener('DOMContentLoaded', () => {
  const f = cfForm(); if (!f) return;
  f.addEventListener('click', e => {
    const b = e.target.closest('[data-cf] button'); if (!b) return;
    const field = b.closest('[data-cf]').dataset.cf;
    if (field === 'subject') {
      if (b.dataset.v === 'other') { f.subject.value = document.getElementById('cf-other').value.trim(); f.querySelectorAll('[data-cf=subject] button').forEach(x => x.classList.toggle('on', x === b)); f.querySelector('.cf-other').hidden = false; document.getElementById('cf-other').focus(); cfDraw(); f.querySelector('.cf-other').hidden = false; return; }
      f.subject.value = b.dataset.v;
    } else f[field].value = b.dataset.v;
    cfDraw();
  });
  document.getElementById('cf-other').addEventListener('input', e => { f.subject.value = e.target.value.trim(); cfDraw(); f.querySelector('.cf-other').hidden = false; });
  f.title.addEventListener('input', () => { cfTitleTouched = f.title.value !== cfLastSuggested; cfDraw(); });
  f.weeks.addEventListener('input', cfDraw);
  cfDraw();
});
