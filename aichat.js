// ===== Think Nest AI helper: chat bubble on every page (answers from the Help Centre) =====
(function () {
  if (window.__tnAiChat) return; window.__tnAiChat = 1;
  const FN = 'https://hbyzzivwfrcytcnqivqi.supabase.co/functions/v1/ask-thinknest';
  const ar = () => (typeof tnLang === 'function' ? tnLang() === 'ar' : /^ar/i.test(document.documentElement.lang || ''));
  const T = () => ar() ? {
      btn: 'اسأل نستي', title: 'نستي · مساعد ثينك نست', hello: 'مرحبًا! 👋 أنا نستي، مساعد ثينك نست. اسألني عن الدورات أو التسجيل أو حسابك أو أي شيء في الموقع.',
      ph: 'اكتب سؤالك…', send: 'إرسال', note: 'إجابات الذكاء الاصطناعي قد تخطئ. لا تشارك معلومات شخصية. لمساعدة أكثر: <a href="contact.html">اتصل بنا</a>.',
      wait: 'أفكّر…', busy: 'الكثير من الأسئلة الآن. حاول مرة أخرى بعد دقيقة.', fail: 'عذرًا، لم أستطع الإجابة الآن. جرّب <a href="help.html">مركز المساعدة</a> أو <a href="contact.html">اتصل بنا</a>.',
      close: 'إغلاق', clear: 'محادثة جديدة', ex: ['كيف أنضم إلى دورة؟', 'كيف أربط حساب طفلي؟', 'كيف أصبح معلّمًا في ثينك نست؟'] }
    : { btn: 'Ask Nesty', title: 'Nesty · Think Nest helper', hello: 'Hi! 👋 I’m Nesty, the Think Nest helper. Ask me about courses, signing up, your account or anything on the site.',
      ph: 'Type your question…', send: 'Send', note: 'AI answers can be wrong. Please don’t share personal details. Need more help? <a href="contact.html">Contact us</a>.',
      wait: 'Thinking…', busy: 'Lots of questions right now. Please try again in a minute.', fail: 'Sorry, I can’t answer right now. Try the <a href="help.html">Help Centre</a> or <a href="contact.html">Contact us</a>.',
      close: 'Close', clear: 'New chat', ex: ['How do I join a course?', 'How do I connect my child’s account?', 'How can I teach on Think Nest?'] };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // light formatting for answers: **bold**, line breaks, bullet lines, links to Think Nest pages
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[-*•]\s+/gm, '• ')
    .replace(/(https?:\/\/(?:www\.)?thinknestonline\.com\/[^\s<)]*)/g, '<a href="$1">$1</a>').replace(/\n/g, '<br>');
  let hist = [];
  try { hist = JSON.parse(sessionStorage.getItem('tn_ai_chat') || '[]'); } catch (_) {}
  const save = () => { try { sessionStorage.setItem('tn_ai_chat', JSON.stringify(hist.slice(-20))); } catch (_) {} };

  const css = `
  .tn-ai-btn{position:fixed;inset-inline-end:18px;bottom:18px;z-index:60;border:0;border-radius:30px;background:#FA7571;color:#fff;font:inherit;font-weight:800;padding:7px 18px 7px 8px;box-shadow:0 8px 24px rgba(30,35,82,.3);cursor:pointer;display:flex;gap:8px;align-items:center}
  .tn-ai-btn:hover{background:#e8605c}.tn-ai-btn:focus-visible{outline:3px solid #3E4B94;outline-offset:2px}
  .tn-ai-box{position:fixed;inset-inline-end:18px;bottom:18px;z-index:61;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 36px));background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(30,35,82,.35);display:flex;flex-direction:column;overflow:hidden;font-family:Raleway,system-ui,sans-serif}
  .tn-ai-box[hidden],.tn-ai-btn[hidden]{display:none}
  .tn-ai-head{background:#3E4B94;color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px}
  .tn-ai-head b{flex:1;font-size:1rem}.tn-ai-head button{background:none;border:0;color:#fff;font:inherit;cursor:pointer;font-size:.85rem;opacity:.9}
  .tn-ai-head .x{font-size:1.3rem;line-height:1}
  .tn-ai-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#F6F7FB}
  .tn-ai-m{max-width:86%;padding:9px 12px;border-radius:14px;line-height:1.5;font-size:.95rem;color:#1E2352;word-wrap:break-word}
  .tn-ai-m.bot{background:#fff;border:1px solid #E3E6F0;align-self:flex-start}.tn-ai-m.me{background:#3E4B94;color:#fff;align-self:flex-end}
  .tn-ai-m a{color:inherit;text-decoration:underline}.tn-ai-m.wait{opacity:.7;font-style:italic}
  .tn-ai-ex{display:flex;flex-wrap:wrap;gap:6px}.tn-ai-ex button{border:1px solid #C9CDE6;background:#fff;color:#3E4B94;border-radius:20px;padding:6px 10px;font:inherit;font-size:.82rem;cursor:pointer}
  .tn-ai-form{display:flex;gap:8px;padding:10px;border-top:1px solid #E3E6F0}
  .tn-ai-form input{flex:1;min-width:0;border:1px solid #D6D9E2;border-radius:12px;padding:10px 12px;font:inherit}
  .tn-ai-form button{border:0;background:#FA7571;color:#fff;border-radius:12px;padding:0 14px;font:inherit;font-weight:700;cursor:pointer}
  .tn-ai-form button:disabled{opacity:.6}
  .tn-ai-note{font-size:.72rem;color:#696984;padding:0 12px 10px;margin:0}.tn-ai-note a{color:#3E4B94}
  @media print{.tn-ai-btn,.tn-ai-box{display:none!important}}
  .tn-ai-bird{flex:none;width:40px;height:40px;border-radius:50%;background:#fff;display:grid;place-items:center;font-style:normal;box-shadow:0 2px 6px rgba(30,35,82,.15)}.tn-ai-bird img{width:32px;height:32px;object-fit:contain;transform:scaleX(-1)}
  .tn-ai-head .tn-ai-bird{width:34px;height:34px}.tn-ai-head .tn-ai-bird img{width:27px;height:27px}
  [dir=rtl] .tn-ai-btn{padding:7px 8px 7px 18px}
  @media(max-width:600px){.tn-ai-btn span{display:none}.tn-ai-btn,[dir=rtl] .tn-ai-btn{padding:7px}}`;

  function build() {
    if (document.getElementById('tn-ai-btn')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const b = document.createElement('button'); b.id = 'tn-ai-btn'; b.type = 'button'; b.className = 'tn-ai-btn';
    const box = document.createElement('section'); box.className = 'tn-ai-box'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Think Nest helper');
    document.body.append(b, box);
    const paint = () => {
      const t = T(); b.innerHTML = `<i class="tn-ai-bird"><img src="images/tn-bird.png" alt=""></i><span>${t.btn}</span>`; b.setAttribute('aria-label', t.btn);
      box.dir = ar() ? 'rtl' : 'ltr';
      box.innerHTML = `<div class="tn-ai-head"><i class="tn-ai-bird" aria-hidden="true"><img src="images/tn-bird.png" alt=""></i><b>${t.title}</b><button type="button" data-clear>${t.clear}</button><button type="button" class="x" data-close aria-label="${t.close}">✕</button></div>
        <div class="tn-ai-log" aria-live="polite"><div class="tn-ai-m bot">${t.hello}</div>${hist.length ? '' : `<div class="tn-ai-ex">${t.ex.map(q => `<button type="button" data-ex>${esc(q)}</button>`).join('')}</div>`}
          ${hist.map(m => `<div class="tn-ai-m ${m.role === 'user' ? 'me' : 'bot'}">${m.role === 'user' ? esc(m.text) : fmt(m.text)}</div>`).join('')}</div>
        <form class="tn-ai-form"><input type="text" maxlength="500" placeholder="${t.ph}" aria-label="${t.ph}"><button>${t.send}</button></form><p class="tn-ai-note">${t.note}</p>`;
      const log = box.querySelector('.tn-ai-log'); log.scrollTop = log.scrollHeight;
    };
    // move up when the student "I need help" button is on the page
    const dodge = () => { const h = document.getElementById('tn-help-btn'); b.style.bottom = h && !h.hidden ? '76px' : ''; };
    paint(); dodge(); setTimeout(dodge, 2500);
    b.onclick = () => { paint(); box.hidden = false; b.hidden = true; const i = box.querySelector('input'); if (i) i.focus(); };
    async function ask(q) {
      const t = T(), log = box.querySelector('.tn-ai-log'), form = box.querySelector('form');
      const ex = box.querySelector('.tn-ai-ex'); if (ex) ex.remove();
      hist.push({ role: 'user', text: q }); save();
      log.insertAdjacentHTML('beforeend', `<div class="tn-ai-m me">${esc(q)}</div><div class="tn-ai-m bot wait">${t.wait}</div>`); log.scrollTop = log.scrollHeight;
      form.querySelector('button').disabled = true;
      let html = t.fail;
      try {
        const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hist.slice(-10), page: location.pathname.split('/').pop() || 'index.html', lang: ar() ? 'ar' : 'en' }) });
        const j = await r.json().catch(() => ({}));
        if (j.answer) { hist.push({ role: 'assistant', text: j.answer }); save(); html = fmt(j.answer); }
        else if (r.status === 429 || j.error === 'busy') html = t.busy;
        else hist.pop();
      } catch (_) { hist.pop(); }
      save();
      const w = log.querySelector('.wait'); if (w) { w.classList.remove('wait'); w.innerHTML = html; }
      form.querySelector('button').disabled = false; log.scrollTop = log.scrollHeight;
    }
    box.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) { box.hidden = true; b.hidden = false; return; }
      if (e.target.closest('[data-clear]')) { hist = []; save(); paint(); return; }
      const ex = e.target.closest('[data-ex]'); if (ex) ask(ex.textContent);
    });
    box.addEventListener('submit', e => {
      e.preventDefault(); const i = box.querySelector('input'), q = i.value.trim(); if (!q) return;
      i.value = ''; ask(q);
    });
    box.addEventListener('keydown', e => { if (e.key === 'Escape') { box.hidden = true; b.hidden = false; b.focus(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
