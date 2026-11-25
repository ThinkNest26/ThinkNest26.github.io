// ===== Think Nest admin: requests to host a workshop =====
(function () {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function loadHostRequests() {
    const box = document.getElementById('hostreq-box'); if (!box) return;
    const { data, error } = await db.from('workshop_host_requests').select('*').order('created_at', { ascending: false }).limit(60);
    if (error) { box.innerHTML = `<p class="empty">${/relation|does not exist|schema cache/i.test(error.message || '') ? 'Run the latest Supabase update (host a workshop) to see these.' : E(error.message)}</p>`; return; }
    const rows = data || [], waiting = rows.filter(r => r.status === 'pending');
    const n = document.getElementById('n-hostreq'); if (n) n.textContent = waiting.length;
    const card = r => `<article class="panel person" data-hostreq="${r.id}"><div class="person-info"><h4>${E(r.title)}</h4>
        <span class="meta">${r.hub === 'parents' ? '👪 Parent' : '👩‍🏫 Teacher'} host: <b>${E(r.host_name || '')}</b> · ${E(r.format || '')}${r.when_text ? ' · ' + E(r.when_text) : ''} · sent ${new Date(r.created_at).toLocaleDateString('en-GB')}</span>
        <p style="margin:6px 0">${E(r.about)}</p>${r.experience ? `<span class="meta">Experience: ${E(r.experience)}</span>` : ''}</div>
        ${r.status === 'pending' ? '<div class="person-actions"><button class="pill pill-live" data-hr-ok>✅ Approve</button><button class="pill pill-soft danger" data-hr-no>Decline</button></div>'
          : `<span class="tag">${r.status === 'approved' ? '✅ Approved' + (r.course_id ? ` · <a href="teacher-course.html?id=${r.course_id}">open the draft workshop</a>` : '') : '❌ Declined'}</span>`}</article>`;
    box.innerHTML = (waiting.length ? waiting.map(card).join('') : '<p class="empty">No requests waiting. 🎉</p>')
      + (rows.length > waiting.length ? `<details class="panel"><summary>Answered (${rows.length - waiting.length})</summary>${rows.filter(r => r.status !== 'pending').map(card).join('')}</details>` : '');
  }
  document.addEventListener('click', async e => {
    const row = e.target.closest('[data-hostreq]'); if (!row) return;
    const ok = !!e.target.closest('[data-hr-ok]'), no = !!e.target.closest('[data-hr-no]'); if (!ok && !no) return;
    let note = null;
    if (no) { note = prompt('Why isn’t it approved? The host will see this (optional).', ''); if (note === null) return; }
    else if (!confirm('Approve this workshop? A draft workshop is made for you to finish and publish.')) return;
    row.querySelectorAll('button').forEach(b => b.disabled = true);
    const { data, error } = await db.rpc('decide_host_request', { rid: Number(row.dataset.hostreq), ok, note });
    if (error) { row.querySelectorAll('button').forEach(b => b.disabled = false); return say(friendly(error)); }
    say(ok ? (/^\d+$/.test(String(data)) ? '✅ Approved. A draft workshop is ready in your courses to finish and publish.' : '✅ Approved. The host has been told.') : 'Declined. The host has been told.');
    loadHostRequests();
  });
  document.addEventListener('DOMContentLoaded', () => setTimeout(loadHostRequests, 800));
})();
