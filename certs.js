// ===== Think Nest certificates: types, design, awarding, viewing, printing and verifying =====
const CERT_TYPES = {
  completion:  { ic: '🎓', name: 'Course Completion',       head: 'Certificate of Completion',        c1: '#3E4B94', c2: '#8A9BE8', reasons: ['for successfully completing this course', 'for completing every lesson with commitment and effort', 'for finishing the course and achieving its learning goals'] },
  achievement: { ic: '🏆', name: 'Outstanding Achievement', head: 'Certificate of Achievement',       c1: '#B8860B', c2: '#F4C95D', reasons: ['for outstanding results and excellent work', 'for consistently producing work of the highest standard', 'for exceptional achievement this term'] },
  star:        { ic: '⭐', name: 'Star Learner',            head: 'Star Learner Award',               c1: '#7A4FD0', c2: '#C7B3FF', reasons: ['for being an amazing learner this week', 'for brilliant effort, focus and enthusiasm', 'for shining brightly in every lesson this month'] },
  improved:    { ic: '🌱', name: 'Most Improved',           head: 'Most Improved Award',              c1: '#2F8F5B', c2: '#9BE3B8', reasons: ['for fantastic progress and determination', 'for working hard and improving every week', 'for growing in confidence and skill'] },
  kindness:    { ic: '🤝', name: 'Kindness & Teamwork',     head: 'Kindness & Teamwork Award',        c1: '#E0607E', c2: '#FFB3C4', reasons: ['for always helping others and being a great friend', 'for outstanding teamwork and kindness', 'for making everyone feel welcome and included'] },
  creative:    { ic: '💡', name: 'Creative Thinker',        head: 'Creative Thinker Award',           c1: '#E07A1F', c2: '#FFC98A', reasons: ['for curious questions and creative ideas', 'for original thinking and imaginative work', 'for bringing fresh ideas to every challenge'] },
  attendance:  { ic: '🙋', name: 'Perfect Attendance',      head: 'Perfect Attendance Award',         c1: '#2A8FB0', c2: '#9ADCF0', reasons: ['for perfect attendance this term', 'for being present, on time and ready to learn', 'for outstanding attendance and punctuality'] },
  workshop:    { ic: '✨', name: 'Workshop Participation',  head: 'Certificate of Participation',     c1: '#F27A6F', c2: '#FFC2A8', reasons: ['for taking part in this workshop', 'for active participation and valuable contributions', 'for completing this professional learning workshop'] }
};
const cEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const cDate = d => d ? new Date(String(d).length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

// The certificate itself (A4 landscape, 1123 × 794 px)
function certificateHtml(c) {
  const T = CERT_TYPES[c.cert_type] || CERT_TYPES.achievement;
  return `<div class="tncert" style="--c1:${T.c1};--c2:${T.c2}">
    <div class="cert-frame">
      <span class="cert-corner tl"></span><span class="cert-corner tr"></span><span class="cert-corner bl"></span><span class="cert-corner br"></span>
      <img class="cert-logo" src="images/tn-logo-dark.png" alt="Think Nest">
      <div class="cert-kicker">${cEsc(T.head)}</div>
      <h2 class="cert-title">${cEsc(c.title || T.name)}</h2>
      <p class="cert-pre">This certificate is proudly presented to</p>
      <div class="cert-name">${cEsc(c.student_name || 'Student name')}</div>
      <div class="cert-rule"></div>
      ${c.reason ? `<p class="cert-reason">${cEsc(c.reason)}</p>` : ''}
      ${c.context_title ? `<p class="cert-context">${cEsc(c.context_title)}</p>` : ''}
      <div class="cert-foot">
        <div class="cert-sig"><b>${cEsc(cDate(c.issued_at || new Date().toISOString().slice(0, 10)))}</b><span>Date</span></div>
        <div class="cert-seal"><span>${T.ic}</span><small>THINK NEST</small></div>
        <div class="cert-sig"><b class="cert-sign">The Think Nest Team</b><span>Think Nest</span></div>
      </div>
      ${c.code ? `<div class="cert-verify">Certificate code ${cEsc(c.code)} · Check it at thinknest26.github.io/verify.html</div>` : ''}
    </div>
  </div>`;
}
// A small scaled preview
function certThumb(c) { return `<div class="cert-thumb"><div class="cert-scale">${certificateHtml(c)}</div></div>`; }

// List of certificates (students and parents)
function certListHtml(rows) {
  return rows.map(c => {
    if (c.cert_type) return `<article class="cert-card" id="cert-${cEsc(c.code)}">${certThumb(c)}
      <div class="cert-card-info"><b>${cEsc(c.title)}</b><span class="meta">${CERT_TYPES[c.cert_type] ? CERT_TYPES[c.cert_type].ic + ' ' + CERT_TYPES[c.cert_type].name : ''} · ${cDate(c.issued_at)}${c.teacher_name ? ' · ' + cEsc(c.teacher_name) : ''}</span>
      <a class="btn btn-red" href="certificate.html?code=${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Open &amp; download</a></div></article>`;
    return `<article class="cert-card old"><div class="cert-old-ic">📄</div><div class="cert-card-info"><b>${cEsc(c.title)}</b><span class="meta">${c.courses ? cEsc(c.courses.title) + ' · ' : ''}${cDate(c.issued_at)}</span>
      ${c.file_path ? `<button type="button" class="btn btn-red" data-file="${cEsc(c.file_path)}">Download</button>` : ''}</div></article>`;
  }).join('');
}
async function bindOldDownloads(box) {
  box.addEventListener('click', async e => {
    const b = e.target.closest('[data-file]'); if (!b) return;
    const { data, error } = await db.storage.from('certificates').createSignedUrl(b.dataset.file, 600);
    if (error) return say(friendly(error)); window.open(data.signedUrl, '_blank', 'noopener');
  });
}

// ---------- Student: My Certificates ----------
async function startMyCertificates() {
  const { user } = await initShell();
  const box = document.getElementById('cert-list');
  const { data } = await db.from('certificates').select('*, courses(title)').eq('user_id', user.id).order('issued_at', { ascending: false });
  box.innerHTML = (data || []).length ? certListHtml(data) : '<div class="empty-box"><p>No certificates yet. Keep learning: your teachers can award certificates for great work, progress and kindness! 🏅</p></div>';
  bindOldDownloads(box);
  const m = location.hash.match(/^#cert-(\w+)$/); if (m) { const el = document.getElementById('cert-' + m[1]); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); } }
}
// ---------- Parent: a child's certificates ----------
async function childCertificates(kidId, hostId) {
  const box = document.getElementById(hostId); if (!box) return;
  const { data } = await db.from('certificates').select('*, courses(title)').eq('user_id', kidId).order('issued_at', { ascending: false });
  box.innerHTML = (data || []).length ? `<div class="cert-grid">${certListHtml(data)}</div>` : '<p class="empty">No certificates yet.</p>';
  bindOldDownloads(box);
}

// ---------- One certificate, full size, ready to print / save as PDF ----------
async function startCertificatePage() {
  const code = new URLSearchParams(location.search).get('code') || '';
  const box = document.getElementById('cert-view');
  const { data: { session } } = await db.auth.getSession();
  if (!session) { location.href = 'start.html'; return; }
  const { data } = await db.from('certificates').select('*').eq('code', code.toUpperCase()).maybeSingle();
  if (!data) { box.innerHTML = '<div class="empty-box"><p>This certificate wasn’t found, or you don’t have access to it.</p></div>'; return; }
  document.title = data.title + ' – ' + (data.student_name || '') + ' – Think Nest';
  box.innerHTML = certificateHtml(data);
  fitCert();
  window.addEventListener('resize', fitCert);
}
function fitCert() {
  const wrap = document.getElementById('cert-view'), cert = wrap && wrap.querySelector(".tncert"); if (!cert) return;
  const s = Math.min(1, (wrap.clientWidth - 8) / 1123);
  cert.style.transform = `scale(${s})`; wrap.style.height = (794 * s + 8) + 'px';
}

// ---------- Public: verify a certificate ----------
async function startVerify() {
  const f = document.getElementById('verify-form'), out = document.getElementById('verify-out');
  const run = async code => {
    if (!code) return;
    const { data } = await db.rpc('verify_certificate', { c: code });
    const r = (data || [])[0];
    out.innerHTML = r ? `<div class="verify-ok">✅ <b>Genuine Think Nest certificate</b><p>${cEsc(r.title)} · awarded to <b>${cEsc(r.student)}</b>${r.context_title ? ' · ' + cEsc(r.context_title) : ''}<br>by ${cEsc(r.teacher_name || 'a Think Nest teacher')} on ${cDate(r.issued_at)}</p></div>`
      : '<div class="verify-no">❌ We couldn’t find a certificate with this code. Please check it and try again.</div>';
  };
  f.addEventListener('submit', e => { e.preventDefault(); run(f.code.value.trim()); });
  const q = new URLSearchParams(location.search).get('code'); if (q) { f.code.value = q; run(q); }
}

// ---------- Teacher: award certificates ----------
async function startAwardCertificates() {
  const { user, profile } = await initTeacher();
  const p = new URLSearchParams(location.search);
  let type = 'achievement', picked = new Set(p.get('student') ? [p.get('student')] : []), people = [];
  const $ = id => document.getElementById(id);
  $('ct-types').innerHTML = Object.entries(CERT_TYPES).map(([k, T]) => `<button type="button" class="ct-type" data-ct="${k}" style="--c1:${T.c1};--c2:${T.c2}"><span>${T.ic}</span><b>${T.name}</b></button>`).join('');
  // where from: courses + classes
  const [{ data: courses }, { data: groups }] = await Promise.all([db.from('courses').select('id, title, audience').eq('teacher_id', user.id).order('title'), db.rpc('my_groups')]);
  const classes = (groups || []).filter(g => g.my_role === 'owner');
  $('ct-from').innerHTML = '<option value="">Choose a course or class…</option>' + (courses || []).map(c => `<option value="c${c.id}">📘 ${cEsc(c.title)}${c.audience && c.audience !== 'students' ? ' (' + c.audience + ')' : ''}</option>`).join('') + classes.map(g => `<option value="g${g.id}">🏫 ${cEsc(g.name)}</option>`).join('');
  if (p.get('course')) $('ct-from').value = 'c' + p.get('course');
  async function loadPeople() {
    const v = $('ct-from').value; people = [];
    if (v[0] === 'c') {
      const { data } = await db.rpc('my_students');
      const seen = new Set(); people = (data || []).filter(s => String(s.course_id) === v.slice(1) && !seen.has(s.id) && seen.add(s.id)).map(s => ({ id: s.id, name: s.full_name, sub: s.grade }));
      if (!people.length) { // hub workshops: adults in the course
        const { data: en } = await db.from('enrollments').select('user_id, profiles(full_name, role)').eq('course_id', Number(v.slice(1)));
        people = (en || []).filter(e => e.profiles).map(e => ({ id: e.user_id, name: e.profiles.full_name, sub: e.profiles.role }));
      }
    } else if (v[0] === 'g') {
      const { data } = await db.rpc('group_member_list', { gid: Number(v.slice(1)) });
      people = (data || []).filter(m => m.role === 'member' && m.status === 'active').map(m => ({ id: m.user_id, name: m.full_name, sub: m.grade }));
    }
    $('ct-people').innerHTML = !v ? '<p class="meta">Choose a course or class to see its students.</p>' : people.length
      ? `<label class="remember ct-all"><input type="checkbox" id="ct-all"> <b>Select everyone (${people.length})</b></label>` + people.map(s => `<label class="remember"><input type="checkbox" name="ct-p" value="${s.id}" ${picked.has(s.id) ? 'checked' : ''}> ${cEsc(s.name || 'Student')} <span class="meta">${cEsc(s.sub || '')}</span></label>`).join('')
      : '<p class="meta">No one in this course or class yet.</p>';
    preview();
  }
  function preview() {
    const T = CERT_TYPES[type];
    document.querySelectorAll('[data-ct]').forEach(b => b.classList.toggle('on', b.dataset.ct === type));
    $('ct-reasons').innerHTML = T.reasons.map(r => `<button type="button" class="chip" data-r="${cEsc(r)}">${cEsc(r)}</button>`).join('');
    if (!$('ct-title').dataset.touched) $('ct-title').value = T.name;
    const first = people.find(s => picked.has(s.id));
    const v = $('ct-from').value, ctx = v ? $('ct-from').options[$('ct-from').selectedIndex].text.replace(/^[📘🏫]\s*/u, '').replace(/ \((teachers|parents)\)$/, '') : '';
    $('ct-preview').innerHTML = `<div class="cert-thumb big"><div class="cert-scale">${certificateHtml({ cert_type: type, title: $('ct-title').value || T.name, reason: $('ct-reason').value, student_name: first ? first.name : 'Student name', teacher_name: profile.full_name, context_title: ctx })}</div></div>`;
    $('ct-count').textContent = picked.size ? `${picked.size} selected` : 'No one selected yet';
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-ct]'); if (t) { type = t.dataset.ct; $('ct-title').dataset.touched = ''; $('ct-reason').value = ''; return preview(); }
    const r = e.target.closest('[data-r]'); if (r) { $('ct-reason').value = r.dataset.r; return preview(); }
  });
  $('ct-from').addEventListener('change', () => { picked.clear(); loadPeople(); });
  $('ct-people').addEventListener('change', e => {
    if (e.target.id === 'ct-all') { document.querySelectorAll('[name=ct-p]').forEach(x => { x.checked = e.target.checked; x.checked ? picked.add(x.value) : picked.delete(x.value); }); }
    else if (e.target.name === 'ct-p') e.target.checked ? picked.add(e.target.value) : picked.delete(e.target.value);
    preview();
  });
  $('ct-title').addEventListener('input', () => { $('ct-title').dataset.touched = '1'; preview(); });
  $('ct-reason').addEventListener('input', preview);
  $('ct-award').addEventListener('click', async e => {
    const v = $('ct-from').value;
    if (!v) return say('Choose a course or class first.');
    if (!picked.size) return say('Choose at least one person.');
    if (!$('ct-title').value.trim()) return say('Give the certificate a title.');
    const btn = e.target; btn.disabled = true; btn.textContent = 'Awarding…';
    let n = 0, lastErr = null;
    for (const sid of picked) {
      const { error } = await db.rpc('award_certificate', { sid, ctype: type, ctitle: $('ct-title').value.trim(), why: $('ct-reason').value.trim(), cid: v[0] === 'c' ? Number(v.slice(1)) : null, gid: v[0] === 'g' ? Number(v.slice(1)) : null });
      if (error) lastErr = error; else n++;
    }
    btn.disabled = false; btn.textContent = '🏅 Award certificate';
    if (lastErr && !n) return say(friendly(lastErr));
    say(`🏅 ${n} certificate${n === 1 ? '' : 's'} awarded! Students and parents have been told.` + (lastErr ? ' Some could not be awarded.' : ''));
    picked.clear(); loadPeople(); loadRecent();
  });
  async function loadRecent() {
    const { data } = await db.from('certificates').select('*').eq('issued_by', user.id).not('code', 'is', null).order('id', { ascending: false }).limit(12);
    $('ct-recent').innerHTML = (data || []).length ? `<div class="cert-grid">${data.map(c => `<article class="cert-card">${certThumb(c)}<div class="cert-card-info"><b>${cEsc(c.student_name || '')}</b><span class="meta">${cEsc(c.title)} · ${cDate(c.issued_at)}</span><a class="link-btn" href="certificate.html?code=${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Open</a></div></article>`).join('')}</div>` : '<p class="empty">You haven’t awarded any certificates yet.</p>';
  }
  await loadPeople(); preview(); loadRecent();
}

// Scale every certificate preview to fit its box
function fitThumbs() { document.querySelectorAll('.cert-thumb').forEach(t => { const s = t.clientWidth / 1123; const sc = t.querySelector('.cert-scale'); if (sc) sc.style.transform = `scale(${s})`; }); }
new MutationObserver(() => requestAnimationFrame(fitThumbs)).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('resize', fitThumbs);
