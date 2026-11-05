// ===== One account, two roles: teachers who are parents, parents who teach =====
async function dualRolePanel(kind) {
  const host = document.getElementById('dual-role'); if (!host) return;
  const { data: { session } } = await db.auth.getSession(); if (!session) return;
  const { data: me } = await db.from('profiles').select('full_name, role, also_parent, requested_role').eq('id', session.user.id).maybeSingle();
  if (!me) return;
  if (kind === 'teacher') {
    host.innerHTML = `<h2>👪 Are you also a parent?</h2>
      <p class="meta">Switch this on to link your children and use the parent features (My children, Beyond the School Run and the Parent Café) from this same account.</p>
      <label class="switch-row"><input type="checkbox" id="also-parent" ${me.also_parent ? 'checked' : ''}> <b>I’m also a parent</b></label>
      <p class="meta" id="ap-note">${me.also_parent ? 'The 👪 Parent section is in your sidebar.' : ''}</p>`;
    host.querySelector('#also-parent').addEventListener('change', async e => {
      const { error } = await db.rpc('set_also_parent', { on_off: e.target.checked });
      if (error) { e.target.checked = !e.target.checked; return say(friendly(error)); }
      say(e.target.checked ? 'Done! Find 👪 Parent in your sidebar. Add your children from there.' : 'Parent features switched off.');
      setTimeout(() => location.reload(), 900);
    });
    if (location.hash === '#also-parent') host.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    const waiting = me.requested_role === 'teacher';
    host.innerHTML = `<h2>👩‍🏫 Are you also a teacher?</h2>
      <p class="meta">Apply to teach on Think Nest with this same account. Once the Think Nest team approves you, you’ll have the teacher area and keep everything for your children.</p>
      ${waiting ? '<div class="note">⏳ Your application to teach is waiting for approval. We’ll let you know!</div>'
        : `<label>What do you teach? <input type="text" id="teach-subj" maxlength="80" placeholder="For example, Grade 4 Maths or IB English"></label><button type="button" class="btn btn-red auth-btn" id="apply-teach">Apply to teach</button>`}`;
    const b = host.querySelector('#apply-teach');
    if (b) b.addEventListener('click', async () => {
      b.disabled = true;
      const subj = host.querySelector('#teach-subj').value.trim();
      const { error } = await db.rpc('apply_to_teach', { subj });
      if (error) { b.disabled = false; return say(friendly(error)); }
      if (typeof emailAdmin === 'function') emailAdmin('A parent applied to teach on Think Nest', { Name: me.full_name || '', Email: session.user.email, Teaches: subj, 'What to do': 'Log in as admin and open Approvals → Teachers to approve.' });
      say('Application sent! The Think Nest team will review it.'); dualRolePanel('parent');
    });
  }
}
