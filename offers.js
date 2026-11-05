// ===== Think Nest home page: the two big hubs (Teacher Hub and Parent Hub) =====
(function () {
  async function draw() {
    const box = document.getElementById('big-hubs');
    if (!box || typeof HUBS === 'undefined') return;
    let courses = [];
    try { if (typeof db !== 'undefined') { const { data } = await db.from('courses').select('id, title, audience, category, format').in('audience', ['teachers', 'parents']).order('id', { ascending: false }).limit(20); courses = data || []; } } catch (_) {}
    box.innerHTML = ['teachers', 'parents'].map(aud => {
      const H = HUBS[aud], next = courses.filter(c => c.audience === aud).slice(0, 2);
      return `<article class="big-hub" style="background:${H.grad}">
        <div class="big-hub-top"><span class="big-hub-ic">${H.ic}</span><div><h3>${H.name}</h3><p class="big-hub-tag">${H.tagline}</p></div></div>
        <p class="big-hub-about">${H.about}</p>
        <div class="big-hub-cats">${H.cats.map(([k, ic, n]) => `<a href="hub.html?for=${aud}" class="big-hub-cat"><span>${ic}</span>${n}</a>`).join('')}</div>
        ${next.length ? `<div class="big-hub-next"><b>Coming up</b>${next.map(c => `<a href="hub.html?for=${aud}">${(hubCat(aud, c.category) || ['', '✨'])[1]} ${hubEsc(c.title)}${c.format ? ` <span>· ${hubEsc(c.format)}</span>` : ''}</a>`).join('')}</div>` : ''}
        <div class="big-hub-btns"><a class="btn btn-white btn-big" href="hub.html?for=${aud}">Explore the ${H.name} →</a><a class="big-hub-join" href="${aud === 'teachers' ? 'teacher-signup.html' : 'parent-signup.html'}">Join free</a></div>
      </article>`;
    }).join('');
  }
  document.addEventListener('DOMContentLoaded', draw);
})();
