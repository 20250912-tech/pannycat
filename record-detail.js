// 기록 자세히보기 (Figma 1:3587 접힘 · 1:5828 펼침)
// 타임라인 항목의 아래 화살표(열기)를 누르면 세부 내용·불안도 변화를 펼침
(function () {
  var S = RecordStore;
  var $ = function (id) { return document.getElementById(id); };
  var today = S.startOfDay(new Date());
  var date = S.parseKey(new URLSearchParams(location.search).get('date')) || today;
  var editing = false;

  function renderHead() {
    $('rd-title').textContent = (date.getMonth() + 1) + '월 ' + date.getDate() + '일 (' + S.weekday(date) + ')';
    $('back-btn').href = 'record.html?date=' + S.key(date);
    document.title = '패니 · ' + $('rd-title').textContent + ' 기록';
  }

  function renderWeek() {
    var wrap = $('rd-week');
    wrap.textContent = '';
    var sun = S.addDays(date, -date.getDay());
    for (var i = 0; i < 7; i++) {
      var d = S.addDays(sun, i);
      var on = S.sameDay(d, date);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'rd-week__day' + (on ? ' is-selected' : '') + (S.onDay(d).length ? ' has-records' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(on));
      b.setAttribute('aria-label', (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + S.weekday(d) + '요일');
      b.dataset.key = S.key(d);
      b.innerHTML = '<span class="rd-week__dow">' + S.weekday(d) + '</span><span class="rd-week__num">' + d.getDate() + '</span>';
      wrap.appendChild(b);
    }
  }

  function renderSummary(list) {
    var s = S.summary(list);
    $('sum-count').textContent = s.count + '회';
    $('sum-anx').textContent = s.lastAnxiety == null ? '-' : s.lastAnxiety;
    $('sum-emo').textContent = s.emotion ? s.emotion.label : '-';
  }

  function body(e) {
    var html = '';
    if (e.type === 'diary') {
      var emo = S.emotion(e.emo);
      if (emo) html += '<div class="rd-item__chips"><span class="rd-chip">' + emo.label + '</span></div>';
      html += '<p class="rd-item__text">' + S.escape(e.text) + '</p>';
      return html;
    }
    if (e.type === 'affirmation') {
      // 진행한 확언 전부를 번호 목록으로 (Figma 2007:19691) — 예전 기록은 text 한 문장만 있음
      var texts = Array.isArray(e.texts) && e.texts.length ? e.texts : [e.text || '오늘의 확언'];
      html += '<ol class="rd-item__affirms">' + texts.map(function (t) {
        return '<li>' + S.escape(String(t).replace(/\n/g, ' ')) + '</li>';
      }).join('') + '</ol>';
    } else {
      html += '<p class="rd-item__text">' + S.escape(S.detailText(e)) + '</p>';
    }
    var anx = S.anxietyText(e);
    if (anx) html += '<p class="rd-item__result"><span>불안도</span><strong>' + anx + '</strong></p>';
    return html;
  }

  function renderTimeline(list) {
    var ol = $('tl-list');
    ol.textContent = '';
    $('rd-add').hidden = list.length > 0;
    ol.hidden = list.length === 0;
    list.forEach(function (e, idx) {
      var t = S.TYPES[e.type];
      var id = 'tl-body-' + idx;
      var li = document.createElement('li');
      li.className = 'rd-item';
      li.id = 'e' + e.at;
      li.innerHTML =
        '<div class="rd-item__head">' +
          '<span class="rd-item__icon" style="background:' + t.color + '"><img src="' + t.icon + '" alt="" /></span>' +
          '<strong class="rd-item__name">' + t.label + '</strong>' +
          '<span class="rd-item__time">' + S.formatTime(e.at) + '</span>' +
          '<button class="rd-item__toggle" type="button" aria-expanded="false" aria-controls="' + id + '" aria-label="' + t.label + ' 기록 열기">' +
            '<img src="assets/record/chevron-down.svg" width="28" height="28" alt="" />' +
          '</button>' +
        '</div>' +
        '<div class="rd-item__body" id="' + id + '" hidden>' + body(e) + '</div>';
      ol.appendChild(li);
    });
  }

  function render() {
    var list = S.onDay(date);
    renderHead();
    renderWeek();
    renderSummary(list);
    renderTimeline(list);
  }

  // 펼침/접힘
  $('tl-list').addEventListener('click', function (ev) {
    var btn = ev.target.closest('.rd-item__toggle');
    if (!btn) return;
    var open = btn.getAttribute('aria-expanded') !== 'true';
    var item = btn.closest('.rd-item');
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', item.querySelector('.rd-item__name').textContent + ' 기록 ' + (open ? '닫기' : '열기'));
    item.classList.toggle('is-open', open);
    document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
  });

  // 편집: 모든 항목을 한 번에 펼쳐 보기 ↔ 접기
  $('edit-btn').addEventListener('click', function () {
    editing = !editing;
    this.setAttribute('aria-pressed', String(editing));
    this.textContent = editing ? '완료' : '편집';
    document.querySelectorAll('.rd-item__toggle').forEach(function (b) {
      if ((b.getAttribute('aria-expanded') === 'true') !== editing) b.click();
    });
  });

  $('rd-week').addEventListener('click', function (ev) {
    var b = ev.target.closest('.rd-week__day');
    if (!b) return;
    date = S.parseKey(b.dataset.key);
    editing = false;
    $('edit-btn').setAttribute('aria-pressed', 'false');
    $('edit-btn').textContent = '편집';
    history.replaceState(null, '', '?date=' + b.dataset.key);
    render();
  });

  render();

  // 캘린더 카드에서 특정 기록을 눌러 들어오면 그 항목을 펼쳐서 보여줌
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) {
      target.querySelector('.rd-item__toggle').click();
      target.scrollIntoView({ block: 'center' });
    }
  }
})();
