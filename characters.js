// ===== Think Nest characters (avatars): pick an animal or a friendly alien =====
const TN_CHARS = [
  ['fox', '🦊', 'Fox'], ['panda', '🐼', 'Panda'], ['owl', '🦉', 'Owl'], ['tiger', '🐯', 'Tiger'], ['frog', '🐸', 'Frog'], ['octopus', '🐙', 'Octopus'],
  ['koala', '🐨', 'Koala'], ['bunny', '🐰', 'Bunny'], ['penguin', '🐧', 'Penguin'], ['unicorn', '🦄', 'Unicorn'], ['dragon', '🐲', 'Dragon'], ['lion', '🦁', 'Lion'],
  ['alien', '👽', 'Zib the Alien'], ['invader', '👾', 'Pixel'], ['robot', '🤖', 'Robo'], ['ghost', '👻', 'Boo']
];
const TN_COLORS = [['sky', '#CDEBFF'], ['mint', '#CFF5E3'], ['sun', '#FFF0B8'], ['peach', '#FFD9CC'], ['lilac', '#E6DCFF'], ['rose', '#FFD6E5'], ['navy', '#3E4B94'], ['coral', '#F27A6F']];
const TN_EXTRAS = [['none', '', 'Nothing'], ['cap', '🎓', 'Grad cap'], ['crown', '👑', 'Crown'], ['shades', '🕶️', 'Shades'], ['phones', '🎧', 'Headphones'], ['tophat', '🎩', 'Top hat'], ['star', '⭐', 'Star']];
const tnChar = k => TN_CHARS.find(c => c[0] === k);
function tnParseAv(code) {
  const [c, col, x] = String(code || '').split('|');
  if (!tnChar(c)) return null;
  return { c, col: TN_COLORS.find(v => v[0] === col) ? col : 'sky', x: TN_EXTRAS.find(v => v[0] === x) ? x : 'none' };
}
function tnAvHtml(code) {
  const a = tnParseAv(code); if (!a) return '';
  const ch = tnChar(a.c), bg = TN_COLORS.find(v => v[0] === a.col)[1], ex = TN_EXTRAS.find(v => v[0] === a.x)[1];
  return `<span class="tn-av-face" aria-hidden="true">${ch[1]}</span>${ex ? `<span class="tn-av-x" aria-hidden="true">${ex}</span>` : ''}`;
}
const tnAvBg = code => { const a = tnParseAv(code); return a ? TN_COLORS.find(v => v[0] === a.col)[1] : null; };
const tnCharName = code => { const a = tnParseAv(code); return a ? tnChar(a.c)[2] : ''; };

// ----- show characters wherever [data-av="<user id>"] appears
const TN_AV_CACHE = {};
let tnAvTimer = null;
async function tnPaintAvatars() {
  const els = [...document.querySelectorAll('[data-av]:not([data-av-done])')].filter(e => e.dataset.av && e.dataset.av !== 'undefined');
  if (!els.length) return;
  const need = [...new Set(els.map(e => e.dataset.av))].filter(id => !(id in TN_AV_CACHE));
  if (need.length) {
    need.forEach(id => { TN_AV_CACHE[id] = null; });
    try { const { data } = await db.rpc('get_avatars', { ids: need }); (data || []).forEach(r => { TN_AV_CACHE[r.id] = r.avatar; }); } catch (_) {}
  }
  els.forEach(e => {
    const code = TN_AV_CACHE[e.dataset.av]; e.dataset.avDone = '1';
    if (!code || !tnParseAv(code)) return;
    e.classList.add('tn-av'); e.style.background = tnAvBg(code); e.innerHTML = tnAvHtml(code); e.title = tnCharName(code);
  });
}
function tnWatchAvatars() {
  tnPaintAvatars();
  new MutationObserver(() => { clearTimeout(tnAvTimer); tnAvTimer = setTimeout(tnPaintAvatars, 120); }).observe(document.body, { childList: true, subtree: true });
}

