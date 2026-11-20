(() => {
  'use strict';
  const c = document.getElementById('count');
  if (!c || !('MutationObserver' in window) || window.__reduce) return;
  let last = c.textContent;
  new MutationObserver(() => {
    if (c.textContent === last) return;
    last = c.textContent;
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
  }).observe(c, { childList: true, characterData: true, subtree: true });
})();
