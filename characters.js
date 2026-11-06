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
      if (error) { t.disabled = false; return say(/permission/i.test(error.message || '') ? 'Your character couldn’t be saved yet. Please ask the Think Nest team to run database update 50.' : (typeof friendly === 'function' ? friendly(error) : error.message)); }
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
  const { data: me } = await db.from('profiles').select('full_name, role, avatar, grade').eq('id', session.user.id).maybeSingle(); if (!me) return;
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
  // question of the day (checked instantly, no posting), above the composer
  const comp = document.getElementById('composer');
  if (comp && !document.getElementById('tn-challenge')) {
    const c = document.createElement('section'); c.className = 'tn-challenge tn-quiz'; c.id = 'tn-challenge';
    comp.parentNode.insertBefore(c, comp);
    tnQuizCard(c, tnRiddleBand(me.role, me.grade));
  }
  // fun fact, top of the sidebar
  const side = document.querySelector('.comm-side');
  if (side && !document.getElementById('tn-fact')) {
    const f = document.createElement('div'); f.className = 'panel side-card tn-fact'; f.id = 'tn-fact';
    f.innerHTML = `<h3>🤓 Fun fact of the day</h3><p>${tnToday(TN_FACTS)}</p>`;
    side.insertBefore(f, side.firstChild);
    const r = document.createElement('div'); r.className = 'panel side-card tn-riddle'; r.id = 'tn-riddle';
    f.after(r); tnRiddleCard(r, tnRiddleBand(me.role, me.grade));
  }
}

