// The four job openings. Edit the text here to change what each job page says.
const jobs = {
  igcse: {
    title: 'IGCSE / Cambridge',
    intro: 'We’re looking for a passionate and experienced IGCSE / Cambridge teacher to join Think Nest. In this role, you’ll guide students through the Cambridge curriculum with engaging lessons, personalized support, and a focus on critical thinking and growth.',
    resp: ['Deliver high-quality lessons aligned with the Cambridge/IGCSE curriculum', 'Support students in preparing for assessments and exams', 'Encourage creativity, problem-solving, and independent learning', 'Collaborate with parents and mentors to track student progress'],
    qual: ['Teaching certification or relevant degree in education or subject specialization', 'Experience teaching IGCSE / Cambridge curriculum', 'Strong communication and mentoring skills', 'Passion for inspiring and empowering learners']
  },
  american: {
    title: 'American Curriculum',
    intro: 'We’re looking for a passionate and experienced American Curriculum teacher to join Think Nest. In this role, you’ll lead flexible, project-based learning aligned with Common Core State Standards, helping every student build confidence and skills.',
    resp: ['Plan and deliver engaging lessons aligned with Common Core State Standards', 'Design projects that connect learning to real life', 'Track student progress and give clear, helpful feedback', 'Work with parents and mentors to support each learner'],
    qual: ['Teaching certification or relevant degree in education or subject specialization', 'Experience teaching the American curriculum', 'Strong communication and mentoring skills', 'Passion for inspiring and empowering learners']
  },
  ib: {
    title: 'International Baccalaureate (IB)',
    intro: 'We’re looking for a passionate and experienced IB teacher to join Think Nest. In this role, you’ll guide students through inquiry-based learning that builds critical thinking, international-mindedness, and independence.',
    resp: ['Plan and teach inquiry-based units in line with IB frameworks', 'Help students develop approaches to learning skills', 'Use a range of assessment to support and record growth', 'Collaborate with parents and mentors to track student progress'],
    qual: ['Teaching certification or relevant degree in education or subject specialization', 'Experience teaching an IB programme', 'Strong communication and mentoring skills', 'Passion for inspiring and empowering learners']
  },
  montessori: {
    title: 'Montessori',
    intro: 'We’re looking for a passionate and experienced Montessori teacher to join Think Nest. In this role, you’ll support self-paced, hands-on learning that helps children grow in independence and curiosity.',
    resp: ['Prepare a calm, hands-on learning environment', 'Guide children through self-paced activities and exploration', 'Observe and record each child’s progress', 'Partner with parents to support learning at home'],
    qual: ['Montessori certification or relevant degree in early childhood education', 'Experience in a Montessori setting', 'Patience and strong observation skills', 'Passion for inspiring and empowering learners']
  }
};

function showJob() {
  const key = location.hash.replace('#', '');
  const job = jobs[key] || jobs.igcse;
  document.title = job.title + ' – Think Nest careers';
  document.getElementById('job-title').textContent = job.title;
  document.getElementById('job-details').innerHTML =
    '<p class="job-intro">' + job.intro + '</p>' +
    '<h3>Responsibilities</h3><ul>' + job.resp.map(r => '<li>' + r + '</li>').join('') + '</ul>' +
    '<h3>Qualifications</h3><ul>' + job.qual.map(q => '<li>' + q + '</li>').join('') + '</ul>';
  document.getElementById('form-job').value = job.title;
  document.getElementById('curriculum').value = job.title;
}
showJob();
window.addEventListener('hashchange', showJob);

document.getElementById('cv').addEventListener('change', e => {
  document.getElementById('file-name').textContent = e.target.files[0] ? e.target.files[0].name : 'Choose a PDF or Word file';
});

// Send the application: the CV goes to private Supabase storage, the details go to the admin inbox
const form = document.getElementById('apply-form'), aerr = document.getElementById('apply-error');
const aSay = m => { aerr.textContent = m; aerr.hidden = !m; if (m) aerr.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
form.addEventListener('submit', async e => {
  e.preventDefault(); aSay('');
  if (form._honey && form._honey.value) { form.hidden = true; document.getElementById('thanks').hidden = false; return; }
  for (const el of form.querySelectorAll('[required]')) {
    if (el.type === 'file' ? !el.files.length : (!el.value.trim() || !el.checkValidity())) {
      el.focus();
      return aSay(el.type === 'email' ? 'Enter a valid email address.' : el.type === 'file' ? 'Choose your CV to upload (PDF or Word).' : 'Please fill in every box.');
    }
  }
  const file = document.getElementById('cv').files[0];
  if (file.size > 5 * 1024 * 1024) return aSay('Your CV is larger than 5 MB. Please save a smaller copy and try again.');
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
  const v = n => (form.elements[n] ? form.elements[n].value.trim() : '');
  let attachment = null;
  try {
    const path = 'cv/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + file.name.replace(/[^\w.\-]+/g, '_');
    const up = await db.storage.from('applications').upload(path, file);
    if (!up.error) attachment = path;
  } catch (_) {}
  const details = [['Job', v('Job')], ['Phone', v('Phone')], ['Grade levels', v('Grade levels')], ['Education degree', v('Education degree')],
    ['Teaching method', v('Teaching method')], ['Curriculum', v('Curriculum type')], ['School', v('School name')],
    ['Experience', v('Teaching experience (years)') + ' years'], ['Bio', v('Bio')]].filter(x => x[1]).map(x => x[0] + ': ' + x[1]).join('\n');
  const msg = { name: v('Full name'), email: v('email'), who: 'Teacher applicant', topic: 'Job application: ' + v('Job'), message: details + (attachment ? '' : '\n\n(The CV could not be uploaded. Please ask the applicant to email it.)'), attachment };
  let error;
  try { ({ error } = await db.from('contact_messages').insert(msg)); } catch (x) { error = x; }
  btn.disabled = false; btn.textContent = 'Submit your application';
  if (error) {
    if (/attachment/.test(error.message || '')) { delete msg.attachment; ({ error } = await db.from('contact_messages').insert(msg)); }
    if (error) return aSay('Sorry, your application couldn’t be sent just now. Please try again in a minute, or email your CV to thinknest2026@gmail.com.');
  }
  form.reset(); document.getElementById('file-name').textContent = 'Choose a PDF or Word file';
  form.hidden = true; document.getElementById('thanks').hidden = false;
  document.getElementById('thanks').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
