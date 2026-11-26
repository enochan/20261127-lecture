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

  // 読み上げの名前は「見た目の文字（コピーしました等）＋元の説明」にして、見た目と一致させる
  function setButtonName(btn, prefix) {
    var base = btn.getAttribute('data-aria') || '';
    btn.setAttribute('aria-label', prefix + base);
  }

  function resetButton(btn) {
    btn.textContent = btn.getAttribute('data-label') || 'コピーする';
    btn.classList.remove('is-copied', 'is-failed');
    var base = btn.getAttribute('data-aria') || '';
    if (base) { btn.setAttribute('aria-label', base); } else { btn.removeAttribute('aria-label'); }
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-copy]');
    if (!btn) { return; }
    var ids = btn.getAttribute('data-copy');
    var text = collectText(ids);
    if (!text) { return; }
    if (!btn.getAttribute('data-label')) { btn.setAttribute('data-label', btn.textContent.trim()); }
    if (!btn.hasAttribute('data-aria')) { btn.setAttribute('data-aria', btn.getAttribute('aria-label') || ''); }
    copyText(text).then(function (ok) {
      window.clearTimeout(btn._timer);
      if (ok) {
        btn.textContent = 'コピーしました';
        btn.classList.remove('is-failed');
        btn.classList.add('is-copied');
        setButtonName(btn, 'コピーしました。');
        announce('コピーしました。AIの入力欄に貼り付けてください。');
        // ステップ表示のとき、コピー後はそのステップの見出しに移す（Enter で次へ進めるように）
        if (document.documentElement.classList.contains('js-steps')) {
          var section = btn.closest('.step, .done-panel');
          var heading = section && section.querySelector('h2');
          if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
          }
          document.dispatchEvent(new Event('stepcopied'));
        }
      } else {
        btn.textContent = 'コピーできませんでした';
        btn.classList.remove('is-copied');
        btn.classList.add('is-failed');
        setButtonName(btn, 'コピーできませんでした。');
        var first = document.getElementById(ids.split(/\s+/)[0]);
        if (first) { selectElementText(first); }
        announce('コピーできませんでした。選んだ文を Ctrl と C で、手でコピーしてください。');
      }
      btn._timer = window.setTimeout(function () { resetButton(btn); }, 3000);
    });
  });

  // ステップを1つずつ表示する。画面全体はスクロールさせず、本文の欄の中だけを動かす。
  // JavaScript が使えないときは、全部を縦に並べたままにする。
  var steps = Array.prototype.slice.call(document.querySelectorAll('.steps > .step'));
  var doneEl = document.getElementById('done');
  var panels = steps.slice();
  if (doneEl) { panels.push(doneEl); }
  var numbered = steps.filter(function (p) { return !p.classList.contains('step--intro'); });

  if (numbered.length > 1) {
    document.documentElement.classList.add('js-steps');

    var main = document.getElementById('main');
    var stepnav = document.querySelector('.stepnav');
    var navList = document.querySelector('.stepnav ol');
    var pills = Array.prototype.slice.call(document.querySelectorAll('.stepnav ol a'));
    var label = document.querySelector('.stepnav .label');
    var firstNumbered = panels.indexOf(numbered[0]);
    var lastNumbered = panels.indexOf(numbered[numbered.length - 1]);
    var stepCount = numbered.length;

    var track = document.createElement('div');
    track.className = 'progress';
    track.setAttribute('aria-hidden', 'true');
    var bar = document.createElement('span');
    track.appendChild(bar);
    if (stepnav) { stepnav.appendChild(track); }

    // 画面の下に置く「前へ」「次へ」のバー。どのステップでも押せる位置にある
    var stepbar = document.createElement('nav');
    stepbar.className = 'stepbar';
    stepbar.setAttribute('aria-label', '前のステップと次のステップ');
    var inner = document.createElement('div');
    inner.className = 'wrap';
    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'btn btn--ghost btn--back';
    backBtn.setAttribute('aria-keyshortcuts', 'ArrowLeft');
    var backKey = document.createElement('kbd');
    backKey.className = 'key';
    backKey.setAttribute('aria-hidden', 'true');
    backKey.textContent = '←';
    var backLbl = document.createElement('span');
    backLbl.textContent = '前のステップ';
    backBtn.appendChild(backKey);
    backBtn.appendChild(backLbl);
    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn--go';
    nextBtn.setAttribute('aria-keyshortcuts', 'ArrowRight');
    var nextLbl = document.createElement('span');
    var nextKey = document.createElement('kbd');
    nextKey.className = 'key';
    nextKey.setAttribute('aria-hidden', 'true');
    nextKey.textContent = '→';
    nextBtn.appendChild(nextLbl);
    nextBtn.appendChild(nextKey);
    inner.appendChild(backBtn);
    inner.appendChild(nextBtn);
    stepbar.appendChild(inner);
    if (main) { main.insertAdjacentElement('afterend', stepbar); } else { document.body.appendChild(stepbar); }

    function indexFromId(id) {
      if (id === 'more') { id = 'done'; }
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].id === id) { return i; }
      }
      return -1;
    }

    function indexFromHash() {
      var k = indexFromId(decodeURIComponent(location.hash.replace(/^#/, '')));
      return k < 0 ? 0 : k;
    }

    function labelOf(i) {
      if (panels[i] === doneEl) { return '完了'; }
      if (i < firstNumbered) { return 'はじめ'; }
      return (i - firstNumbered + 1) + ' / ' + stepCount;
    }

    function nextLabelOf(i) {
      if (i === lastNumbered) { return '完了へ'; }
      if (i < firstNumbered) { return 'はじめる'; }
      return '次のステップへ';
    }

    var current = -1;

    // 画面が変わるたびに、そのステップで押す順に、枠線を動かして示す。
    // 順番は、ステップの種類で決める。段階が終わると、枠線は次の段階に移る。
    //   はじめ（ワーク1）: Gemini のリンクを押す → 「はじめる」
    //   はじめ（ワーク2）: 「はじめる」
    //   ダウンロードのステップ: ダウンロードのボタンを押す → 次へ
    //   貼るステップ: コピーのボタンを押して成功する（複数あれば全部を示す）→ 次へ
    //   確かめるステップ: 次へ（確認ポイントはボタンではないので光らせない）
    //   完了: 次の案内のボタン、なければ「時間が余った人へ」の欄
    var spotEls = [];
    var flow = [];
    var flowAt = 0;

    function visible(el) { return !!el && !el.hidden && el.getClientRects().length > 0; }

    // 折りたたみの中にあるものは、順番に入れない（開いていない間は見えないため）
    function pick(panel, selector) {
      return Array.prototype.slice.call(panel.querySelectorAll(selector)).filter(function (e) {
        return visible(e) && !e.closest('details');
      });
    }

    function setSpots(els) {
      spotEls.forEach(function (e) { e.classList.remove('is-spotlight'); });
      spotEls = els.filter(visible);
      void document.body.offsetWidth; // アニメーションを最初から動かし直す
      spotEls.forEach(function (e) { e.classList.add('is-spotlight'); });
    }

    function showStage() {
      var stage = flow[flowAt];
      setSpots(stage ? stage.els : []);
    }

    function advance() {
      if (flowAt < flow.length) { flowAt++; }
      showStage();
    }

    function startFlow(panel, isDone) {
      var stages = [];
      var intro = panel.classList.contains('step--intro');
      var links = pick(panel, '.btn-row .btn');
      var downloads = pick(panel, 'a[download]');
      var copies = pick(panel, '[data-copy]');

      if (intro) {
        if (links.length) { stages.push({ els: links, on: 'click' }); }
      } else if (isDone) {
        if (links.length) {
          stages.push({ els: links, on: 'click' });
        } else {
          var more = panel.querySelector('.help summary');
          if (visible(more)) { stages.push({ els: [more], on: 'click' }); }
        }
      } else if (downloads.length) {
        stages.push({ els: downloads, on: 'click' });
      } else if (copies.length) {
        stages.push({ els: copies, on: 'copy' });
      }
      if (!isDone && !nextBtn.hidden) { stages.push({ els: [nextBtn], on: 'end' }); }

      flow = stages;
      flowAt = 0;
      showStage();
    }

    // 順番の途中にあるものを押したら、次の段階に移る
    document.addEventListener('click', function (event) {
      var stage = flow[flowAt];
      if (!stage || stage.on !== 'click') { return; }
      for (var k = 0; k < stage.els.length; k++) {
        if (stage.els[k].contains(event.target)) { advance(); return; }
      }
    });
    // コピーに成功したら、次の段階に移る（成功の合図は、上のコピーの処理から届く）
    document.addEventListener('stepcopied', function () {
      var stage = flow[flowAt];
      if (stage && stage.on === 'copy') { advance(); }
    });

    function show(i, userMove) {
      current = i;
      panels.forEach(function (p, k) { p.classList.toggle('is-current', k === i); });
      pills.forEach(function (a) {
        var k = indexFromId(a.getAttribute('href').slice(1));
        a.classList.toggle('is-visited', k > -1 && k < i);
        if (k === i) { a.setAttribute('aria-current', 'step'); } else { a.removeAttribute('aria-current'); }
        if (k === i && navList) { navList.scrollLeft = a.offsetLeft - navList.clientWidth / 2 + a.clientWidth / 2; }
      });

      var onDone = (panels[i] === doneEl);
      var width = 0;
      if (onDone) { width = 100; } else if (i >= firstNumbered) { width = ((i - firstNumbered + 1) / stepCount) * 100; }
      bar.style.width = width + '%';
      if (label) { label.textContent = labelOf(i); }

      backBtn.hidden = (i === 0);
      nextBtn.hidden = (i >= panels.length - 1);
      nextLbl.textContent = nextLabelOf(i);

      if (main) { main.scrollTop = 0; }

      startFlow(panels[i], onDone);

      var heading = panels[i].querySelector('h1, h2');
      if (userMove) {
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
        if (live) {
          live.textContent = '';
          window.setTimeout(function () {
            live.textContent = onDone ? '最後まで終わりました。' : (labelOf(i) === 'はじめ' ? 'はじめのページです。' : 'ステップ ' + labelOf(i) + ' です。');
          }, 30);
        }
      }
    }

    backBtn.addEventListener('click', function () {
      if (current > 0) { location.hash = panels[current - 1].id; }
    });
    nextBtn.addEventListener('click', function () {
      if (current < panels.length - 1) { location.hash = panels[current + 1].id; }
    });

    window.addEventListener('hashchange', function () {
      var i = indexFromHash();
      if (i !== current) { show(i, true); }
    });

    show(indexFromHash(), false);

    // ←→ ↑↓ PageUp PageDown で前後に動く。Enter は次へ進む。
    // リンク・ボタン・折りたたみ（summary）・入力欄の上では、それぞれ本来の動きに任せる。
    document.addEventListener('keydown', function (event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) { return; }
      var t = event.target;
      var tag = t && t.tagName ? t.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'select' || tag === 'textarea' || (t && t.isContentEditable)) { return; }

      var move = 0;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') { move = 1; }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') { move = -1; }
      else if (event.key === 'Enter') {
        if (t && t.closest && t.closest('a, button, summary, label')) { return; }
        move = 1;
      }
      if (!move) { return; }

      var target = current + move;
      if (target < 0 || target > panels.length - 1) { return; }
      event.preventDefault();
      location.hash = panels[target].id;
    });
  }
})();