// ----- Riddle of the day (age-appropriate, English + Arabic) -----
// [question, answer, hint] in English, then the same in Arabic
const TN_RIDDLES = {
  little: [
    ['What has a face and two hands, but no arms or legs?', 'A clock 🕰️', 'It tells you the time.', 'ما الشيء الذي له وجه ويدان، لكن ليس له ذراعان ولا رجلان؟', 'الساعة 🕰️', 'تخبرك بالوقت.'],
    ['What has four legs but cannot walk?', 'A table 🪑', 'You eat your dinner on it.', 'ما الشيء الذي له أربع أرجل ولا يمشي؟', 'الطاولة 🪑', 'تأكل عليها طعامك.'],
    ['What gets wetter the more it dries?', 'A towel 🧺', 'You use it after a bath.', 'ما الشيء الذي يزداد بللًا كلما جفّف؟', 'المنشفة 🧺', 'تستخدمها بعد الاستحمام.'],
    ['What is yellow, long and grows on trees, and monkeys love it?', 'A banana 🍌', 'You peel it before you eat it.', 'ما الشيء الأصفر الطويل الذي ينمو على الأشجار ويحبه القرد؟', 'الموزة 🍌', 'تقشّرها قبل أن تأكلها.'],
    ['What has keys but cannot open any doors?', 'A piano 🎹', 'It makes music.', 'ما الشيء الذي له مفاتيح لكنه لا يفتح أي باب؟', 'البيانو 🎹', 'يصدر موسيقى.'],
    ['I am white and cold, and I fall from the sky in winter. What am I?', 'Snow ❄️', 'You can build a snowman with me.', 'أنا أبيض وبارد، وأسقط من السماء في الشتاء. من أنا؟', 'الثلج ❄️', 'يمكنك أن تصنع مني رجل الثلج.'],
    ['What goes up when the rain comes down?', 'An umbrella ☂️', 'It keeps you dry.', 'ما الشيء الذي يرتفع عندما ينزل المطر؟', 'المظلة ☂️', 'تحميك من البلل.'],
    ['What has a neck but no head?', 'A bottle 🍼', 'You can drink water from it.', 'ما الشيء الذي له رقبة وليس له رأس؟', 'الزجاجة 🍼', 'تشرب منها الماء.']
  ],
  junior: [
    ['What has many teeth but cannot bite?', 'A comb 🪮', 'You use it on your hair.', 'ما الشيء الذي له أسنان كثيرة ولا يعضّ؟', 'المشط 🪮', 'تستخدمه لشعرك.'],
    ['The more you take, the more you leave behind. What are they?', 'Footsteps 👣', 'Think about walking on sand.', 'كلما أخذت منها أكثر، تركت خلفك أكثر. ما هي؟', 'خطوات الأقدام 👣', 'فكّر في المشي على الرمل.'],
    ['What has one eye but cannot see?', 'A needle 🪡', 'It is used for sewing.', 'ما الشيء الذي له عين واحدة ولا يرى؟', 'الإبرة 🪡', 'تُستخدم في الخياطة.'],
    ['What can travel around the world while staying in a corner?', 'A stamp 📮', 'You find it on a letter.', 'ما الشيء الذي يسافر حول العالم وهو ثابت في زاوية؟', 'طابع البريد 📮', 'تجده على الرسالة.'],
    ['What has a head and a tail but no body?', 'A coin 🪙', 'You might flip it to decide something.', 'ما الشيء الذي له وجهان وليس له جسم، ونرميه أحيانًا لنختار؟', 'العملة المعدنية 🪙', 'نستخدمها في الشراء.'],
    ['What breaks as soon as you say its name?', 'Silence 🤫', 'Shhh…', 'ما الشيء الذي ينكسر بمجرد أن تنطق باسمه؟', 'الصمت 🤫', 'هسس…'],
    ['What has cities but no houses, forests but no trees, and water but no fish?', 'A map 🗺️', 'You use it to find your way.', 'ما الشيء الذي فيه مدن بلا بيوت، وغابات بلا أشجار، وماء بلا سمك؟', 'الخريطة 🗺️', 'تستخدمها لتعرف طريقك.'],
    ['What goes up but never comes down?', 'Your age 🎂', 'It changes on your birthday.', 'ما الشيء الذي يزيد ولا ينقص أبدًا؟', 'العمر 🎂', 'يتغيّر في يوم ميلادك.']
  ],
  middle: [
    ['I have branches, but no fruit, trunk or leaves. What am I?', 'A bank 🏦', 'Think about money, not trees.', 'لي فروع كثيرة، لكن ليس لي جذع ولا أوراق ولا ثمار. من أنا؟', 'البنك 🏦', 'فكّر في المال لا في الأشجار.'],
    ['What can you hold in your right hand, but never in your left hand?', 'Your left hand ✋', 'Look at your own hands.', 'ما الشيء الذي تستطيع أن تمسكه بيدك اليمنى ولا تستطيع أبدًا أن تمسكه بيدك اليسرى؟', 'يدك اليسرى ✋', 'انظر إلى يديك.'],
    ['What comes once in a minute, twice in a moment, but never in a thousand years?', 'The letter M 🔤', 'Look closely at the spelling of the words.', 'ما الذي يأتي في الدقيقة مرة، وفي اللحظة مرتين، ولا يأتي في ألف سنة؟ (فكّر بالإنجليزية: minute, moment)', 'حرف M 🔤', 'انظر إلى طريقة كتابة الكلمات بالإنجليزية.'],
    ['If you have me, you want to share me. If you share me, you no longer have me. What am I?', 'A secret 🤐', 'Keep it to yourself!', 'إذا كنتُ عندك أردت أن تشاركني، وإذا شاركتني لم أعد عندك. من أنا؟', 'السرّ 🤐', 'احتفظ به لنفسك!'],
    ['What has to be broken before you can use it?', 'An egg 🥚', 'Think about breakfast.', 'ما الشيء الذي يجب أن تكسره قبل أن تستخدمه؟', 'البيضة 🥚', 'فكّر في الفطور.'],
    ['I speak without a mouth and hear without ears. I come alive with the wind. What am I?', 'An echo 🏔️', 'Shout in a big empty valley.', 'أتكلم بلا فم، وأسمع بلا أذنين، وتحييني الريح. من أنا؟', 'الصدى 🏔️', 'اصرخ في وادٍ واسع فارغ.'],
    ['A man looks at a photo and says: "I have no brothers or sisters, but that man’s father is my father’s son." Who is in the photo?', 'His son 👨‍👦', '"My father’s son" is the man himself.', 'نظر رجل إلى صورة وقال: «ليس لي إخوة ولا أخوات، لكن والد هذا الرجل هو ابن أبي». من في الصورة؟', 'ابنه 👨‍👦', '«ابن أبي» هو الرجل نفسه.'],
    ['What is always in front of you but cannot be seen?', 'The future 🔮', 'It hasn’t happened yet.', 'ما الشيء الذي يكون دائمًا أمامك ولا تستطيع رؤيته؟', 'المستقبل 🔮', 'لم يحدث بعد.']
  ],
  senior: [
    ['A farmer has 17 sheep. All but 9 run away. How many are left?', '9 🐑', 'Read “all but 9” carefully.', 'لدى مزارع 17 خروفًا، هربت جميعها إلا 9. كم بقي؟', '9 🐑', 'اقرأ «جميعها إلا 9» بدقة.'],
    ['You enter a dark room with one match. There is a candle, a lamp and a fireplace. What do you light first?', 'The match 🔥', 'You can’t light anything without it.', 'دخلت غرفة مظلمة ومعك عود ثقاب واحد، وفيها شمعة ومصباح زيتي ومدفأة. ماذا تشعل أولًا؟', 'عود الثقاب 🔥', 'لا يمكنك إشعال أي شيء بدونه.'],
    ['A bat and a ball cost 1.10 dirhams in total. The bat costs 1 dirham more than the ball. How much does the ball cost?', '0.05 dirhams (5 fils) ⚾', 'It’s not 0.10. Try writing an equation.', 'ثمن مضرب وكرة معًا 1.10 درهم، والمضرب أغلى من الكرة بدرهم واحد. كم ثمن الكرة؟', '0.05 درهم (5 فلوس) ⚾', 'ليست 0.10. جرّب كتابة معادلة.'],
    ['What number comes next? 1, 1, 2, 3, 5, 8, 13, …', '21 🌀', 'Add the two numbers before.', 'ما العدد التالي؟ 1، 1، 2، 3، 5، 8، 13، …', '21 🌀', 'اجمع العددين السابقين.'],
    ['If 5 machines make 5 widgets in 5 minutes, how long do 100 machines take to make 100 widgets?', '5 minutes ⚙️', 'How long does one machine take to make one widget?', 'إذا صنعت 5 آلات 5 قطع في 5 دقائق، فكم تحتاج 100 آلة لصنع 100 قطعة؟', '5 دقائق ⚙️', 'كم تحتاج آلة واحدة لصنع قطعة واحدة؟'],
    ['A lily pad doubles in size every day. It covers the whole lake on day 48. On which day did it cover half the lake?', 'Day 47 🪷', 'Think backwards from day 48.', 'تتضاعف مساحة ورقة زنبق الماء كل يوم، فتغطي البحيرة كاملة في اليوم 48. في أي يوم غطّت نصف البحيرة؟', 'اليوم 47 🪷', 'فكّر بالعكس من اليوم 48.'],
    ['What can fill a room but takes up no space?', 'Light 💡', 'Switch it on.', 'ما الشيء الذي يملأ الغرفة ولا يشغل أي حيّز؟', 'الضوء 💡', 'شغّل المفتاح.'],
    ['Three friends pay 30 dirhams for a room. The hotel refunds 5. They keep 1 each and tip 2. Now they paid 27 + 2 tip = 29. Where is the missing dirham?', 'There isn’t one: the 27 already includes the 2 tip 🧾', 'Don’t add the tip to the 27; subtract it.', 'دفع ثلاثة أصدقاء 30 درهمًا لغرفة، فأعاد الفندق 5، أخذ كل منهم درهمًا وتركوا 2 إكرامية. دفعوا 27 + 2 = 29. أين الدرهم الناقص؟', 'لا يوجد درهم ناقص: الـ27 تشمل الإكرامية أصلًا 🧾', 'لا تجمع الإكرامية مع الـ27، بل اطرحها.']
  ]
};
function tnRiddleBand(role, grade) {
  if (role && role !== 'student') return 'junior';
  const g = String(grade || ''); if (/KG/i.test(g)) return 'little';
  const n = parseInt(g.replace(/\D/g, ''), 10); if (!n) return 'junior';
  return n <= 2 ? 'little' : n <= 5 ? 'junior' : n <= 8 ? 'middle' : 'senior';
}
function tnRiddleCard(host, band) {
  const list = TN_RIDDLES[band] || TN_RIDDLES.junior, ar = typeof tnLang === 'function' && tnLang() === 'ar';
  let i = Math.floor(Date.now() / 864e5) % list.length;
  const L = ar ? { t: '🧩 لغز اليوم', hint: '💡 تلميح', show: '👀 اكشف الإجابة', next: '🔄 لغز آخر', ans: 'الإجابة:', tag: { little: '🐣 للصغار', junior: '🦊 للمستكشفين', middle: '🦉 للمفكرين', senior: '🦅 للأذكياء' } }
                 : { t: '🧩 Riddle of the day', hint: '💡 Hint', show: '👀 Reveal answer', next: '🔄 Another riddle', ans: 'Answer:', tag: { little: '🐣 Little ones', junior: '🦊 Explorers', middle: '🦉 Thinkers', senior: '🦅 Masterminds' } };
  const draw = () => {
    const r = list[i], q = ar ? r[3] : r[0], a = ar ? r[4] : r[1], h = ar ? r[5] : r[2];
    host.innerHTML = `<div class="tn-rd-top"><h3>${L.t}</h3><span class="tn-rd-tag">${L.tag[band]}</span></div>
      <p class="tn-rd-q">${q}</p>
      <p class="tn-rd-hint" hidden>💡 ${h}</p>
      <p class="tn-rd-ans" hidden><b>${L.ans}</b> ${a}</p>
      <div class="tn-rd-btns"><button type="button" data-rd="hint">${L.hint}</button><button type="button" data-rd="show" class="main">${L.show}</button></div>
      <button type="button" class="link-btn tn-rd-next" data-rd="next">${L.next}</button>`;
  };
  host.setAttribute('data-no-tr', '');
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-rd]'); if (!b) return;
    if (b.dataset.rd === 'hint') { host.querySelector('.tn-rd-hint').hidden = false; b.disabled = true; }
    if (b.dataset.rd === 'show') { host.querySelector('.tn-rd-ans').hidden = false; host.classList.add('solved'); b.disabled = true; }
    if (b.dataset.rd === 'next') { i = (i + 1) % list.length; host.classList.remove('solved'); draw(); }
  });
  draw();
}

