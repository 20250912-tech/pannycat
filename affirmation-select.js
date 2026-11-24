// 확언 문장 선택 (Figma 92:5524 추천 / 92:5473 주제)
// 책갈피 → 저장한 문장에 기록, 문장 교체 → 다른 문장으로, 진행할 문장 수 → 좌우 스크롤로 설정
(function () {
  var S = AffirmationStore;
  var $ = function (id) { return document.getElementById(id); };

  var mode = new URLSearchParams(location.search).get('mode') === 'topic' ? 'topic' : 'recommend';
  var topics = mode === 'topic' ? S.getTopics() : S.RECOMMEND.topics;
  if (mode === 'topic' && !topics.length) { location.replace('affirmation-topic.html'); return; }

  // ---------- 인사이트 ----------
  if (mode === 'topic') {
    document.querySelector('.aff--pick').dataset.nodeId = '92:5473';
    $('insight-title').textContent = '선택한 주제';
    $('insight-body').textContent = topics.join(' · ');
    $('back-link').href = 'affirmation-topic.html';
  } else {
    $('insight-title').textContent = '최근 마음 기록';
    $('insight-body').textContent = S.RECOMMEND.insight;
  }

  // ---------- 문장 목록 ----------
  var pool = S.pool(topics);          // 고른 주제 문장 먼저, 이어서 나머지 주제
  var cursor = 0;                     // pool 에서 다음에 꺼낼 위치
  var sentences = [];
  var index = 0;
  var count = S.getCount();

  function draw() {
    // 지금 목록에 없는 문장을 꺼냄 (다 쓰면 처음부터 다시)
    for (var tries = 0; tries < pool.length; tries++) {
      var s = pool[cursor % pool.length];
      cursor++;
      if (sentences.indexOf(s) === -1) return s;
    }
    return pool[cursor++ % pool.length];
  }

  function fill() {
    while (sentences.length < count) sentences.push(draw());
    sentences.length = count;
    if (index > count - 1) index = count - 1;
  }

  var textEl = $('card-text');
  var bookmark = $('bookmark-btn');

  function render() {
    var s = sentences[index];
    textEl.textContent = s;
    $('step-now').textContent = index + 1;
    $('step-total').textContent = count;
    $('prev-btn').disabled = index === 0;
    $('next-btn').disabled = index === count - 1;
    var saved = S.isSaved(s);
    bookmark.setAttribute('aria-pressed', String(saved));
    bookmark.setAttribute('aria-label', saved ? '저장 취소하기' : '이 문장 저장하기');
  }

  function swapText(fn) {
    textEl.classList.add('is-swapping');
    setTimeout(function () { fn(); textEl.classList.remove('is-swapping'); }, 140);
  }

  // ---------- 토스트 ----------
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1600);
  }

  // ---------- 동작 ----------
  bookmark.addEventListener('click', function () {
    var on = S.toggleSaved(sentences[index]);
    render();
    toast(on ? '저장한 문장에 추가했어요' : '저장한 문장에서 뺐어요');
  });

  $('shuffle-btn').addEventListener('click', function () {
    swapText(function () {
      sentences[index] = draw();
      render();
    });
  });

  $('prev-btn').addEventListener('click', function () {
    if (index > 0) swapText(function () { index--; render(); });
  });
  $('next-btn').addEventListener('click', function () {
    if (index < count - 1) swapText(function () { index++; render(); });
  });

  // 카드 좌우 스와이프로도 넘기기
  (function () {
    var box = document.querySelector('.aff-card__box');
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) < 40) return;
      $(dx < 0 ? 'next-btn' : 'prev-btn').click();
    });
  })();

  $('start-btn').addEventListener('click', function () {
    // 지금 보고 있는 문장부터 시작하도록 순서를 돌려서 넘김
    var ordered = sentences.slice(index).concat(sentences.slice(0, index));
    S.setSession({ mode: mode, topics: topics, sentences: ordered });
    location.href = 'affirmation-session.html';
  });

  // ---------- 진행할 문장 수: 좌우 스크롤 피커 ----------
  var scroller = $('count-scroller');
  var items = [];
  for (var n = S.COUNT_MIN; n <= S.COUNT_MAX; n++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'aff-count__item';
    b.setAttribute('role', 'radio');
    b.dataset.value = n;
    b.setAttribute('aria-label', n + '개');
    b.textContent = n;
    scroller.appendChild(b);
    items.push(b);
  }

  function setCount(n, opts) {
    n = Math.max(S.COUNT_MIN, Math.min(S.COUNT_MAX, n));
    items.forEach(function (it) {
      var on = +it.dataset.value === n;
      it.classList.toggle('is-selected', on);
      it.setAttribute('aria-checked', String(on));
      it.tabIndex = on ? 0 : -1;
      it.textContent = on ? n + '번' : it.dataset.value;
    });
    if (n !== count) {
      count = n;
      S.setCount(n);
      fill();
      render();
    }
    if (opts && opts.scroll) center(items[n - S.COUNT_MIN], opts.smooth);
  }

  function center(el, smooth) {
    var left = el.offsetLeft + el.offsetWidth / 2 - scroller.clientWidth / 2;
    scroller.scrollTo({ left: left, behavior: smooth ? 'smooth' : 'auto' });
  }

  // 스크롤 중 가운데에 가장 가까운 숫자를 선택
  function nearest() {
    var mid = scroller.scrollLeft + scroller.clientWidth / 2;
    var best = items[0], dist = Infinity;
    items.forEach(function (it) {
      var d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - mid);
      if (d < dist) { dist = d; best = it; }
    });
    return +best.dataset.value;
  }

  var raf = 0;
  scroller.addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; setCount(nearest()); });
  }, { passive: true });

  scroller.addEventListener('click', function (e) {
    var it = e.target.closest('.aff-count__item');
    if (it && !dragMoved) setCount(+it.dataset.value, { scroll: true, smooth: true });
  });

  scroller.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    setCount(count + d, { scroll: true, smooth: true });
    items[count - S.COUNT_MIN].focus({ preventScroll: true });
  });

  // 마우스: 끌어서 스크롤, 휠을 가로 스크롤로
  var dragX = null, dragStart = 0, dragMoved = false;
  scroller.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    dragX = e.clientX; dragStart = scroller.scrollLeft; dragMoved = false;
    scroller.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (dragX === null) return;
    var dx = e.clientX - dragX;
    if (Math.abs(dx) > 3) dragMoved = true;
    scroller.scrollLeft = dragStart - dx;
  });
  window.addEventListener('pointerup', function () {
    if (dragX === null) return;
    dragX = null;
    scroller.classList.remove('is-dragging');
    setCount(nearest(), { scroll: true, smooth: true });
    setTimeout(function () { dragMoved = false; }, 0);
  });
  scroller.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    scroller.scrollLeft += e.deltaY;
  }, { passive: false });

  // ---------- 시작 ----------
  fill();
  render();
  setCount(count, { scroll: true });
  // 뒤로 가기(bfcache)로 돌아왔을 때 저장 상태 다시 반영
  window.addEventListener('pageshow', function (e) { if (e.persisted) render(); });
})();
