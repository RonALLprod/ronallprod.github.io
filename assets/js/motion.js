(() => {
  'use strict';
  if (!('MutationObserver' in window) || window.__reduce) return;
  const pop = el => {
    if (!el) return;
    let last = el.textContent;
    new MutationObserver(() => {
      if (el.textContent === last) return;
      last = el.textContent;
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  };
  pop(document.getElementById('count'));
  pop(document.getElementById('tot'));
})();