// ----- Make each class page feel like its own private community -----
async function tnClassCommunity() {
  const gid = Number(new URLSearchParams(location.search).get('id')); if (!gid) return;
  const { data: g } = await db.from('study_groups').select('id, name, kind').eq('id', gid).maybeSingle();
  if (!g || g.kind !== 'class') return;
  const ar = typeof tnLang === 'function' && tnLang() === 'ar';
  const T = (en, a) => ar ? a : en;
  const lab = { 't-feed': T('💬 Class community', '💬 مجتمع الفصل'), 't-res': T('📚 Resources', '📚 المصادر'), 't-mem': T('👥 Members', '👥 الأعضاء') };
  document.querySelectorAll('.tabs [data-tab]').forEach(b => { if (lab[b.dataset.tab]) { b.textContent = lab[b.dataset.tab]; b.setAttribute('data-no-tr', ''); } });
  const feed = document.getElementById('t-feed'); if (!feed || document.getElementById('tn-class-banner')) return;
  const safe = String(g.name).replace(/[<>&]/g, '');
  const banner = document.createElement('section'); banner.className = 'tn-class-banner'; banner.id = 'tn-class-banner'; banner.setAttribute('data-no-tr', '');
  banner.innerHTML = `<span class="tn-cb-ic" aria-hidden="true">🔒</span><div><b>${T(safe + ' community', 'مجتمع ' + safe)}</b><p>${T('A private space just for this class. Only the teacher and students in this class can see it.', 'مساحة خاصة بهذا الفصل فقط. لا يراها إلا المعلّم وطلاب هذا الفصل.')}</p></div>
    <a class="btn btn-red" href="messages.html?group=${gid}">${T('💬 Open class chat', '💬 افتح محادثة الفصل')}</a>`;
  feed.prepend(banner);
  const comp = document.getElementById('gcomposer');
  if (comp && !document.getElementById('tn-class-challenge')) {
    const { data: { session } } = await db.auth.getSession();
    const { data: me } = session ? await db.from('profiles').select('role, grade').eq('id', session.user.id).maybeSingle() : { data: null };
    const card = document.createElement('section'); card.className = 'tn-challenge tn-quiz'; card.id = 'tn-class-challenge';
    banner.after(card); tnQuizCard(card, tnRiddleBand(me && me.role, me && me.grade));
    if (!document.getElementById('tn-class-riddle')) {
      const rd = document.createElement('section'); rd.className = 'panel side-card tn-riddle tn-riddle-wide'; rd.id = 'tn-class-riddle';
      card.after(rd); tnRiddleCard(rd, tnRiddleBand(me && me.role, me && me.grade));
    }
  }

}

