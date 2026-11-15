// Think Nest AI helper (Supabase Edge Function: ask-thinknest)
// Answers visitors' questions about Think Nest using the Help Centre (help.js on the live site).
// Needs one secret in Supabase: GEMINI_API_KEY (a free key from Google AI Studio).

const SITE = 'https://thinknestonline.com';
const ALLOWED = [SITE, 'https://www.thinknestonline.com', 'https://thinknest26.github.io'];
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];

const ABOUT = `Think Nest (thinknestonline.com) is a safe online learning platform. Tagline: "Think with purpose, Grow with passion, Connect with the world".
- Live online classes in English, Maths, Science and Arabic, from KG1 to Grade 12, with real, checked teachers. Free to join.
- Curricula: British (shown as Year levels, e.g. Grade 1 = Year 2), IGCSE, A Level, IB, American and UAE Arabic (Arabic A and B).
- Students: join courses, live classes, quizzes, worksheets, videos, recordings, certificates, rewards, study groups, Revision Hub.
- Teachers: create online courses and lessons, take attendance, track progress, give certificates. Teacher accounts are approved by Think Nest.
- Parents: follow their children's progress, attendance and certificates, approve course requests for younger children, and get alerts if a class is missed.
- Think Paths (on the home page): find the right class in 3 taps: subject, curriculum and grade.
- Plot Twist: "Beyond the Bell" (Teacher Hub) and "Beyond the School Run" (Parent Hub): workshops, a café community and Coffee & Connections (partners, group meetups, directory, parent groups).
- Safety: every account is personally reviewed, adults can never message children privately, parents can see their child's chats, and posts are moderated.
- Pages: Join free (signup), Log in, About us, Our founders, Careers, Contact us (contact.html), Help Centre (help.html), Curriculum guide, Privacy notice, Terms of use.
- Contact: the Contact us page, or email thinknest2026@gmail.com.`;

let kb = '', kbAt = 0;
async function helpCentre(): Promise<string> {
  if (kb && Date.now() - kbAt < 3600_000) return kb;
  try {
    const js = await (await fetch(SITE + '/help.js', { headers: { 'cache-control': 'no-cache' } })).text();
    const clean = (x: string) => x.replace(/\\'/g, "'").replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const out: string[] = [];
    const ar = js.indexOf('const HELP_AR'), en = js.indexOf('const HELP_EN'), fnAt = js.indexOf('function startHelp');
    const parts: [string, string][] = [['English', js.slice(en, fnAt > en ? fnAt : undefined)], ['Arabic', js.slice(ar, en > ar ? en : undefined)]];
    // read the Help Centre text without running it: section names and ['question', 'answer'] pairs
    const tok = /name: '((?:[^'\\]|\\.)*)', qs:|\['((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\]/g;
    for (const [label, part] of parts) {
      if (ar < 0 && en < 0) break;
      out.push(`## Help Centre (${label})`);
      for (const m of part.matchAll(tok)) out.push(m[1] !== undefined ? `### ${clean(m[1])}` : `Q: ${clean(m[2])}\nA: ${clean(m[3])}`);
    }
    if (out.length) { kb = out.join('\n'); kbAt = Date.now(); }
  } catch (_) { /* keep the last copy */ }
  return kb;
}

// gentle limit per visitor, so the free quota lasts
const hits = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 10 * 60_000);
  list.push(now); hits.set(ip, list);
  return list.length > 20;
}

function cors(origin: string | null) {
  const ok = origin && (ALLOWED.includes(origin) || origin.startsWith('http://localhost'));
  return { 'Access-Control-Allow-Origin': ok ? origin! : SITE, 'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const H = { ...cors(origin), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: H });
  const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: H });

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return reply({ error: 'not_set_up' }, 500);
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
  if (tooMany(ip)) return reply({ error: 'busy' }, 429);

  let body: any = {};
  try { body = await req.json(); } catch (_) { return reply({ error: 'bad_request' }, 400); }
  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-10)
    .map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.text || '').slice(0, 800) }] }))
    .filter((m: any) => m.parts[0].text.trim());
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return reply({ error: 'bad_request' }, 400);

  const system = `You are "Nesty", the friendly helper on the Think Nest website. Answer questions from visitors, students, parents and teachers about Think Nest.
Rules:
- Use ONLY the information below. If the answer isn't there, say you're not sure and suggest the Contact us page or emailing thinknest2026@gmail.com. Never invent prices, dates, teachers, courses or policies.
- Reply in the same language as the question (Arabic or English). Keep answers short and clear (2-6 sentences, or a few simple steps). Use the page and button names from the Help Centre.
- Children may be using this chat: be kind and age-appropriate. Never ask for or repeat personal details (full names, phone numbers, addresses, passwords, emails). If someone shares them, tell them not to.
- You can't see or change anyone's account. For account problems, point them to the right page or to Contact us.
- If someone seems unsafe or upset, tell them kindly to talk to a trusted adult, a parent or their teacher, and to use the Contact us page.
- Only talk about Think Nest and learning on Think Nest. Politely decline anything else.
The person is on this page: ${String(body.page || '').slice(0, 80)}

# About Think Nest
${ABOUT}

${await helpCentre()}`;

  const payload = JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: msgs,
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 } });
  let lastErr = '';
  for (const model of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: payload });
      const j = await r.json();
      if (!r.ok) { lastErr = r.status + ' ' + (j?.error?.message || ''); if (r.status === 400 || r.status === 403) break; continue; }
      const text = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('').trim();
      if (text) return reply({ answer: text });
      lastErr = 'empty';
    } catch (e) { lastErr = String(e); }
  }
  console.error('ask-thinknest failed:', lastErr);
  return reply({ error: lastErr.startsWith('429') ? 'busy' : 'failed' }, 502);
});
