// Small "coming soon" message for parts of the demo that aren't built yet
const toast = document.getElementById('toast');
let toastTimer;
function soon(what) {
  toast.textContent = what + ' is coming soon in the next version of the demo.';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
document.querySelectorAll('[data-soon]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); soon(el.dataset.soon); }));
document.querySelectorAll('[data-soon-input]').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') soon(el.dataset.soonInput); }));

// Images: try the "@2x" file name, then hide if missing
document.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
  if (!img.dataset.tried) { img.dataset.tried = '1'; img.src = img.getAttribute('src').replace('.png', '@2x.png'); }
  else img.classList.add('missing');
}));

// Choose your role
const picks = document.querySelectorAll('.pick');
const next = document.getElementById('next');
let chosen = null;
picks.forEach(p => p.addEventListener('click', () => {
  picks.forEach(x => x.setAttribute('aria-checked', 'false'));
  p.setAttribute('aria-checked', 'true');
  chosen = p;
  next.disabled = false;
}));
if (next) next.addEventListener('click', () => {
  if (!chosen) return;
  if (chosen.dataset.go) location.href = chosen.dataset.go;
  else soon(chosen.dataset.soon);
});

// Log in (demo: any email and password works)
const loginForm = document.getElementById('login-form');
if (loginForm) loginForm.addEventListener('submit', e => { e.preventDefault(); location.href = 'student-dashboard.html'; });
const eye = document.getElementById('pw-eye');
if (eye) eye.addEventListener('click', () => {
  const pw = document.getElementById('pw');
  pw.type = pw.type === 'password' ? 'text' : 'password';
  eye.setAttribute('aria-label', pw.type === 'password' ? 'Show password' : 'Hide password');
});

// Dashboard: carousel arrows and phone menu
document.querySelectorAll('.arrows').forEach(a => {
  const row = document.getElementById(a.dataset.target);
  const [prev, nxt] = a.querySelectorAll('button');
  prev.addEventListener('click', () => row.scrollBy({ left: -row.clientWidth * 0.8, behavior: 'smooth' }));
  nxt.addEventListener('click', () => row.scrollBy({ left: row.clientWidth * 0.8, behavior: 'smooth' }));
});
const side = document.getElementById('side'), shade = document.getElementById('side-shade'), st = document.getElementById('side-toggle');
if (st) {
  st.addEventListener('click', () => { side.classList.add('open'); shade.classList.add('show'); });
  shade.addEventListener('click', () => { side.classList.remove('open'); shade.classList.remove('show'); });
}
