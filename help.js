// ===== Think Nest Help Centre =====
const HELP = {
  students: { ic: '🎒', name: 'Students', qs: [
    ['How do I join a course?', 'Open <b>Learning → All Courses</b>, choose a course and click <b>Join</b>. It then appears in <b>My Courses</b>. You can also choose a subject on the home page under <b>Think Paths</b>.'],
    ['Where are my worksheets, quizzes and activities?', 'Open <b>My Courses</b>, choose the course, then a lesson. Everything your teacher added is listed under each lesson. Quizzes are marked straight away; other work is marked by your teacher.'],
    ['How do I hand in my work?', 'Open the activity in the lesson. Type your answer, or click <b>Upload</b> to add a photo or file, then click <b>Hand in</b>. You’ll get a 🔔 notification when your teacher marks it.'],
    ['How do I join a live class?', 'Live classes are in <b>My Calendar</b> and on the course page. From 15 minutes before the class starts, click <b>✋ Check in</b> on the course page so your teacher knows you’re there.'],
    ['What are Nest Points and badges?', 'You earn Nest Points for handing in work, perfect scores, finishing lessons, coming to class, and helping others. Collect badges and grow from 🥚 Hatchling to 🏆 Eagle! See <b>My Progress → My Rewards</b>.'],
    ['How do I add a friend?', 'Open <b>Community → My Friends</b>, search for a classmate and send a request. You can chat privately once you’ve both agreed.'],
    ['How do I download my certificate?', 'Open <b>My Progress → My Certificates</b>, click <b>Open &amp; download</b>, then <b>Download PDF / Print</b> and choose <b>Save as PDF</b>.'],
    ['I’m under 13. Can I sign up myself?', 'No. A parent or guardian needs to sign up first and add you. They’ll send you a special invite link to finish joining.']
  ] },
  parents: { ic: '👪', name: 'Parents', qs: [
    ['How do I add my child?', 'You can add children when you sign up, or later from <b>My children → Enrol another child</b>. If your child doesn’t have an account yet, copy their <b>invite link</b> and send it to them: their details are filled in and they’re linked to you automatically.'],
    ['What is a joined family account?', 'With a joined family account, your children are linked to you straight away, without them needing to accept a request. You can see their courses, progress, certificates, rewards, attendance and chats.'],
    ['How do I see my child’s progress?', 'Open <b>My children</b> and click your child. You’ll see their courses, activities, certificates, rewards, attendance, friends and study groups.'],
    ['How do I enrol my child in a class?', 'On the home page, choose a subject under <b>Think Paths</b>, then the curriculum and grade, and click <b>Enrol my child</b>. If there’s no class yet, join the waiting list and we’ll tell you when one opens.'],
    ['What is Beyond the School Run?', 'It’s our Parent Hub: workshops, talks and classes for parents themselves (wellbeing, cooking, money, careers and more), plus the private <b>Parent Café</b>. Click <b>Request to join</b>; the Think Nest team approves new members.'],
    ['Will I be told if my child is absent?', 'Yes. If a teacher marks your child absent or late, you get a 🔔 notification.'],
    ['I’m also a teacher. Do I need two accounts?', 'No. Open <b>Account Settings</b> and click <b>Apply to teach</b>. Once approved, you’ll have both the teacher and parent areas in one account.']
  ] },
  teachers: { ic: '👩‍🏫', name: 'Teachers', qs: [
    ['How do I create a course?', 'Open <b>Teaching → My Courses → New course</b>. Choose who it’s for, then the subject, curriculum and grade: the name is suggested for you. For teacher or parent workshops, choose a hub topic instead.'],
    ['How do I add lessons and activities?', 'Open your course, add a lesson, then click <b>+ Add to this lesson</b>. Choose from 10 tools: uploads, forms, quizzes, worksheets, videos, writing tasks, flashcards, activities, interactive links and exit tickets. Many can be created with AI from a learning objective.'],
    ['How do I mark work?', 'Quizzes are marked automatically. For other work, open the activity in your course to see what students handed in, add a score and a comment. Students are notified.'],
    ['How do I take attendance?', 'Use <b>My Classes → Attendance</b>, the Attendance box on your dashboard, or the 📋 Attendance tab in a course. Mark each student Present, Late, Absent or Excused, then click <b>Save register</b>. Parents are told if their child is absent or late.'],
    ['How do I create a class?', 'Open <b>My Classes → + Create a class</b> and choose a course: all its students are added. Each class has a feed, resources, group chat and leaderboard.'],
    ['How do I award a certificate?', 'Click <b>🏅 Certificates</b> in the sidebar. Choose a type, a course or class, tick the students, add a reason, check the preview and click <b>Award</b>. Students and parents are notified.'],
    ['What is Beyond the Bell?', 'Our Teacher Hub: workshops and meetups for teachers’ own growth and wellbeing, the <b>Teacher Café</b>, and <b>Coffee &amp; Connections</b> (Learning Partners, group meetups and a colleague directory). Request to join from the hub page.'],
    ['I’m also a parent. Do I need two accounts?', 'No. In <b>Account Settings</b>, tick <b>I’m also a parent</b>. A 👪 Parent section appears in your sidebar, and a switch lets you move between teacher and parent views.']
  ] },
  account: { ic: '🔐', name: 'Account & safety', qs: [
    ['Why is my account waiting for approval?', 'Every new account is checked by the Think Nest team to keep our community safe. This usually takes less than one working day, and you’ll get an email when you’re approved.'],
    ['I forgot my password.', 'Click <b>Forgot password?</b> on the log in page and type your email. We’ll email you a link to choose a new password (check your spam folder too).'],
    ['What is the “Verify you are human” box?', 'It stops robots creating fake accounts. Wait for it to show a ✅ tick before clicking the button. If it doesn’t appear, refresh the page.'],
    ['How do I report something?', 'Click <b>Report</b> on any post or message. The Think Nest team will look at it. You can also block someone from <b>My Friends</b>.'],
    ['How do I stop the emails?', 'Open <b>Account Settings</b> and switch off <b>Send me email updates</b>. You’ll still see notifications on the 🔔 bell.'],
    ['How do I delete my account?', 'Open <b>Account Settings</b>, scroll to <b>Delete an account</b> and click <b>Request account deletion</b>. Parents can also ask us to delete their child’s account. See our <a href="privacy.html">Privacy notice</a>.'],
    ['The website looks old or isn’t updating.', 'Your browser may be showing a saved copy. Hold <b>⌥ Option + ⌘ Command</b> and press <b>R</b> (Mac), or <b>Ctrl + F5</b> (Windows).']
  ] }
};
function startHelp() {
  const qs = new URLSearchParams(location.search);
  let tab = HELP[qs.get('for')] ? qs.get('for') : 'students';
  const $ = id => document.getElementById(id);
  $('help-tabs').innerHTML = Object.entries(HELP).map(([k, v]) => `<button role="tab" data-ht="${k}" aria-selected="${k === tab}"><span>${v.ic}</span>${v.name}</button>`).join('');
  const all = () => Object.entries(HELP).flatMap(([k, v]) => v.qs.map(q => ({ k, q })));
  function draw() {
    const term = $('help-search').value.trim().toLowerCase();
    document.querySelectorAll('[data-ht]').forEach(b => b.setAttribute('aria-selected', String(!term && b.dataset.ht === tab)));
    const list = term ? all().filter(x => (x.q[0] + ' ' + x.q[1]).toLowerCase().includes(term)) : HELP[tab].qs.map(q => ({ k: tab, q }));
    $('help-list').innerHTML = list.length ? list.map(({ k, q }) => `<details class="help-q"><summary>${term ? `<span class="help-tag">${HELP[k].ic} ${HELP[k].name}</span>` : ''}${q[0]}</summary><div>${q[1]}</div></details>`).join('')
      : `<p class="empty">No answers found for “${term.replace(/[<>&]/g, '')}”. Try different words, or contact us below.</p>`;
  }
  $('help-tabs').addEventListener('click', e => { const b = e.target.closest('[data-ht]'); if (!b) return; tab = b.dataset.ht; $('help-search').value = ''; draw(); });
  $('help-search').addEventListener('input', draw);
  $('tour-again').addEventListener('click', async () => {
    try { Object.keys(localStorage).filter(k => k.startsWith('tn_tour_')).forEach(k => localStorage.removeItem(k)); } catch (_) {}
    const { data: { session } } = await db.auth.getSession();
    if (!session) { location.href = 'start.html'; return; }
    location.href = (await homeFor(session.user.id)) + '?tour=1';
  });
  draw();
}