// ===== Question of the day (checked instantly) + confetti =====
// [question, [options], correct index, fun fact] in English, then the same in Arabic
const TN_QUIZ = {
  little: [
    ['How many legs does a spider have?', ['6', '8', '4', '10'], 1, 'Spiders have 8 legs, and most have 8 eyes too! 🕷️', 'كم رجلًا للعنكبوت؟', ['6', '8', '4', '10'], 1, 'للعنكبوت 8 أرجل، ولمعظمها 8 عيون أيضًا! 🕷️'],
    ['What colour do you get when you mix blue and yellow?', ['Purple', 'Orange', 'Green', 'Pink'], 2, 'Blue + yellow = green, like grass! 🌱', 'ما اللون الذي نحصل عليه عند خلط الأزرق والأصفر؟', ['البنفسجي', 'البرتقالي', 'الأخضر', 'الوردي'], 2, 'أزرق + أصفر = أخضر، مثل العشب! 🌱'],
    ['Which animal says “moo”?', ['Cat', 'Cow', 'Duck', 'Dog'], 1, 'Cows can recognise their friends in a big herd! 🐄', 'أي حيوان يقول «مووو»؟', ['القطة', 'البقرة', 'البطة', 'الكلب'], 1, 'تستطيع البقرة التعرّف على صديقاتها في القطيع الكبير! 🐄'],
    ['What is 3 + 2?', ['4', '6', '5', '7'], 2, 'Count on from 3: 4, 5! You did it! 🖐️', 'كم يساوي 3 + 2؟', ['4', '6', '5', '7'], 2, 'عُدّ بدءًا من 3: 4، 5! أحسنت! 🖐️'],
    ['Which one is a fruit?', ['Carrot', 'Apple', 'Potato', 'Bread'], 1, 'Apples float in water because they are a quarter air! 🍎', 'أيّها فاكهة؟', ['الجزر', 'التفاحة', 'البطاطا', 'الخبز'], 1, 'يطفو التفاح على الماء لأن ربعه هواء! 🍎'],
    ['How many days are in a week?', ['5', '7', '10', '6'], 1, 'Seven days, then it starts all over again! 📅', 'كم يومًا في الأسبوع؟', ['5', '7', '10', '6'], 1, 'سبعة أيام، ثم يبدأ الأسبوع من جديد! 📅']
  ],
  junior: [
    ['What is 7 × 8?', ['54', '56', '64', '48'], 1, 'Trick: 5, 6, 7, 8 → 56 = 7 × 8! ✖️', 'كم يساوي 7 × 8؟', ['54', '56', '64', '48'], 1, 'حيلة: 5، 6، 7، 8 ← 56 = 7 × 8! ✖️'],
    ['Which planet is closest to the Sun?', ['Venus', 'Earth', 'Mercury', 'Mars'], 2, 'Mercury zooms around the Sun in just 88 days! ☀️', 'ما الكوكب الأقرب إلى الشمس؟', ['الزهرة', 'الأرض', 'عطارد', 'المريخ'], 2, 'يدور عطارد حول الشمس في 88 يومًا فقط! ☀️'],
    ['What do plants need to make their own food?', ['Sunlight', 'Sand', 'Milk', 'Darkness'], 0, 'Plants use sunlight, water and air: it’s called photosynthesis! 🌿', 'ماذا تحتاج النباتات لتصنع غذاءها؟', ['ضوء الشمس', 'الرمل', 'الحليب', 'الظلام'], 0, 'تستخدم النباتات ضوء الشمس والماء والهواء، وتسمى هذه العملية البناء الضوئي! 🌿'],
    ['Which word is a noun?', ['Run', 'Happy', 'Table', 'Quickly'], 2, 'A noun is a person, place or thing, like “table”! 📝', 'أيّ كلمة اسم؟ (فكّر بالإنجليزية)', ['Run', 'Happy', 'Table', 'Quickly'], 2, 'الاسم هو شخص أو مكان أو شيء، مثل «طاولة» (Table)! 📝'],
    ['What is half of 50?', ['20', '30', '25', '15'], 2, 'Half means split into 2 equal parts: 25 + 25 = 50! ½', 'كم يساوي نصف 50؟', ['20', '30', '25', '15'], 2, 'النصف يعني جزأين متساويين: 25 + 25 = 50! ½'],
    ['What is the capital city of the UAE?', ['Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman'], 2, 'Abu Dhabi is the capital, and Dubai is the biggest city! 🇦🇪', 'ما عاصمة دولة الإمارات؟', ['دبي', 'الشارقة', 'أبوظبي', 'عجمان'], 2, 'أبوظبي هي العاصمة، ودبي هي أكبر مدينة! 🇦🇪']
  ],
  middle: [
    ['What is 15% of 200?', ['15', '30', '20', '25'], 1, '10% of 200 is 20, 5% is 10, so 15% is 30! 💯', 'كم تساوي 15% من 200؟', ['15', '30', '20', '25'], 1, '10% من 200 هي 20، و5% هي 10، إذن 15% هي 30! 💯'],
    ['Which gas do humans breathe out?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 2, 'Plants take in the carbon dioxide we breathe out. Teamwork! 🌳', 'ما الغاز الذي يخرجه الإنسان مع الزفير؟', ['الأكسجين', 'النيتروجين', 'ثاني أكسيد الكربون', 'الهيليوم'], 2, 'تمتص النباتات ثاني أكسيد الكربون الذي نزفره. تعاون رائع! 🌳'],
    ['What is the next prime number after 7?', ['9', '11', '13', '10'], 1, 'A prime has exactly two factors: 1 and itself. 11 fits! 🔢', 'ما العدد الأولي التالي بعد 7؟', ['9', '11', '13', '10'], 1, 'للعدد الأولي عاملان فقط: 1 والعدد نفسه. و11 كذلك! 🔢'],
    ['Water boils at what temperature (at sea level)?', ['50°C', '90°C', '100°C', '120°C'], 2, 'At the top of Mount Everest, water boils at only about 70°C! 🏔️', 'عند أي درجة حرارة يغلي الماء (عند مستوى سطح البحر)؟', ['50°م', '90°م', '100°م', '120°م'], 2, 'على قمة إيفرست يغلي الماء عند نحو 70°م فقط! 🏔️'],
    ['Which is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3, 'The Pacific is bigger than all the land on Earth put together! 🌊', 'ما أكبر محيط على الأرض؟', ['الأطلسي', 'الهندي', 'المتجمد الشمالي', 'الهادئ'], 3, 'المحيط الهادئ أكبر من مساحة اليابسة كلها مجتمعة! 🌊'],
    ['What is the area of a rectangle 6 cm long and 4 cm wide?', ['10 cm²', '20 cm²', '24 cm²', '12 cm²'], 2, 'Area = length × width = 6 × 4 = 24 cm²! 📐', 'ما مساحة مستطيل طوله 6 سم وعرضه 4 سم؟', ['10 سم²', '20 سم²', '24 سم²', '12 سم²'], 2, 'المساحة = الطول × العرض = 6 × 4 = 24 سم²! 📐']
  ],
  senior: [
    ['Solve: 3x + 5 = 20. What is x?', ['3', '5', '15', '25/3'], 1, '3x = 15, so x = 5. Algebra unlocked! 🔓', 'حلّ: 3س + 5 = 20. كم تساوي س؟', ['3', '5', '15', '25/3'], 1, '3س = 15، إذن س = 5. أحسنت! 🔓'],
    ['What is the chemical symbol for sodium?', ['S', 'So', 'Na', 'Sd'], 2, 'Na comes from “natrium”, its Latin name! 🧂', 'ما الرمز الكيميائي للصوديوم؟', ['S', 'So', 'Na', 'Sd'], 2, 'الرمز Na مأخوذ من اسمه اللاتيني «ناتريوم»! 🧂'],
    ['What is the derivative of x²?', ['x', '2x', 'x³/3', '2'], 1, 'Power rule: bring the 2 down and reduce the power by 1! 📈', 'ما مشتقة س²؟', ['س', '2س', 'س³/3', '2'], 1, 'قاعدة القوة: أنزل الأس 2 واطرح 1 من القوة! 📈'],
    ['Which organelle is known as the “powerhouse of the cell”?', ['Nucleus', 'Ribosome', 'Mitochondrion', 'Vacuole'], 2, 'Mitochondria release energy from glucose in respiration! ⚡', 'أي عُضيّة تُعرف بـ«محطة الطاقة في الخلية»؟', ['النواة', 'الريبوسوم', 'الميتوكوندريا', 'الفجوة'], 2, 'تطلق الميتوكوندريا الطاقة من الجلوكوز أثناء التنفس الخلوي! ⚡'],
    ['What is the speed of light, roughly?', ['300 km/s', '3,000 km/s', '300,000 km/s', '3 million km/s'], 2, 'Light could circle the Earth about 7.5 times in one second! 💡', 'كم تبلغ سرعة الضوء تقريبًا؟', ['300 كم/ث', '3,000 كم/ث', '300,000 كم/ث', '3 ملايين كم/ث'], 2, 'يستطيع الضوء أن يدور حول الأرض نحو 7.5 مرات في ثانية واحدة! 💡'],
    ['If a fair coin is tossed twice, what is the probability of two heads?', ['1/2', '1/3', '1/4', '2/3'], 2, '1/2 × 1/2 = 1/4. Probability multiplies for independent events! 🪙', 'إذا رُميت قطعة نقود عادلة مرتين، فما احتمال ظهور الصورة مرتين؟', ['1/2', '1/3', '1/4', '2/3'], 2, '1/2 × 1/2 = 1/4. الاحتمالات تُضرب للأحداث المستقلة! 🪙']
  ]
};
// words that count as a correct riddle answer (English | Arabic), in the same order as TN_RIDDLES
const TN_RIDDLE_OK = {
  little: [['clock|ساعة'], ['table|طاولة|طاوله'], ['towel|منشفة|منشفه|فوطة'], ['banana|موز'], ['piano|بيانو'], ['snow|ثلج'], ['umbrella|مظلة|مظله|شمسية'], ['bottle|زجاجة|زجاجه|قارورة']],
  junior: [['comb|مشط'], ['footstep|footprint|step|خطوات|خطوة|آثار'], ['needle|إبرة|ابرة|ابره'], ['stamp|طابع'], ['coin|عملة|عمله|قطعة نقود|نقود'], ['silence|quiet|صمت|سكوت'], ['map|خريطة|خريطه'], ['age|عمر|السن']],
  middle: [['bank|بنك|مصرف'], ['left hand|left|يسرى|اليسرى|يدك اليسرى'], ['m|letter m|حرف m|ميم'], ['secret|سر|السر'], ['egg|بيض|بيضة|بيضه'], ['echo|صدى'], ['son|ابنه|ابن'], ['future|tomorrow|مستقبل|غد']],
  senior: [['9|nine|تسعة|تسعه'], ['match|عود الثقاب|الثقاب|كبريت'], ['0.05|5 fils|five fils|5 فلوس|0.05|خمسة فلوس'], ['21|twenty one|twenty-one|واحد وعشرين|21'], ['5 minutes|5|five minutes|خمس دقائق|5 دقائق'], ['47|day 47|اليوم 47|سبعة واربعين'], ['light|ضوء|الضوء|نور'], ['no missing|none|there is no|no dirham|nothing missing|لا يوجد|ما في|لا شيء']]
};
const tnNorm = s => String(s || '').toLowerCase().replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\p{L}\p{N}.\/ ]/gu, ' ').replace(/^(the|a|an)\s+/, '').replace(/\s+/g, ' ').trim();
function tnConfetti(host) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'tn-confetti'; box.setAttribute('aria-hidden', 'true');
  const colors = ['#F27A6F', '#3E4B94', '#2FA08A', '#F2C14E', '#8E7CE6', '#3E8EDE'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = (Math.random() * 100) + '%'; p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * .3) + 's'; p.style.animationDuration = (1.2 + Math.random() * 1.2) + 's';
    p.style.setProperty('--x', (Math.random() * 160 - 80) + 'px'); p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    if (i % 3 === 0) p.style.borderRadius = '50%';
    box.appendChild(p);
  }
  (host || document.body).appendChild(box); setTimeout(() => box.remove(), 2800);
}
const TN_YES = { en: ['Brilliant! 🎉', 'You got it! 🌟', 'Superstar! ⭐', 'Amazing! 🙌', 'Spot on! 🎯'], ar: ['رائع! 🎉', 'أحسنت! 🌟', 'نجم! ⭐', 'مذهل! 🙌', 'إجابة صحيحة! 🎯'] };
const TN_NO = { en: ['Oops! Not quite 🙈 Have another go!', 'So close! 🤏 Try again!', 'Hmm, nope! 🤔 One more try?', 'Nice try! 😅 Give it another shot!'], ar: ['أوه! ليست تمامًا 🙈 حاول مرة أخرى!', 'قريب جدًا! 🤏 حاول من جديد!', 'همم، لا! 🤔 محاولة أخرى؟', 'محاولة جميلة! 😅 جرّب مرة أخرى!'] };
const tnPick = a => a[Math.floor(Math.random() * a.length)];
function tnWobble(el) { el.classList.remove('tn-wobble'); void el.offsetWidth; el.classList.add('tn-wobble'); }

