// ===== Think Nest spam protection: Cloudflare Turnstile ("Verify you are human") =====
const TURNSTILE_SITE_KEY = '0x4AAAAAAF1tBEPWLF09NBw5';
let tnCaptchaToken = null;
const tnWidgets = [];
window.tnCaptchaReady = function () {
  document.querySelectorAll('[data-captcha]').forEach(el => {
    if (el.dataset.done) return; el.dataset.done = '1';
    try {
      tnWidgets.push(turnstile.render(el, {
        sitekey: TURNSTILE_SITE_KEY, theme: 'light', size: 'flexible',
        callback: t => { tnCaptchaToken = t; const h = el.parentNode && el.parentNode.querySelector('.tn-cap-help'); if (h) h.remove(); },
        'expired-callback': () => { tnCaptchaToken = null; },
        'error-callback': () => { tnCaptchaToken = null; }
      }));
      // still verifying after a while? a gentle hint (Private windows and strict tracking protection can stop the check)
      setTimeout(() => { if (!tnCaptchaToken && !el.parentNode.querySelector('.tn-cap-help')) el.insertAdjacentHTML('afterend', '<p class="tn-cap-help">⏳ Taking a while? If you’re using a <b>Private window</b>, please try a normal window or another browser.</p>'); }, 12000);
    } catch (_) {}
  });
};
function captchaToken() { return tnCaptchaToken || undefined; }
function captchaMissing() { return !!document.querySelector('[data-captcha]') && typeof turnstile !== 'undefined' && !tnCaptchaToken; }
// tokens can only be used once, so get a fresh one after every try
function captchaReset() { tnCaptchaToken = null; tnWidgets.forEach(id => { try { turnstile.reset(id); } catch (_) {} }); }
const CAPTCHA_MSG = 'Please wait for the “Verify you are human” box to show a tick, then try again.';
(function () {
  if (!document.querySelector('[data-captcha]') && document.readyState !== 'loading') return;
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=tnCaptchaReady&render=explicit';
  s.async = true; s.defer = true;
  document.head.appendChild(s);
})();
