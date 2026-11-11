// ===== Exit button on help, contact and reference pages =====
// Opened in a new tab: "Close" closes the tab. Opened from inside Think Nest: Exit goes back to where you were.
(function () {
  const newTab = history.length <= 1;
  let fromSite = false;
  try { const r = new URL(document.referrer); fromSite = r.origin === location.origin && !/\/(index\.html)?$/.test(r.pathname); } catch (_) {}
  document.querySelectorAll('.app-exit').forEach(a => {
    if (newTab) {
      a.textContent = 'Close';
      a.addEventListener('click', e => { e.preventDefault(); window.close(); setTimeout(() => { location.href = a.getAttribute('href') || 'index.html'; }, 300); });
    } else if (fromSite) {
      a.addEventListener('click', e => { e.preventDefault(); history.back(); });
    }
  });
  if (newTab) document.querySelectorAll('[data-hide-in-tab]').forEach(x => { x.hidden = true; x.style.display = 'none'; });
})();
