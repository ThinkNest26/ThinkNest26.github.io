// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-menu');
toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

// Figma sometimes adds "@2x" to exported file names: try that name, then hide the image if neither exists
document.querySelectorAll('img').forEach(img => {
  img.addEventListener('error', () => {
    if (!img.dataset.tried) {
      img.dataset.tried = '1';
      img.src = img.getAttribute('src').replace('.png', '@2x.png');
    } else {
      img.classList.add('missing');
    }
  });
});

document.getElementById('year').textContent = new Date().getFullYear();
