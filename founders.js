// ===== Think Nest founders page (public) and its editor (admin) =====
const FOUNDER_COLORS = ['#3E4B94', '#F27A6F', '#2FA08A'];
const fIni2 = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const fEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function loadFounders() {
  const { data } = await db.from('site_settings').select('value').eq('key', 'founders').maybeSingle();
  return (data && data.value) || null;
}
function founderCard(p, i) {
  const photo = p.photo ? `<img src="${fEsc(p.photo)}" alt="Photo of ${fEsc(p.name)}">` : `<span class="fd-ini" style="background:${FOUNDER_COLORS[i % 3]}">${fEsc(fIni2(p.name))}</span>`;
  return `<article class="fd-card" style="--c:${FOUNDER_COLORS[i % 3]}">
    <div class="fd-photo">${photo}</div>
    <h3>${fEsc(p.name)}</h3><span class="fd-role">${fEsc(p.role)}</span>
    <p>${fEsc(p.bio).replace(/\n/g, '<br>')}</p>
    ${p.link ? `<a class="fd-link" href="${fEsc(p.link)}" target="_blank" rel="noopener">Connect on LinkedIn ↗</a>` : ''}
  </article>`;
}
async function startFoundersPage() {
  const v = await loadFounders();
  const box = document.getElementById('fd-page');
  if (!v) { box.innerHTML = '<p class="empty">This page is coming soon.</p>'; return; }
  document.title = (v.title || 'Meet the founders') + ' – Think Nest';
  box.innerHTML = `<section class="fd-hero"><h1 class="title title-center">${fEsc(v.title || 'Meet the founders')}</h1><p class="fd-story">${fEsc(v.story || '').replace(/\n/g, '<br>')}</p></section>
    <section class="fd-grid">${(v.people || []).map(founderCard).join('')}</section>
    <section class="fd-cta"><h2>Want to get in touch?</h2><p>We’d love to hear from parents, students, teachers and schools.</p><a class="btn btn-red" href="contact.html">Contact us</a></section>`;
}

// ---------- Admin editor ----------
async function startFoundersEditor() {
  await initTeacher();
  const f = document.getElementById('fd-form');
  let v = await loadFounders() || { title: 'Meet the founders', story: '', people: [] };
  while ((v.people || []).length < 3) v.people.push({ name: '', role: 'Co-founder', bio: '', photo: '', link: '' });
  function draw() {
    f.querySelector('[name=title]').value = v.title || '';
    f.querySelector('[name=story]').value = v.story || '';
    document.getElementById('fd-people').innerHTML = v.people.map((p, i) => `<fieldset class="panel fd-edit" data-fi="${i}">
      <legend>Founder ${i + 1}</legend>
      <div class="fd-edit-top"><div class="fd-photo sm">${p.photo ? `<img src="${fEsc(p.photo)}" alt="">` : `<span class="fd-ini" style="background:${FOUNDER_COLORS[i % 3]}">${fEsc(fIni2(p.name))}</span>`}</div>
        <div class="fd-photo-btns"><label class="pill pill-soft big">📷 ${p.photo ? 'Change photo' : 'Add a photo'}<input type="file" accept="image/*" data-photo="${i}" hidden></label>${p.photo ? `<button type="button" class="link-btn" data-nophoto="${i}">Remove photo</button>` : ''}<span class="meta">A square photo works best (JPG or PNG, up to 5 MB).</span></div></div>
      <div class="two"><label>Name <input type="text" data-f="name" value="${fEsc(p.name)}" maxlength="80"></label><label>Role <input type="text" data-f="role" value="${fEsc(p.role)}" maxlength="80" placeholder="For example, Co-founder & Head of Learning"></label></div>
      <label>Bio <textarea data-f="bio" rows="5" maxlength="1200" placeholder="Background, experience, and why Think Nest matters to them">${fEsc(p.bio)}</textarea></label>
      <label>LinkedIn link (optional) <input type="url" data-f="link" value="${fEsc(p.link)}" placeholder="https://www.linkedin.com/in/..."></label>
    </fieldset>`).join('');
    document.getElementById('fd-preview').innerHTML = `<section class="fd-grid">${v.people.map(founderCard).join('')}</section>`;
  }
  f.addEventListener('input', e => {
    const fi = e.target.closest('[data-fi]');
    if (fi && e.target.dataset.f) { v.people[Number(fi.dataset.fi)][e.target.dataset.f] = e.target.value; document.getElementById('fd-preview').innerHTML = `<section class="fd-grid">${v.people.map(founderCard).join('')}</section>`; }
    if (e.target.name === 'title') v.title = e.target.value;
    if (e.target.name === 'story') v.story = e.target.value;
  });
  f.addEventListener('change', async e => {
    const inp = e.target.closest('[data-photo]'); if (!inp) return;
    const file = inp.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) return say('Photos must be smaller than 5 MB.');
    say('Uploading photo…');
    const path = `founders/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
    const up = await db.storage.from('site-images').upload(path, file, { contentType: file.type, upsert: true });
    if (up.error) return say(friendly(up.error));
    v.people[Number(inp.dataset.photo)].photo = db.storage.from('site-images').getPublicUrl(path).data.publicUrl;
    draw(); say('Photo added. Click Save to publish it.');
  });
  f.addEventListener('click', e => { const n = e.target.closest('[data-nophoto]'); if (n) { v.people[Number(n.dataset.nophoto)].photo = ''; draw(); } });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await db.from('site_settings').update({ value: v }).eq('key', 'founders');
    say(error ? friendly(error) : 'Saved! The founders page is updated.');
  });
  draw();
}
