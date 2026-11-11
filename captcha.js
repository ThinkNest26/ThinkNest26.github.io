// Think Nest: "Verify you are human" box switched off (CAPTCHA is off in Supabase)
function captchaToken() { return undefined; }
function captchaMissing() { return false; }
function captchaReset() {}
const CAPTCHA_MSG = '';
window.tnCaptchaReady = function () {};
const tnHide = document.createElement('style');
tnHide.textContent = '[data-captcha], .tn-cap-help { display: none !important; }';
document.head.appendChild(tnHide);