// ----- the character builder
async function tnOpenBuilder(onSaved) {
  const { data: { session } } = await db.auth.getSession(); if (!session) return;
  const { data: me } = await db.from('profiles').select('full_name, avatar').eq('id', session.user.id).maybeSingle();
  const st = tnParseAv(me && me.avatar) || { c: 'fox', col: 'sky', x: 'none' };
  const first = String((me && me.full_name) || '').split(' ')[0] || 'You';
  let d = document.getElementById('tn-builder');
  if (!d) { d = document.createElement('dialog'); d.id = 'tn-builder'; d.className = 'tn-builder'; d.setAttribute('aria-labelledby', 'tnb-title'); document.body.appendChild(d); }
  const code = () => `${st.c}|${st.col}|${st.x}`;
  const draw = () => {
    d.innerHTML = `<div class="tnb-top"><h2 id="tnb-title">🎨 Create your character</h2><button type="button" class="link-btn" data-close aria-label="Close">✕</button></div>
      <div class="tnb-body">
        <div class="tnb-preview"><span class="tn-av tnb-big" style="background:${tnAvBg(code())}">${tnAvHtml(code())}</span><b>${String(first).replace(/[<>&]/g, '')} the ${tnChar(st.c)[2]}</b><span class="meta">This is how others will see you</span></div>
        <div class="tnb-pick">
          <h3>1. Choose your character</h3>
          <div class="tnb-grid" role="radiogroup" aria-label="Character">${TN_CHARS.map(([k, e, n]) => `<button type="button" role="radio" aria-checked="${st.c === k}" data-c="${k}" title="${n}"><span>${e}</span><small>${n}</small></button>`).join('')}</div>
          <h3>2. Pick a colour</h3>
          <div class="tnb-colors" role="radiogroup" aria-label="Colour">${TN_COLORS.map(([k, v]) => `<button type="button" role="radio" aria-checked="${st.col === k}" aria-label="${k}" data-col="${k}" style="background:${v}"></button>`).join('')}</div>
          <h3>3. Add something fun</h3>
          <div class="tnb-extras" role="radiogroup" aria-label="Accessory">${TN_EXTRAS.map(([k, e, n]) => `<button type="button" role="radio" aria-checked="${st.x === k}" data-x="${k}">${e || '🚫'} <small>${n}</small></button>`).join('')}</div>
        </div>
      </div>
      <div class="tnb-foot"><button type="button" class="link-btn" data-random>🎲 Surprise me</button><button type="button" class="btn btn-red" data-save>Save my character</button></div>`;
  };
  draw();
  d.onclick = async e => {
    const t = e.target.closest('button'); if (!t) { if (e.target === d) d.close(); return; }
    if (t.dataset.close !== undefined) return d.close();
    if (t.dataset.c) st.c = t.dataset.c; if (t.dataset.col) st.col = t.dataset.col; if (t.dataset.x) st.x = t.dataset.x;
    if (t.dataset.random !== undefined) { st.c = TN_CHARS[Math.floor(Math.random() * TN_CHARS.length)][0]; st.col = TN_COLORS[Math.floor(Math.random() * TN_COLORS.length)][0]; st.x = TN_EXTRAS[Math.floor(Math.random() * TN_EXTRAS.length)][0]; }
    if (t.dataset.save !== undefined) {
      t.disabled = true;
      const { error } = await db.from('profiles').update({ avatar: code() }).eq('id', session.user.id);
      if (error) { t.disabled = false; return say(typeof friendly === 'function' ? friendly(error) : error.message); }
      TN_AV_CACHE[session.user.id] = code();
      document.querySelectorAll(`[data-av="${session.user.id}"]`).forEach(el => el.removeAttribute('data-av-done'));
      tnPaintAvatars(); d.close(); say('🎉 Love it! Your character is saved.');
      if (typeof onSaved === 'function') onSaved(code());
      return;
    }
    draw();
  };
  if (!d.open) d.showModal();
}