function tnQuizCard(host, band) {
  const list = TN_QUIZ[band] || TN_QUIZ.junior, ar = typeof tnLang === 'function' && tnLang() === 'ar', L = ar ? 'ar' : 'en';
  const i = Math.floor(Date.now() / 864e5) % list.length, r = list[i];
  const q = ar ? r[4] : r[0], opts = ar ? r[5] : r[1], ok = ar ? r[6] : r[2], fact = ar ? r[7] : r[3];
  host.setAttribute('data-no-tr', '');
  host.innerHTML = `<span class="tn-ch-ic" aria-hidden="true">🧠</span><div class="tn-qz">
      <span class="tn-ch-k">${ar ? 'سؤال اليوم' : 'Question of the day'}</span><p>${q}</p>
      <div class="tn-qz-opts">${opts.map((o, k) => `<button type="button" data-k="${k}">${o}</button>`).join('')}</div>
      <p class="tn-qz-msg" role="status" aria-live="polite"></p></div>`;
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b || host.classList.contains('solved')) return;
    const msg = host.querySelector('.tn-qz-msg');
    if (Number(b.dataset.k) === ok) {
      b.classList.add('right'); host.classList.add('solved'); host.querySelectorAll('[data-k]').forEach(x => x.disabled = true);
      msg.className = 'tn-qz-msg ok'; msg.innerHTML = `<b>${tnPick(TN_YES[L])}</b> ${fact}`; tnConfetti(host);
    } else {
      b.classList.add('wrong'); b.disabled = true; msg.className = 'tn-qz-msg no'; msg.textContent = tnPick(TN_NO[L]); tnWobble(host);
    }
  });
}

