// ===== Think Nest Revision Hub: IGCSE and A Level (Think Nest summaries + trusted links) =====
const RV_LINKS = {
  edexcel: ['Pearson Edexcel (official)', 'https://qualifications.pearson.com', 'Specifications, sample papers and past papers. Some recent papers are only available to teachers.'],
  cambridge: ['Cambridge International (official)', 'https://www.cambridgeinternational.org', 'Syllabuses, specimen papers and support for Cambridge IGCSE and A Level.'],
  pmt: ['Physics & Maths Tutor', 'https://www.physicsandmathstutor.com', 'Free notes, topic questions and past papers for many subjects and boards.'],
  sme: ['Save My Exams', 'https://www.savemyexams.com', 'Revision notes and topic questions. Some content is free, the rest needs a subscription.'],
  genie: ['Maths Genie', 'https://www.mathsgenie.co.uk', 'Free maths videos, worksheets and exam questions by topic.'],
  corbett: ['Corbettmaths', 'https://corbettmaths.com', 'Free maths videos, worksheets and 5-a-day practice.'],
  bitesize: ['BBC Bitesize', 'https://www.bbc.co.uk/bitesize', 'Free, clear explanations and quizzes (GCSE level, useful for IGCSE).'],
  seneca: ['Seneca', 'https://senecalearning.com', 'Free interactive revision courses for many GCSE, IGCSE and A Level subjects.'],
  khan: ['Khan Academy', 'https://www.khanacademy.org', 'Free videos and practice, especially for maths and science.']
};
const EDU = slug => ['Eduvance (' + slug.replace(/-/g, ' ') + ')', 'https://www.eduvance.au/subjects/' + slug, 'Student-made notes and resources for Edexcel IGCSE and IAL. Website resources only.'];

const RV_LEVELS = {
  igcse: { name: 'IGCSE', grades: 'Grades 9–10 (Years 10–11)', about: 'A two-year course taken by most international students at age 14–16. Final exams are usually at the end of Grade 10.',
    boards: { edexcel: 'Pearson Edexcel International GCSE: graded 9 (highest) to 1. Some subjects, like Maths, have Foundation and Higher tiers. Exams are usually taken in May–June, with some subjects also available in January.',
              cambridge: 'Cambridge IGCSE: graded A* to G, or 9 to 1 in some schools. Many subjects have Core and Extended papers. Exams are taken in May–June or October–November.' } },
  alevel: { name: 'A Level', grades: 'Grades 11–12 (Years 12–13)', about: 'Two years of deeper study in three or four subjects, used for university entry. AS is the first half; the full A Level adds A2.',
    boards: { edexcel: 'Pearson Edexcel International A Level (IAL): modular, so you take units as you go (AS units in the first year, A2 units in the second). Graded A* to E. Exam sessions are usually in January, May–June and October.',
              cambridge: 'Cambridge International AS & A Level: AS papers first, then A Level papers, either in stages or all at the end. Graded A* to E. Exams are taken in May–June or October–November.' } }
};