// ----- Today's challenge + fun fact (change every day)
const TN_CHALLENGES = [
  'What’s the most interesting thing you learned this week?', 'Share a book you think everyone should read. Why?', 'If you could invent anything, what would it be?',
  'What’s your top tip for remembering spellings or times tables?', 'Show us something you made or drew this week! 🎨', 'Which subject surprised you this term, and why?',
  'If you could visit any planet, which would you choose? 🪐', 'What’s one thing you’re proud of today?', 'Ask a question you’ve always wondered about! ❓',
  'Describe your dream school in three words.', 'What’s a kind thing someone did for you recently? 💛', 'Share a fun maths puzzle for others to solve! 🧩',
  'Which animal would make the best teacher, and why? 🦉', 'What’s your favourite way to relax after school?', 'If you wrote a book, what would it be called? 📚'
];
const TN_FACTS = [
  'Octopuses have three hearts and blue blood. 🐙', 'Honey never goes bad: honey found in ancient Egyptian tombs was still edible! 🍯', 'A day on Venus is longer than a year on Venus. 🪐',
  'Owls can turn their heads about 270 degrees. 🦉', 'The Burj Khalifa is so tall you can watch the sunset twice: once from the ground and again from the top! 🌇',
  'Bananas are berries, but strawberries aren’t! 🍌', 'Your brain uses about 20% of your body’s energy. 🧠', 'Sharks existed before trees did. 🦈',
  'A group of flamingos is called a “flamboyance”. 🦩', 'Arabic is written from right to left and has 28 letters. ✍️', 'There are more stars in space than grains of sand on all Earth’s beaches. ✨',
  'Butterflies taste with their feet. 🦋', 'The heart of a blue whale is as big as a small car. 🐋', 'Zero was developed as a number in ancient India. 0️⃣', 'Penguins propose with a pebble. 🐧'
];
const tnToday = list => list[Math.floor(Date.now() / 864e5) % list.length];

// ----- Community page extras (welcome character, today's challenge, fun fact)
async function tnCommunityExtras() {
  const { data: { session } } = await db.auth.getSession(); if (!session) return;
  const { data: me } = await db.from('profiles').select('full_name, role, avatar').eq('id', session.user.id).maybeSingle(); if (!me) return;
  const first = String(me.full_name || '').split(' ')[0];
  const hero = document.getElementById('comm-hero');
  if (hero && !document.getElementById('hero-me')) {
    const box = document.createElement('div'); box.className = 'hero-me'; box.id = 'hero-me';
    hero.insertBefore(box, hero.firstChild);
  }
  const paintHero = code => {
    const box = document.getElementById('hero-me'); if (!box) return;
    box.innerHTML = code && tnParseAv(code)
      ? `<span class="tn-av hero-av" style="background:${tnAvBg(code)}">${tnAvHtml(code)}</span><button type="button" class="hero-av-btn" id="hero-av-btn">✏️ Edit my character</button>`
      : `<span class="hero-av hero-av-empty" aria-hidden="true">❓</span><button type="button" class="hero-av-btn pulse" id="hero-av-btn">🎨 Create your character!</button>`;
    const hello = document.getElementById('hero-hello');
    if (hello && code && tnParseAv(code) && first) hello.textContent = hello.textContent.replace(new RegExp(first + '( 👋)?$'), first + ' the ' + tnCharName(code) + ' 👋');
    document.getElementById('hero-av-btn').onclick = () => tnOpenBuilder(c => paintHero(c));
  };
  paintHero(me.avatar);
  // today's challenge, above the composer
  const comp = document.getElementById('composer');
  if (comp && !document.getElementById('tn-challenge')) {
    const ch = tnToday(TN_CHALLENGES);
    const c = document.createElement('section'); c.className = 'tn-challenge'; c.id = 'tn-challenge';
    c.innerHTML = `<span class="tn-ch-ic" aria-hidden="true">🎯</span><div><span class="tn-ch-k">Today’s challenge</span><p>${ch}</p></div><button type="button" class="btn btn-red" id="tn-ch-go">Answer this</button>`;
    comp.parentNode.insertBefore(c, comp);
    document.getElementById('tn-ch-go').onclick = () => {
      const t = document.getElementById('post-body'); if (!t) return;
      t.value = '🎯 ' + ch + '\n'; t.focus(); t.setSelectionRange(t.value.length, t.value.length);
      const r = comp.querySelector('input[value="question"]') ? null : null; comp.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  }
  // fun fact, top of the sidebar
  const side = document.querySelector('.comm-side');
  if (side && !document.getElementById('tn-fact')) {
    const f = document.createElement('div'); f.className = 'panel side-card tn-fact'; f.id = 'tn-fact';
    f.innerHTML = `<h3>🤓 Fun fact of the day</h3><p>${tnToday(TN_FACTS)}</p>`;
    side.insertBefore(f, side.firstChild);
  }
}
