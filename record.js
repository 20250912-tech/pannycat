// 기록 캘린더 (Figma 1:2041 기록X · 1:3406 기록O)
// 날짜 칸: 고양이 발바닥 — 활동 1개당 발가락 1개, 5개면 발바닥까지 · 색은 그날 일기 감정
(function () {
  var S = RecordStore;
  var $ = function (id) { return document.getElementById(id); };
  var today = S.startOfDay(new Date());

  // ?date=YYYY-MM-DD 로 들어오면 그 날을 선택
  var selected = S.parseKey(new URLSearchParams(location.search).get('date')) || today;
  var month = new Date(selected.getFullYear(), selected.getMonth(), 1);

  function renderCalendar() {
    $('cal-title').textContent = month.getFullYear() + '년 ' + (month.getMonth() + 1) + '월';
    var grid = $('cal-grid');
    grid.textContent = '';
    var first = month.getDay();
    var days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var cells = Math.ceil((first + days) / 7) * 7;
    var row;
    for (var i = 0; i < cells; i++) {
      if (i % 7 === 0) {
        row = document.createElement('div');
        row.className = 'record-cal__week';
        row.setAttribute('role', 'row');
        grid.appendChild(row);
      }
      var n = i - first + 1;
      if (n < 1 || n > days) {
        var blank = document.createElement('span');
        blank.className = 'record-cal__day is-blank';
        blank.setAttribute('role', 'gridcell');
        row.appendChild(blank);
        continue;
      }
      var d = new Date(month.getFullYear(), month.getMonth(), n);
      var count = S.onDay(d).length;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'record-cal__day';
      btn.setAttribute('role', 'gridcell');
      btn.dataset.key = S.key(d);
      if (d > today) btn.classList.add('is-future');
      if (S.sameDay(d, today)) btn.setAttribute('aria-current', 'date');
      var isSel = S.sameDay(d, selected);
      btn.classList.toggle('is-selected', isSel);
      btn.setAttribute('aria-selected', String(isSel));
      btn.setAttribute('aria-label', (d.getMonth() + 1) + '월 ' + n + '일 ' + S.weekday(d) + '요일, ' +
        (count ? '기록 ' + count + '개' : '기록 없음'));
      btn.innerHTML = S.pawFor(d) + '<span class="record-cal__num">' + n + '</span>';
      row.appendChild(btn);
    }
  }

  // ---------- 선택한 날 카드 ----------
  function card(type, entry, wide) {
    var t = S.TYPES[type];
    var el;
    if (!entry) {
      // 빈 카드: 점선 + 아이콘(+) — 누르면 해당 활동으로
      el = document.createElement('a');
      el.href = t.href;
      el.className = 'record-card is-empty' + (wide ? ' record-card--wide' : '');
      el.innerHTML =
        '<span class="record-card__top"><span class="record-card__plus"><img src="assets/record/plus.svg" width="8.19" height="8.48" alt="" /></span>' +
        (wide ? '<strong class="record-card__name">' + t.label + '</strong>' : '') + '</span>' +
        (wide ? '' : '<strong class="record-card__name">' + t.label + '</strong>') +
        '<span class="record-card__desc' + (wide ? ' record-card__quote' : '') + '">' + t.empty + '</span>';
      el.setAttribute('aria-label', t.label + ' 기록 없음 — ' + t.label + ' 하러 가기');
      return el;
    }
    // 기록이 있는 카드도 누르면 그 기능 진입 화면으로
    el = document.createElement('a');
    el.href = t.href;
    el.setAttribute('aria-label', t.label + ' ' + S.formatTime(entry.at) + ' 기록 — ' + t.label + ' 하러 가기');
    el.className = 'record-card' + (wide ? ' record-card--wide' : '');
    el.style.setProperty('--card', t.color);
    var anx = S.anxietyText(entry);
    var sub = entry.type === 'diary'
      ? (S.emotion(entry.emo) ? S.emotion(entry.emo).label : '')
      : (anx ? '불안도 ' + anx : '');
    var html =
      '<span class="record-card__top"><img class="record-card__icon" src="' + t.icon + '" alt="" />' +
      (wide ? '<strong class="record-card__name">' + t.label + '</strong>' : '') +
      '<span class="record-card__time">' + S.formatTime(entry.at) + '</span></span>';
    if (wide) {
      html += '<span class="record-card__desc">' + S.escape(sub) + '</span>';
      if (entry.text) html += '<span class="record-card__quote">“' + S.escape(entry.text) + '”</span>';
    } else {
      html += '<strong class="record-card__name">' + t.label + '</strong><span class="record-card__desc">' + S.escape(sub) + '</span>';
    }
    el.innerHTML = html;
    return el;
  }

  function renderDay() {
    var list = S.onDay(selected);
    var isToday = S.sameDay(selected, today);
    $('day-num').textContent = selected.getDate();
    $('day-dow').textContent = S.weekday(selected);
    $('day-badge').classList.toggle('has-records', list.length > 0);
    $('day-title').textContent = isToday ? '오늘의 기록' : (selected.getMonth() + 1) + '월 ' + selected.getDate() + '일 기록';
    $('day-more').href = 'record-detail.html?date=' + S.key(selected);

    // 종류별로 가장 최근 기록 한 개씩
    var latest = {};
    list.forEach(function (e) { latest[e.type] = e; });

    var wrap = $('day-cards');
    wrap.textContent = '';
    wrap.appendChild(card('affirmation', latest.affirmation, true));
    [['breathing', 'grounding'], ['bodyscan', 'diary']].forEach(function (pair) {
      var row = document.createElement('div');
      row.className = 'record-day__row';
      pair.forEach(function (type) { row.appendChild(card(type, latest[type], false)); });
      wrap.appendChild(row);
    });
  }

  function select(d) {
    selected = d;
    history.replaceState(null, '', '?date=' + S.key(d));
    renderCalendar();
    renderDay();
  }

  // 카드로 기능에 들어가면, 그 화면의 뒤로 가기가 지금 보던 기록 날짜로 돌아오도록 기억
  $('day-cards').addEventListener('click', function (e) {
    if (e.target.closest('.record-card')) BackOrigin.set('record.html?date=' + S.key(selected));
  });

  $('cal-grid').addEventListener('click', function (e) {
    var btn = e.target.closest('.record-cal__day[data-key]');
    if (btn) select(S.parseKey(btn.dataset.key));
  });
  // 방향키로 날짜 이동
  $('cal-grid').addEventListener('keydown', function (e) {
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    var next = S.addDays(selected, step);
    if (next.getMonth() !== month.getMonth()) month = new Date(next.getFullYear(), next.getMonth(), 1);
    select(next);
    var btn = $('cal-grid').querySelector('[data-key="' + S.key(next) + '"]');
    if (btn) btn.focus();
  });

  function moveMonth(diff) {
    month = new Date(month.getFullYear(), month.getMonth() + diff, 1);
    // 이번 달이면 오늘, 아니면 1일 선택
    var d = (month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()) ? today : month;
    select(d);
  }
  $('cal-prev').addEventListener('click', function () { moveMonth(-1); });
  $('cal-next').addEventListener('click', function () { moveMonth(1); });

  renderCalendar();
  renderDay();
})();