// subject -> level -> { about, topics[], exam, tips[], links[] }
const RV = [
  { id: 'maths', name: 'Mathematics', ic: '➗', color: '#F27A6F', edu: 'mathematics',
    igcse: { about: 'Number, algebra, geometry and statistics, with an emphasis on solving problems and showing clear working.',
      topics: ['Number: fractions, percentages, standard form, surds', 'Algebra: equations, inequalities, sequences, functions', 'Graphs: straight lines, quadratics, gradients', 'Geometry: angles, circle theorems, transformations, vectors', 'Mensuration: area, volume, surface area', 'Trigonometry and Pythagoras', 'Probability and statistics'],
      exam: 'Written papers, with and without a calculator depending on the board. Higher or Extended tiers reach the top grades.',
      tips: ['Practise a few questions every day rather than cramming', 'Always show working, as method marks count', 'Learn the formula list your board does not give you', 'Do full past papers under timed conditions'], links: ['genie', 'corbett', 'pmt', 'sme', 'khan'] },
    alevel: { about: 'Pure mathematics with statistics and mechanics, building strong problem-solving skills for university.',
      topics: ['Pure: algebra, functions, coordinate geometry', 'Calculus: differentiation and integration', 'Trigonometry, exponentials and logarithms', 'Sequences, series and the binomial expansion', 'Vectors and proof', 'Statistics: distributions and hypothesis testing', 'Mechanics: kinematics, forces and Newton’s laws'],
      exam: 'Edexcel IAL is taken as units (for example P1–P4 with statistics or mechanics units). Cambridge has Pure, Probability & Statistics and Mechanics papers.',
      tips: ['Master algebra first, as everything depends on it', 'Redo questions you got wrong a week later', 'Use mark schemes to learn how marks are given'], links: ['pmt', 'sme', 'khan'] } },
  { id: 'further', name: 'Further Mathematics', ic: '∑', color: '#C25E8F', edu: 'further-mathematics',
    igcse: { about: 'Extra maths for strong students, preparing for A Level (Edexcel Further Pure Mathematics or Cambridge Additional Mathematics).',
      topics: ['Surds, indices and logarithms', 'Quadratics and polynomials', 'Coordinate geometry', 'Calculus: differentiation and integration', 'Trigonometry and identities', 'Series and the binomial expansion', 'Vectors'],
      exam: 'Usually two written papers with a calculator.', tips: ['Keep up with your normal maths too', 'Learn standard results and identities by heart'], links: ['pmt', 'sme'] },
    alevel: { about: 'A second maths A Level for students who love maths: complex numbers, matrices, further calculus and more.',
      topics: ['Complex numbers', 'Matrices', 'Proof by induction', 'Further calculus and differential equations', 'Polar coordinates and hyperbolic functions', 'Further statistics and mechanics'],
      exam: 'Edexcel IAL Further Pure units with optional applied units. Cambridge Further Mathematics papers.', tips: ['Study alongside A Level Maths', 'Work through proofs step by step'], links: ['pmt', 'sme'] } },
  { id: 'english-language', name: 'English Language', ic: '✍️', color: '#3E4B94', edu: 'english-language',
    igcse: { about: 'Reading and analysing fiction and non-fiction, and writing clearly for different purposes and audiences.',
      topics: ['Reading for meaning and inference', 'Analysing language and structure', 'Comparing texts and viewpoints', 'Summary writing', 'Descriptive and narrative writing', 'Persuasive and argumentative writing', 'Spelling, punctuation and grammar'],
      exam: 'Written papers on unseen texts and writing tasks. Edexcel uses an anthology of set texts; Cambridge includes directed writing and composition. Some schools also do coursework or a speaking component.',
      tips: ['Read a little every day: articles, stories, opinion pieces', 'Plan before you write, even for two minutes', 'Learn a bank of language techniques and their effects', 'Time yourself per question'], links: ['bitesize', 'sme', 'seneca'] },
    alevel: { about: 'How English works and changes: language in use, language and society, and your own original writing.',
      topics: ['Language frameworks: lexis, grammar, phonology, pragmatics', 'Language and identity', 'Child language development', 'Language change over time', 'Spoken versus written language', 'Original and critical writing'],
      exam: 'Written exams analysing texts and data, plus writing tasks. Some routes include coursework.', tips: ['Collect real examples of language from the world around you', 'Use linguistic terms accurately'], links: ['sme', 'seneca'] } },
  { id: 'english-literature', name: 'English Literature', ic: '📖', color: '#5B6BC0', edu: 'english-literature',
    igcse: { about: 'Studying poetry, prose and drama, and writing essays about how writers create meaning.',
      topics: ['Poetry (set anthology and unseen poems)', 'A modern prose text or novel', 'A play, often Shakespeare or a modern drama', 'Themes, characters and context', 'Writers’ methods: language, form and structure', 'Essay writing with quotations'],
      exam: 'Essay-based papers, some open-book depending on the board. Some schools include coursework.',
      tips: ['Learn short key quotations for each character and theme', 'Always explain the effect on the reader', 'Write timed practice essays'], links: ['bitesize', 'sme', 'seneca'] },
    alevel: { about: 'In-depth study of poetry, prose and drama across periods, including literary criticism.',
      topics: ['Drama, including Shakespeare', 'Prose from different periods', 'Poetry', 'Unseen texts', 'Critical and contextual approaches', 'Comparative essays'],
      exam: 'Essay papers on set and unseen texts.', tips: ['Read your set texts more than once', 'Use critics’ views to support your own argument'], links: ['sme', 'seneca'] } },
  { id: 'biology', name: 'Biology', ic: '🧬', color: '#2FA08A', edu: 'biology',
    igcse: { about: 'How living things work, from cells and genes to ecosystems and human health.',
      topics: ['Cells, diffusion and osmosis', 'Enzymes and biological molecules', 'Nutrition and digestion', 'Transport in plants and animals', 'Respiration and gas exchange', 'Coordination, hormones and homeostasis', 'Reproduction and inheritance', 'Ecology and human impact'],
      exam: 'Written papers with multiple choice, short and longer answers, and questions on practical skills.',
      tips: ['Learn key definitions word for word', 'Practise drawing and labelling diagrams', 'Know the required practicals and how to improve them'], links: ['bitesize', 'pmt', 'sme', 'seneca'] },
    alevel: { about: 'Molecules, cells, genetics, physiology and ecology in depth, with practical and data skills.',
      topics: ['Biological molecules and enzymes', 'Cell structure, membranes and division', 'Exchange and transport', 'Genetics, DNA and protein synthesis', 'Energy: photosynthesis and respiration', 'Homeostasis, nerves and hormones', 'Ecology, evolution and biodiversity', 'Practical skills and statistics'],
      exam: 'Written papers including a practical skills paper (Edexcel IAL) or practical exam (Cambridge).', tips: ['Use flashcards for processes', 'Practise data-analysis questions'], links: ['pmt', 'sme', 'seneca'] } },
  { id: 'chemistry', name: 'Chemistry', ic: '⚗️', color: '#E3A43B', edu: 'chemistry',
    igcse: { about: 'What substances are made of, how they react, and how chemistry is used in everyday life.',
      topics: ['Atomic structure and the periodic table', 'Bonding and structure', 'Moles and calculations', 'Acids, bases and salts', 'Electrolysis', 'Energetics and rates of reaction', 'Metals and the reactivity series', 'Organic chemistry'],
      exam: 'Written papers with calculations, explanations and practical questions.', tips: ['Practise mole calculations until they are easy', 'Learn the colours of tests and observations', 'Balance equations every day'], links: ['bitesize', 'pmt', 'sme', 'seneca'] },
    alevel: { about: 'Physical, inorganic and organic chemistry in depth, with lots of calculation and practical work.',
      topics: ['Atomic structure and bonding', 'Energetics and kinetics', 'Equilibria and acid–base chemistry', 'Redox and electrochemistry', 'Periodic trends and transition metals', 'Organic reactions and mechanisms', 'Analysis: spectroscopy and chromatography', 'Practical techniques'],
      exam: 'Written papers including practical skills (Edexcel IAL) or a practical exam (Cambridge).', tips: ['Draw mechanisms with curly arrows carefully', 'Make a reaction map for organic chemistry'], links: ['pmt', 'sme', 'seneca'] } },
  { id: 'physics', name: 'Physics', ic: '⚛️', color: '#3E8EDE', edu: 'physics',
    igcse: { about: 'Forces, energy, waves, electricity and the universe, using maths to describe how the world works.',
      topics: ['Forces and motion', 'Energy, work and power', 'Waves, light and sound', 'Electricity and circuits', 'Magnetism and electromagnetism', 'Thermal physics and particles', 'Radioactivity', 'Space physics'],
      exam: 'Written papers with calculations and practical questions.', tips: ['Learn equations and their units', 'Write the formula, substitute, then solve', 'Practise graph questions'], links: ['bitesize', 'pmt', 'sme', 'khan'] },
    alevel: { about: 'Mechanics, fields, waves, electricity and modern physics, with strong maths and practical skills.',
      topics: ['Mechanics and materials', 'Waves and particle nature of light', 'Electric circuits', 'Fields: gravitational, electric and magnetic', 'Thermal physics and gases', 'Nuclear and particle physics', 'Oscillations and astrophysics', 'Practical skills and uncertainties'],
      exam: 'Written papers including practical skills (Edexcel IAL) or a practical exam (Cambridge).', tips: ['Understand derivations, not just formulas', 'Practise multi-step problems'], links: ['pmt', 'sme', 'khan'] } },
  { id: 'computer-science', name: 'Computer Science', ic: '💻', color: '#6A78C9', edu: 'computer-science',
    igcse: { about: 'How computers work and how to solve problems with programming.',
      topics: ['Problem solving and algorithms', 'Programming (often Python or pseudocode)', 'Data representation: binary and hexadecimal', 'Hardware and software', 'Networks and the internet', 'Cyber security', 'Databases and logic gates'],
      exam: 'Written papers, often with a practical programming paper.', tips: ['Code a little every day', 'Trace algorithms by hand', 'Learn your board’s pseudocode style'], links: ['bitesize', 'pmt', 'sme'] },
    alevel: { about: 'Deeper computing theory and programming, including data structures and algorithms.',
      topics: ['Data structures and algorithms', 'Object-oriented programming', 'Computer architecture and processors', 'Operating systems', 'Networks and communication', 'Databases and SQL', 'Theory of computation'],
      exam: 'Written theory papers plus programming or practical papers, depending on the board.', tips: ['Build small projects to practise', 'Learn time complexity of common algorithms'], links: ['pmt', 'sme'] } },
  { id: 'ict', name: 'Information Technology', ic: '🖥️', color: '#4E9BB0', edu: 'information-technology',
    igcse: { about: 'Using digital tools well: documents, spreadsheets, databases, websites and staying safe online.',
      topics: ['Hardware, software and networks', 'Spreadsheets and data handling', 'Databases', 'Document production and presentations', 'Web authoring', 'E-safety and the effects of IT'],
      exam: 'A theory paper and practical papers on a computer.', tips: ['Practise the software skills, not just the theory', 'Follow instructions exactly in practical papers'], links: ['bitesize', 'sme'] },
    alevel: { about: 'IT systems, data, networks and their impact on organisations and society.',
      topics: ['Data and information systems', 'Networks and security', 'Databases and data management', 'Spreadsheet modelling', 'Emerging technologies', 'Project management'], exam: 'Theory and practical papers.', tips: ['Relate theory to real organisations'], links: ['sme'] } },
  { id: 'economics', name: 'Economics', ic: '📈', color: '#2F9E6E', edu: 'economics',
    igcse: { about: 'How people, businesses and governments make choices about scarce resources.',
      topics: ['The basic economic problem', 'Demand, supply and markets', 'Market failure', 'Government and the economy', 'Inflation, unemployment and growth', 'International trade and exchange rates'],
      exam: 'Written papers with short answers, data response and essays.', tips: ['Draw diagrams accurately and label them', 'Follow the news and link it to theory'], links: ['pmt', 'sme', 'seneca'] },
    alevel: { about: 'Microeconomics and macroeconomics in depth, with evaluation and real-world examples.',
      topics: ['Markets, elasticity and price mechanism', 'Market failure and government intervention', 'Firms, costs and market structures', 'Labour markets', 'Macroeconomic objectives and policy', 'Global economics and development'],
      exam: 'Data response, multiple choice and essay papers.', tips: ['Practise evaluation: “it depends on…”', 'Keep a file of recent economic examples'], links: ['pmt', 'sme', 'seneca'] } },
  { id: 'business', name: 'Business', ic: '💼', color: '#B07A3E', edu: 'business',
    igcse: { about: 'How businesses are set up and run: marketing, finance, people and operations.',
      topics: ['Business activity and objectives', 'People in business', 'Marketing', 'Operations management', 'Financial information and decisions', 'External influences on business'],
      exam: 'Written papers with case studies.', tips: ['Use the case study business in every answer', 'Learn key calculations such as profit and break-even'], links: ['bitesize', 'pmt', 'sme'] },
    alevel: { about: 'Business strategy, decision-making and analysis using real case studies.',
      topics: ['Marketing and people', 'Managing business activities', 'Business decisions and strategy', 'Finance and accounts', 'Global business'], exam: 'Case-study and essay papers.', tips: ['Always apply to the case', 'Make balanced judgements'], links: ['pmt', 'sme'] } },
  { id: 'accounting', name: 'Accounting', ic: '🧾', color: '#8A6BC2', edu: 'accounting',
    igcse: { about: 'Recording financial transactions and preparing and understanding financial statements.',
      topics: ['Double-entry bookkeeping', 'Books of prime entry and ledgers', 'Trial balance and correcting errors', 'Financial statements', 'Depreciation and adjustments', 'Analysing accounts with ratios'],
      exam: 'Written papers with calculations and short explanations.', tips: ['Practise layouts until they are automatic', 'Check that your trial balance balances'], links: ['pmt', 'sme'] },
    alevel: { about: 'Financial and management accounting for businesses of different types.',
      topics: ['Financial statements for sole traders, partnerships and companies', 'Cash flow statements', 'Ratio analysis', 'Costing and budgeting', 'Investment appraisal'], exam: 'Written papers with calculations and evaluation.', tips: ['Learn formats and ratio formulas'], links: ['pmt', 'sme'] } },
  { id: 'psychology', name: 'Psychology', ic: '🧠', color: '#C25E8F', edu: 'psychology', igcse: null,
    alevel: { about: 'The scientific study of the mind and behaviour, including research methods and classic studies.',
      topics: ['Social psychology', 'Cognitive psychology and memory', 'Biological psychology', 'Learning theories', 'Research methods and statistics', 'Clinical and criminal psychology'],
      exam: 'Written papers with short answers, research-methods questions and essays.', tips: ['Learn key studies: aim, method, results, conclusion', 'Practise evaluating studies'], links: ['pmt', 'sme', 'seneca'] } }
];

