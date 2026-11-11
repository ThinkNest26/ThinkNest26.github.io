// ===== Think Nest safety: "Tell a trusted adult" for students, and quiet flags on risky messages =====
// Loaded on every signed-in page by nav.js. Uses db, say(), esc() from app.js
(function () {
  const RISKY = [
    /don'?t tell (your|ur) (mum|mom|dad|parents?|teacher)/i, /keep (this|it) (a )?secret/i, /our (little )?secret/i,
    /send (me )?(a )?(pic|photo|picture|selfie|video)/i, /what are you wearing/i, /are you (home )?alone/i,
    /meet (me|up) (in person|alone|after school|outside)/i, /where do you live/i, /delete (this|our) (chat|messages?)/i,
    /(add|message|text) me on (snap|snapchat|insta|instagram|whatsapp|tiktok|telegram)/i, /\bwhatsapp me\b/i,
    /i('| a)?m going to hurt (my ?self|myself)/i, /i want to die/i, /kill (my ?self|myself)/i, /nobody (cares|loves me)/i
  ];
  window.tnRisky = t => RISKY.some(r => r.test(String(t || '')));
  // tell the safeguarding team quietly (the message is still posted, nothing is shown to the writer)
  window.tnFlagRisky = (text, place) => { try { if (window.tnRisky(text)) db.rpc('flag_risky_text', { body: String(text).slice(0, 2000), place: place || 'message' }).then(() => {}, () => {}); } catch (_) {} };
  if (typeof window.tnBlocked === 'function' && !window.tnBlocked._wrapped) {
    const orig = window.tnBlocked;
    window.tnBlocked = async function (body, place, gid) { const r = await orig(body, place, gid); if (!r) window.tnFlagRisky(body, place); return r; };
    window.tnBlocked._wrapped = true;
  }

  // ---- "Tell a trusted adult" (students only) ----
  async function addButton() {
    try {
      const { data: { session } } = await db.auth.getSession(); if (!session) return;
      const { data: p } = await db.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (!p || p.role !== 'student' || document.getElementById('tn-help-btn')) return;
      const b = document.createElement('button');
      b.id = 'tn-help-btn'; b.type = 'button'; b.className = 'tn-help-btn';
      b.innerHTML = '🛟 <span>Tell a trusted adult</span>'; b.setAttribute('aria-label', 'Tell a trusted adult about something that worried you');
      document.body.appendChild(b);
      b.onclick = openHelp;
    } catch (_) {}
  }
  function openHelp() {
    let d = document.getElementById('tn-help');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'tn-help'; d.className = 'dlg tn-help';
      d.innerHTML = `<form class="auth-form" id="tn-help-form" style="display:grid;gap:12px">
        <h2 style="margin:0">🛟 Tell a trusted adult</h2>
        <p class="meta" style="margin:0">If something online made you feel worried, scared or uncomfortable, you can tell us here. Only the Think Nest safety team sees this, not other students or the teacher involved. You did the right thing by telling.</p>
        <fieldset style="border:0;padding:0;margin:0;display:grid;gap:6px"><legend style="font-weight:700;margin-bottom:4px">What happened?</legend>
          ${[['unkind', 'Someone was unkind or bullied me'], ['private', 'Someone asked for private things (photos, address, phone, to meet)'], ['adult', 'An adult said or did something that worried me'], ['content', 'I saw something upsetting'], ['me', 'I’m not OK and I need to talk to someone'], ['other', 'Something else']].map(([v, t]) => `<label class="remember"><input type="radio" name="kind" value="${v}"> ${t}</label>`).join('')}</fieldset>
        <label>Who was it, or where? (optional) <input name="who" maxlength="200" placeholder="A name, a group or a page"></label>
        <label>Tell us more (optional) <textarea name="details" rows="3" maxlength="2000"></textarea></label>
        <p class="note tn-urgent" hidden>💛 If you feel unsafe right now, please tell a parent, a teacher at school or another adult you trust straight away. In the UAE you can also call the Child Protection helpline <b>116111</b>, or <b>999</b> in an emergency.</p>
        <p class="form-error" id="tn-help-err" role="alert" hidden></p>
        <div class="step-buttons"><button type="button" class="btn btn-white auth-btn outline" data-help-close>Cancel</button><button class="btn btn-red auth-btn">Send to the safety team</button></div>
      </form>`;
      document.body.appendChild(d);
      d.addEventListener('close', () => d.remove());   // fresh form next time
      const f = d.querySelector('form');
      d.querySelector('[data-help-close]').onclick = () => d.close();
      f.onchange = () => { d.querySelector('.tn-urgent').hidden = !['me', 'adult', 'private'].includes((f.querySelector('input[name=kind]:checked') || {}).value); };
      f.onsubmit = async e => {
        e.preventDefault();
        const kind = (f.querySelector('input[name=kind]:checked') || {}).value, er = d.querySelector('#tn-help-err');
        if (!kind) { er.textContent = 'Choose what happened.'; er.hidden = false; return; }
        const btn = f.querySelector('button.btn-red'); btn.disabled = true;
        const { error } = await db.rpc('report_concern', { kind, who: f.who.value.trim() || null, details: f.details.value.trim() || null, page: location.pathname.split('/').pop() + location.search });
        btn.disabled = false;
        if (error) { er.textContent = 'Sorry, that didn’t send. Please tell a parent or teacher, or try again.'; er.hidden = false; return; }
        f.innerHTML = '<h2 style="margin:0">💛 Thank you for telling us</h2><p>The Think Nest safety team will look at this very soon. You did the right thing.</p><p class="meta">If you feel unsafe right now, tell an adult you trust straight away, or call 116111 (UAE Child Protection) or 999.</p><button type="button" class="btn btn-red auth-btn" onclick="this.closest(\'dialog\').close()">Close</button>';
      };
    }
    d.querySelector('form') && d.querySelector('form').reset && d.querySelector('form').reset();
    d.showModal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
