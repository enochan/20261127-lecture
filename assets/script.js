(function () {
  'use strict';

  var live = document.getElementById('live');
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function announce(message) {
    if (live) {
      live.textContent = '';
      window.setTimeout(function () { live.textContent = message; }, 30);
    }
    if (toast) {
      toast.textContent = message;
      toast.classList.add('is-on');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () { toast.classList.remove('is-on'); }, 2400);
    }
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  // クリックと同時に実行できる方法を先に試し、だめなら Clipboard API を使う
  function copyText(text) {
    if (fallbackCopy(text)) { return Promise.resolve(true); }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return false; }
      );
    }
    return Promise.resolve(false);
  }

  function selectElementText(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function collectText(ids) {
    var parts = [];
    ids.split(/\s+/).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { parts.push(el.textContent.replace(/^\s+|\s+$/g, '')); }
    });
    return parts.join('\n\n');
  }

  function resetButton(btn) {
    btn.textContent = btn.getAttribute('data-label') || 'コピーする';
    btn.classList.remove('is-copied', 'is-failed');
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-copy]');
    if (!btn) { return; }
    var ids = btn.getAttribute('data-copy');
    var text = collectText(ids);
    if (!text) { return; }
    if (!btn.getAttribute('data-label')) { btn.setAttribute('data-label', btn.textContent.trim()); }
    copyText(text).then(function (ok) {
      window.clearTimeout(btn._timer);
      if (ok) {
        btn.textContent = 'コピーしました';
        btn.classList.remove('is-failed');
        btn.classList.add('is-copied');
        announce('コピーしました。AIの入力欄に貼り付けてください。');
      } else {
        btn.textContent = 'コピーできませんでした';
        btn.classList.remove('is-copied');
        btn.classList.add('is-failed');
        var first = document.getElementById(ids.split(/\s+/)[0]);
        if (first) { selectElementText(first); }
        announce('コピーできませんでした。選んだ文を Ctrl と C で、手でコピーしてください。');
      }
      btn._timer = window.setTimeout(function () { resetButton(btn); }, 3000);
    });
  });

  // ステップのナビ：いま見ているステップを強調する
  var nav = document.querySelector('.stepnav ol');
  var pills = document.querySelectorAll('.stepnav a');
  if (nav && pills.length && 'IntersectionObserver' in window) {
    var map = {};
    Array.prototype.forEach.call(pills, function (a) {
      map[a.getAttribute('href').slice(1)] = a;
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var a = map[entry.target.id];
        if (!a) { return; }
        Array.prototype.forEach.call(pills, function (p) { p.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'step');
        nav.scrollLeft = a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2;
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    Object.keys(map).forEach(function (id) {
      var target = document.getElementById(id);
      if (target) { observer.observe(target); }
    });
  }
})();
