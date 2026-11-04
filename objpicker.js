// ===== Think Nest objective chooser (used in lessons and in all lesson tools) =====
// Uses db and esc() from app.js
const OP_CURRICULA = [['british', 'British Curriculum'], ['ib', 'International Baccalaureate (IB)'], ['american', 'American Curriculum'], ['arabic_a', 'Arabic A'], ['arabic_b', 'Arabic B']];
const OP_GRADES = ['KG1', 'KG2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const opSame = (a, b) => {
  a = String(a || '').toLowerCase().trim(); b = String(b || '').toLowerCase().trim();
  if (!a || !b) return false; if (a === b) return true;
  if (b === 'science' && ['biology', 'chemistry', 'physics'].includes(a)) return true;
  const g = [['maths', 'math', 'mathematics', 'early math'], ['english', 'english language arts', 'literacy', 'early literacy']];
  return g.some(x => x.includes(a) && x.includes(b));
};
// Draws the chooser inside `host`. Returns { value(), id() }.
function objectivePicker(host, course, initialText) {
  const uid = 'op' + Math.random().toString(36).slice(2, 8);
  host.innerHTML = `<div class="op">
    <div class="op-row">
      <label>Curriculum <select data-op="c">${OP_CURRICULA.map(([k, n]) => `<option value="${k}"${k === (course.curriculum || 'british') ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label>Grade <select data-op="g">${OP_GRADES.map(g => `<option${g === (course.grade || 'Grade 1') ? ' selected' : ''}>${g}</option>`).join('')}</select></label>
      <label>Subject <select data-op="s"><option value="">All subjects</option></select></label>
    </div>
    <label>Learning objective <select data-op="o" id="${uid}"><option value="">Loading…</option></select></label>
    <input type="text" data-op="own" maxlength="500" placeholder="Type your own objective" hidden>
    <p class="meta" data-op="info"></p>
  </div>`;
  const $ = k => host.querySelector(`[data-op="${k}"]`);
  let list = [], firstLoad = true;
  async function load() {
    const { data } = await db.from('objectives').select('id, subject, topic, text').eq('curriculum', $('c').value).eq('grade', $('g').value).order('subject').order('topic', { nullsFirst: false }).order('id');
    list = data || [];
    const subjects = [...new Set(list.map(o => o.subject))];
    const want = firstLoad ? (subjects.find(s => opSame(s, course.subject)) ? course.subject : '') : $('s').value;
    $('s').innerHTML = '<option value="">All subjects</option>' + subjects.map(s => `<option${(opSame(s, want) && want) || s === want ? ' selected' : ''}>${esc(s)}</option>`).join('');
    if (firstLoad && course.subject && opSame('biology', course.subject)) $('s').value = '';
    firstLoad = false;
    drawObjectives();
  }
  function drawObjectives() {
    const s = $('s').value, shown = list.filter(o => !s || o.subject === s || (course.subject && opSame(o.subject, course.subject) && !s));
    const groups = {};
    shown.forEach(o => { const g = o.subject + (o.topic ? ' · ' + o.topic : ''); (groups[g] = groups[g] || []).push(o); });
    const keep = $('o').value;
    $('o').innerHTML = '<option value="">Choose an objective…</option>' + Object.entries(groups).map(([g, os]) => `<optgroup label="${esc(g)}">${os.map(o => `<option value="${o.id}"${String(o.id) === keep ? ' selected' : ''}>${esc(o.text)}</option>`).join('')}</optgroup>`).join('') + '<option value="own">✏️ Write my own objective…</option>';
    $('info').textContent = shown.length ? `${shown.length} objectives` : 'No objectives in the list for this choice yet. Write your own, or ask the admin to import them.';
    if (initialText) { const m = list.find(o => o.text === initialText); if (m) $('o').value = String(m.id); else { $('o').value = 'own'; $('own').hidden = false; $('own').value = initialText; } initialText = null; }
  }
  $('c').addEventListener('change', load); $('g').addEventListener('change', load);
  $('s').addEventListener('change', drawObjectives);
  $('o').addEventListener('change', () => { $('own').hidden = $('o').value !== 'own'; if (!$('own').hidden) $('own').focus(); });
  load();
  return {
    value() { if ($('o').value === 'own') return $('own').value.trim(); const o = list.find(x => String(x.id) === $('o').value); return o ? o.text : ''; },
    id() { const v = $('o').value; return v && v !== 'own' ? Number(v) : null; },
    isOwnEmpty() { return $('o').value === 'own' && !$('own').value.trim(); }
  };
}