// upgrade the riddle card: type an answer and check it
const _tnRiddleCard = tnRiddleCard;
tnRiddleCard = function (host, band) {
  _tnRiddleCard(host, band);
  const ar = typeof tnLang === 'function' && tnLang() === 'ar', L = ar ? 'ar' : 'en';
  const list = TN_RIDDLES[band] || TN_RIDDLES.junior, oks = TN_RIDDLE_OK[band] || TN_RIDDLE_OK.junior;
  let idx = Math.floor(Date.now() / 864e5) % list.length;
  const addBox = () => {
    if (host.querySelector('.tn-rd-try')) return;
    const q = host.querySelector('.tn-rd-q'); if (!q) return;
    q.insertAdjacentHTML('afterend', `<form class="tn-rd-try"><label class="sr" for="tn-rd-in">${ar ? 'إجابتك' : 'Your answer'}</label><input id="tn-rd-in" autocomplete="off" placeholder="${ar ? 'اكتب إجابتك…' : 'Type your answer…'}"><button type="submit">${ar ? 'تحقّق' : 'Check'}</button></form><p class="tn-rd-msg" role="status" aria-live="polite"></p>`);
    host.querySelector('.tn-rd-try').addEventListener('submit', e => {
      e.preventDefault();
      const val = tnNorm(host.querySelector('#tn-rd-in').value); if (!val) return;
      const words = String(oks[idx] || '').split('|').map(tnNorm).filter(Boolean);
      const msg = host.querySelector('.tn-rd-msg');
      if (words.some(w => val === w || val.includes(w) || (w.length > 3 && w.includes(val) && val.length > 2))) {
        host.classList.add('solved'); host.querySelector('.tn-rd-ans').hidden = false;
        msg.className = 'tn-rd-msg ok'; msg.innerHTML = `<b>${tnPick(TN_YES[L])}</b>`; tnConfetti(host);
        host.querySelectorAll('.tn-rd-try input, .tn-rd-try button').forEach(x => x.disabled = true);
      } else { msg.className = 'tn-rd-msg no'; msg.textContent = tnPick(TN_NO[L]); tnWobble(host); }
    });
  };
  addBox();
  host.addEventListener('click', e => { const b = e.target.closest('[data-rd="next"]'); if (b) { idx = (idx + 1) % list.length; setTimeout(addBox, 0); } });
};
