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
  document.getElementById('form-subject').value = 'New Think Nest application: ' + job.title;
  document.getElementById('curriculum').value = job.title;
}
showJob();
window.addEventListener('hashchange', showJob);

// After sending, come back to this page and show the thank-you message
document.getElementById('form-next').value = location.href.split('#')[0].split('?')[0] + '?sent=1';
if (location.search.includes('sent=1')) {
  document.getElementById('apply-form').hidden = true;
  document.getElementById('thanks').hidden = false;
}

document.getElementById('cv').addEventListener('change', e => {
  document.getElementById('file-name').textContent = e.target.files[0] ? e.target.files[0].name : 'Choose a PDF or Word file';
});

// Until an email address is added to the form, show a friendly message instead of sending
const form = document.getElementById('apply-form');
form.addEventListener('submit', e => {
  if (form.action.includes('YOUR-EMAIL-HERE')) {
    e.preventDefault();
    alert('Thank you for your interest! Online applications open very soon. Please check back shortly.');
  }
});
