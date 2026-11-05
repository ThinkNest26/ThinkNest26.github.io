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