function startRevision() {
  const p = new URLSearchParams(location.search);
  let level = p.get('level') === 'alevel' ? 'alevel' : 'igcse', board = 'both', open = p.get('s') || null;
  const $ = id => document.getElementById(id);
  function draw() {
    document.querySelectorAll('[data-rl]').forEach(b => b.setAttribute('aria-selected', b.dataset.rl === level));
    document.querySelectorAll('[data-rb]').forEach(b => b.classList.toggle('on', b.dataset.rb === board));
    const L = RV_LEVELS[level];
    $('rv-intro').innerHTML = `<h2>${L.name} <span class="meta">${L.grades}</span></h2><p>${L.about}</p>
      <div class="rv-boards">${['edexcel', 'cambridge'].filter(b => board === 'both' || board === b).map(b => `<div class="rv-board"><b>${b === 'edexcel' ? 'Pearson Edexcel' : 'Cambridge'}</b><p>${L.boards[b]}</p></div>`).join('')}</div>`;
    const subs = RV.filter(s => s[level]);
    $('rv-grid').innerHTML = subs.map(s => `<button type="button" class="rv-card ${open === s.id ? 'on' : ''}" data-rs="${s.id}" style="--c:${s.color}"><span class="rv-ic">${s.ic}</span><b>${s.name}</b><span class="meta">${s[level].topics.length} topics</span></button>`).join('');
    const s = subs.find(x => x.id === open);
    $('rv-detail').hidden = !s;
    if (s) {
      const d = s[level];
      const links = (board === 'cambridge' ? ['cambridge'] : board === 'edexcel' ? ['edexcel'] : ['edexcel', 'cambridge']).map(k => RV_LINKS[k])
        .concat(board !== 'cambridge' && s.edu ? [EDU(s.edu)] : []).concat(d.links.map(k => RV_LINKS[k]));
      $('rv-detail').innerHTML = `<header class="rv-dh" style="--c:${s.color}"><span class="rv-ic">${s.ic}</span><div><h2>${L.name} ${s.name}</h2><p>${d.about}</p></div><button type="button" class="link-btn" data-close-rv>✕ Close</button></header>
        <div class="rv-cols">
          <section><h3>📚 Key topics</h3><ul>${d.topics.map(t => `<li>${t}</li>`).join('')}</ul></section>
          <section><h3>📝 The exam</h3><p>${d.exam}</p><h3>💡 Revision tips</h3><ul>${d.tips.map(t => `<li>${t}</li>`).join('')}</ul></section>
        </div>
        <h3>🔗 Trusted resources</h3><div class="rv-links">${links.map(([n, u, w]) => `<a class="rv-link" href="${u}" target="_blank" rel="noopener"><b>${n} ↗</b><span class="meta">${w}</span></a>`).join('')}</div>
        <p class="note">Topics are a Think Nest summary. Always check the exact specification for your board and syllabus code on the official website, or ask your teacher.</p>`;
      if (p.get('s') !== open) $('rv-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    history.replaceState(null, '', `revision.html?level=${level}${open ? '&s=' + open : ''}`);
  }
  document.addEventListener('click', e => {
    const l = e.target.closest('[data-rl]'), b = e.target.closest('[data-rb]'), s = e.target.closest('[data-rs]');
    if (l) { level = l.dataset.rl; if (open && !RV.find(x => x.id === open)[level]) open = null; draw(); }
    if (b) { board = b.dataset.rb; draw(); }
    if (s) { open = open === s.dataset.rs ? null : s.dataset.rs; draw(); }
    if (e.target.closest('[data-close-rv]')) { open = null; draw(); }
  });
  draw();
}
