// ===== Email updates on/off (all account settings pages) =====
async function emailPrefPanel() {
  const host = document.getElementById('email-pref'); if (!host) return;
  const { data: { session } } = await db.auth.getSession(); if (!session) return;
  const { data: p, error } = await db.from('profiles').select('email_notifications').eq('id', session.user.id).maybeSingle();
  if (error || !p) { host.hidden = true; return; }
  host.innerHTML = `<h2>📧 Email updates</h2><p class="meta">We email you about important things only: your account being approved, hub requests, certificates and similar. Emails go to <b>${session.user.email.replace(/[<>&]/g, '')}</b>.</p>
    <label class="switch-row"><input type="checkbox" id="email-on" ${p.email_notifications !== false ? 'checked' : ''}> Send me email updates</label>`;
  host.querySelector('#email-on').addEventListener('change', async e => {
    const { error: er } = await db.from('profiles').update({ email_notifications: e.target.checked }).eq('id', session.user.id);
    say(er ? friendly(er) : e.target.checked ? 'Email updates switched on.' : 'Email updates switched off. You’ll still see the 🔔 bell on Think Nest.');
  });
}
document.addEventListener('DOMContentLoaded', () => setTimeout(emailPrefPanel, 400));

// ===== Request account deletion (all account settings pages) =====
async function deletionPanel() {
  const host = document.getElementById('delete-req'); if (!host) return;
  const { data: { session } } = await db.auth.getSession(); if (!session) return;
  const { data: me } = await db.from('profiles').select('role, also_parent').eq('id', session.user.id).maybeSingle();
  const isParent = me && (me.role === 'parent' || me.also_parent);
  let kids = [];
  if (isParent) { const { data: links } = await db.from('parent_links').select('student_id').eq('parent_id', session.user.id); const ids = (links || []).map(l => l.student_id);
    if (ids.length) { const { data: ps } = await db.from('profiles').select('id, full_name').in('id', ids); kids = (ps || []).map(k => ({ id: k.id, name: k.full_name || 'My child' })); } }
  host.innerHTML = `<h2>🗑️ Delete an account</h2>
    <p class="meta">You can ask the Think Nest team to delete an account and its personal information. We’ll check it’s really you and reply by email, usually within two working days. Read more in our <a href="privacy.html#rights">Privacy notice</a>.</p>
    ${kids.length ? `<label>Which account? <select id="del-who"><option value="">My own account</option>${kids.map(k => `<option value="${k.id}">${k.name.replace(/[<>&]/g, '')}’s account</option>`).join('')}</select></label>` : ''}
    <label>Reason (optional) <textarea id="del-why" rows="2" maxlength="500" placeholder="You don’t have to tell us, but it helps us improve."></textarea></label>
    <button type="button" class="btn btn-white auth-btn outline danger-btn" id="del-go">Request account deletion</button>`;
  host.querySelector('#del-go').addEventListener('click', async () => {
    const who = host.querySelector('#del-who') ? host.querySelector('#del-who').value : '';
    if (!confirm(who ? 'Ask Think Nest to delete your child’s account? Their courses, work and certificates will be removed.' : 'Ask Think Nest to delete your account? All your information will be removed and this can’t be undone.')) return;
    const { error } = await db.rpc('request_deletion', { why: host.querySelector('#del-why').value, child: who || null });
    if (error) return say(friendly(error));
    host.innerHTML = '<h2>🗑️ Delete an account</h2><div class="note">✅ Your request has been sent. The Think Nest team will be in touch by email.</div>';
  });
}
document.addEventListener('DOMContentLoaded', () => setTimeout(deletionPanel, 500));
