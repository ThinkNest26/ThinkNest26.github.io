// ===== Think Nest home page: the two hubs (compact, tidy cards) =====
(function () {
  async function draw() {
    const box = document.getElementById('big-hubs');
    if (!box || typeof HUBS === 'undefined') return;
    let counts = { teachers: 0, parents: 0 };
    try { if (typeof db !== 'undefined') { const { data } = await db.from('courses').select('audience').in('audience', ['teachers', 'parents']); (data || []).forEach(c => counts[c.audience]++); } } catch (_) {}
    box.innerHTML = ['teachers', 'parents'].map(aud => {
      const H = HUBS[aud], n = counts[aud];
      return `<article class="hub2" style="--c:${H.color}">
        <header class="hub2-head" style="background:${H.grad}">
          ${hubPic(H)}
          <div><span class="hub-kicker">${H.kicker}</span><h3>${H.name}</h3><p>${H.tagline}</p></div>
        </header>
        <div class="hub2-body">
          <span class="hub2-label">Popular topics</span>
          <ul class="hub2-topics">${H.cats.slice(0, 4).map(([k, ic, name]) => `<li><span>${ic}</span>${name}</li>`).join('')}</ul>
          <p class="hub2-more">+ ${H.cats.length - 4} more: ${H.cats.slice(4).map(c => c[2]).join(', ')}</p>
          <footer class="hub2-foot"><span class="meta">${n ? n + ' workshop' + (n === 1 ? '' : 's') + ' on now' : 'New workshops coming soon'}</span>
            <a class="btn btn-red" href="hub.html?for=${aud}">Explore ${H.name} →</a></footer>
        </div>
      </article>`;
    }).join('');
  }
  document.addEventListener('DOMContentLoaded', draw);
})();
