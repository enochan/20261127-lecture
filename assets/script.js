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

  // ステップを1つずつ表示する（JavaScript が使えないときは、全部を縦に並べたままにする）
  var panels = Array.prototype.slice.call(document.querySelectorAll('.steps > .step'));
  var doneEl = document.getElementById('done');
  var stepCount = panels.length;
  if (doneEl) { panels.push(doneEl); }

  if (stepCount > 1) {
    document.documentElement.classList.add('js-steps');

    var stepnav = document.querySelector('.stepnav');
    var navList = document.querySelector('.stepnav ol');
    var pills = Array.prototype.slice.call(document.querySelectorAll('.stepnav ol a'));
    var label = document.querySelector('.stepnav .label');
    var bar = null;
    if (stepnav) {
      var track = document.createElement('div');
      track.className = 'progress';
      track.setAttribute('aria-hidden', 'true');
      bar = document.createElement('span');
      track.appendChild(bar);
      stepnav.appendChild(track);
    }

    function indexFromHash() {
      var h = decodeURIComponent(location.hash.replace(/^#/, ''));
      if (h === 'more') { h = 'done'; }
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].id === h) { return i; }
      }
      return 0;
    }

    function addButtons(panel, i) {
      var holder = panel.querySelector('.step-body') || panel;
      var row = document.createElement('div');
      row.className = 'step-nav';
      if (i > 0) {
        var back = document.createElement('button');
        back.type = 'button';
        back.className = 'btn btn--ghost btn--back';
        back.textContent = '前のステップ';
        back.addEventListener('click', function () { location.hash = panels[i - 1].id; });
        row.appendChild(back);
      }
      if (i < panels.length - 1) {
        var next = document.createElement('button');
        next.type = 'button';
        next.className = 'btn btn--go';
        next.textContent = (i === stepCount - 1) ? '完了へ' : '次のステップへ';
        next.addEventListener('click', function () { location.hash = panels[i + 1].id; });
        row.appendChild(next);
      }
      holder.appendChild(row);
    }
    panels.forEach(addButtons);

    var current = -1;
    function show(i, userMove) {
      current = i;
      panels.forEach(function (p, k) { p.classList.toggle('is-current', k === i); });
      pills.forEach(function (a) {
        var k = indexFromId(a.getAttribute('href').slice(1));
        a.classList.toggle('is-visited', k > -1 && k < i);
        if (k === i) { a.setAttribute('aria-current', 'step'); } else { a.removeAttribute('aria-current'); }
        if (k === i && navList) { navList.scrollLeft = a.offsetLeft - navList.clientWidth / 2 + a.clientWidth / 2; }
      });
      var onDone = (i >= stepCount);
      if (bar) { bar.style.width = (onDone ? 100 : ((i + 1) / stepCount) * 100) + '%'; }
      if (label) { label.textContent = onDone ? '完了' : (i + 1) + ' / ' + stepCount; }
      var heading = panels[i].querySelector('h2');
      if (userMove) {
        panels[i].scrollIntoView({ block: 'start' });
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
        if (live) {
          live.textContent = '';
          window.setTimeout(function () {
            live.textContent = onDone ? '最後まで終わりました。' : 'ステップ ' + (i + 1) + '、全部で ' + stepCount + ' です。';
          }, 30);
        }
      }
    }

    function indexFromId(id) {
      if (id === 'more') { id = 'done'; }
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].id === id) { return i; }
      }
      return -1;
    }

    window.addEventListener('hashchange', function () {
      var i = indexFromHash();
      if (i !== current) { show(i, true); }
    });

    show(indexFromHash(), false);
    if (location.hash && indexFromHash() > 0) {
      window.setTimeout(function () { panels[current].scrollIntoView({ block: 'start' }); }, 0);
    }
  }
})();