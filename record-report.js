// 기록 리포트 (Figma 1:3702) — 월~일 한 주 단위
// 이번 주 인사이트는 일주일치(7일 모두) 기록이 있을 때만 보여줌
// 알림 설정하기 → 바텀시트(Figma 63:5561), 시간·요일은 notify.js(마이페이지 알림 설정) 그대로
(function () {
  var S = RecordStore;
  var $ = function (id) { return document.getElementById(id); };
  var DOW = ['월', '화', '수', '목', '금', '토', '일'];
  var today = S.startOfDay(new Date());

  function mondayOf(d) { return S.addDays(d, -((d.getDay() + 6) % 7)); }
  var monday = mondayOf(today);

  // "10월 1주차": 그 주 목요일이 속한 달 기준
  function weekLabel(mon) {
    var thu = S.addDays(mon, 3);
    return (thu.getMonth() + 1) + '월 ' + Math.ceil(thu.getDate() / 7) + '주차';
  }
  function short(d) { return (d.getMonth() + 1) + '.' + d.getDate() + ' (' + S.weekday(d) + ')'; }

  function timeBucket(ts) {
    var h = new Date(ts).getHours();
    if (h < 6) return '새벽(0–6시)';
    if (h < 12) return '오전(6–12시)';
    if (h < 18) return '오후(12–6시)';
    return '저녁(6–12시)';
  }

  function render() {
    var sun = S.addDays(monday, 6);
    $('wk-title').textContent = weekLabel(monday);
    $('wk-range').textContent = short(monday) + ' – ' + short(sun);
    $('wk-next').disabled = S.addDays(monday, 7) > today;

    var week = S.inRange(monday, S.addDays(monday, 7));
    var byDay = DOW.map(function (_, i) { return S.onDay(S.addDays(monday, i)); });

    renderBars(byDay, week);
    var daily = byDay.map(function (list) { return S.summary(list).lastAnxiety; });
    renderStats(byDay, week, daily);
    renderFlow(daily);
    renderEmotions(week);
    var eff = effectiveness(week);
    renderInsight(byDay, week, eff);
    renderSuggest(daily, eff);
  }

  // ---------- 활동 빈도 (요일별 블록 쌓기) ----------
  function renderBars(byDay, week) {
    var wrap = $('freq-bars');
    wrap.textContent = '';
    byDay.forEach(function (list, i) {
      var col = document.createElement('div');
      col.className = 'rp-bars__col';
      var stack = document.createElement('div');
      stack.className = 'rp-bars__stack';
      var n = list.length;
      var h = n ? Math.min(22, (94 - (n - 1) * 2) / n) : 0;
      list.forEach(function (e) {
        var b = document.createElement('span');
        b.className = 'rp-bars__block';
        b.style.height = h + 'px';
        b.style.background = S.TYPES[e.type].color;
        stack.appendChild(b);
      });
      col.appendChild(stack);
      var lbl = document.createElement('span');
      lbl.className = 'rp-bars__day';
      lbl.textContent = DOW[i];
      col.appendChild(lbl);
      wrap.appendChild(col);
    });
    var counts = {};
    week.forEach(function (e) { counts[e.type] = (counts[e.type] || 0) + 1; });
    var desc = DOW.map(function (d, i) { return d + ' ' + byDay[i].length + '회'; }).join(', ');
    wrap.setAttribute('aria-label', '요일별 활동 횟수: ' + desc);
    legend($('freq-legend'), S.TYPE_ORDER.map(function (t) {
      return { color: S.TYPES[t].color, text: S.TYPES[t].label + ' ' + (counts[t] || 0) };
    }));
  }

  function legend(ul, items) {
    ul.innerHTML = items.map(function (it) {
      return '<li><span class="rp-legend__dot" style="background:' + it.color + '"></span>' + it.text + '</li>';
    }).join('');
  }

  // ---------- 활동 일수 · 총 활동 · 평균 불안 ----------
  function renderStats(byDay, week, daily) {
    var days = byDay.filter(function (l) { return l.length; }).length;
    $('st-days').textContent = days + '/7일';
    $('st-total').textContent = week.length + '회';
    var vals = daily.filter(function (v) { return v != null; });
    $('st-avg').textContent = vals.length
      ? (Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length * 10) / 10).toFixed(1)
      : '-';
  }

  // ---------- 불안 흐름 (꺾은선) ----------
  function renderFlow(daily) {
    var box = $('flow-chart');
    var pts = [];
    daily.forEach(function (v, i) {
      if (v == null) return;
      pts.push({ i: i, v: v, x: (i / 6) * 100, y: 10 + ((5 - v) / 4) * 80 });
    });
    var poly = pts.map(function (p) { return p.x + ',' + p.y; }).join(' ');
    box.innerHTML =
      '<svg class="rp-line__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
        '<line x1="0" y1="0.5" x2="100" y2="0.5" /><line x1="0" y1="50" x2="100" y2="50" /><line x1="0" y1="99.5" x2="100" y2="99.5" />' +
        (pts.length > 1 ? '<polyline points="' + poly + '" />' : '') +
      '</svg>' +
      pts.map(function (p) {
        return '<span class="rp-line__dot" style="left:' + p.x + '%;top:' + p.y + '%" title="' + DOW[p.i] + ' ' + p.v + '"></span>';
      }).join('');
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', '요일별 하루 마지막 불안도: ' +
      daily.map(function (v, i) { return DOW[i] + ' ' + (v == null ? '기록 없음' : v); }).join(', '));

    var text;
    if (pts.length < 2) {
      text = '기록이 쌓이면 한 주의 불안 흐름을 보여드릴게요.';
    } else {
      var max = pts.reduce(function (a, b) { return b.v >= a.v ? b : a; });
      var half = Math.floor(pts.length / 2);
      var avg = function (arr) { return arr.reduce(function (s, p) { return s + p.v; }, 0) / arr.length; };
      var first = avg(pts.slice(0, half)), last = avg(pts.slice(pts.length - half));
      var trend = last > first + 0.4 ? '주 후반으로 갈수록 불안도가 높아졌어요.'
        : last < first - 0.4 ? '주 후반으로 갈수록 불안도가 낮아졌어요.'
        : '한 주 동안 불안도가 비슷하게 유지됐어요.';
      text = trend + ' ' + DOW[max.i] + '요일 불안(' + max.v + ')이 가장 높았어요.';
    }
    $('flow-text').textContent = text;
  }

  // ---------- 마음 상태 (일기 감정 분포) ----------
  function renderEmotions(week) {
    var diary = week.filter(function (e) { return e.type === 'diary' && S.emotion(e.emo); });
    var counts = {};
    diary.forEach(function (e) { counts[e.emo] = (counts[e.emo] || 0) + 1; });
    var bar = $('emo-bar');
    var pct = function (k) { return diary.length ? Math.round((counts[k] || 0) / diary.length * 100) : 0; };
    bar.innerHTML = S.EMOTIONS.map(function (e) {
      var p = diary.length ? (counts[e.key] || 0) / diary.length * 100 : 0;
      return p ? '<span style="width:' + p + '%;background:' + e.color + '"></span>' : '';
    }).join('');
    bar.setAttribute('aria-label', diary.length
      ? '감정 분포: ' + S.EMOTIONS.map(function (e) { return e.label + ' ' + pct(e.key) + '%'; }).join(', ')
      : '이번 주에 기록된 감정이 없어요');
    legend($('emo-legend'), S.EMOTIONS.map(function (e) {
      return { color: e.color, text: e.label + ' ' + pct(e.key) + '%' };
    }));
  }

  // 활동 종류·시간대별 평균 불안 감소량
  function effectiveness(week) {
    var byType = {}, byTime = {}, timeCount = {};
    week.forEach(function (e) {
      timeCount[timeBucket(e.at)] = (timeCount[timeBucket(e.at)] || 0) + 1;
      if (typeof e.anxiety !== 'number' || typeof e.anxietyBefore !== 'number') return;
      var drop = e.anxietyBefore - e.anxiety;
      [[byType, e.type], [byTime, timeBucket(e.at)]].forEach(function (p) {
        var m = p[0][p[1]] || (p[0][p[1]] = { sum: 0, n: 0 });
        m.sum += drop; m.n += 1;
      });
    });
    function best(map) {
      var top = null, topAvg = 0;
      Object.keys(map).forEach(function (k) {
        var a = map[k].sum / map[k].n;
        if (a > topAvg) { top = k; topAvg = a; }
      });
      return top;
    }
    function most(map) {
      return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; })[0] || null;
    }
    return { type: best(byType), time: best(byTime), busyTime: most(timeCount) };
  }

  // ---------- 이번 주 인사이트 (7일 모두 기록했을 때만) ----------
  function renderInsight(byDay, week, eff) {
    var full = byDay.every(function (l) { return l.length > 0; });
    $('insight').hidden = !full;
    if (!full) return;
    var lines = [];
    if (eff.time) lines.push(eff.time + '에 한 활동 후 불안이 가장 많이 줄었어요.');
    else if (eff.busyTime) lines.push(eff.busyTime + '에 활동을 가장 많이 했어요.');
    if (eff.type) lines.push('불안을 낮추는 데엔 ' + S.TYPES[eff.type].label + '이 가장 효과적이었어요.');
    else lines.push('일주일 동안 빠짐없이 마음을 돌봤어요. 정말 잘했어요!');
    $('insight-text').textContent = lines.join('\n');
  }

  // ---------- 제안 ----------
  function renderSuggest(daily, eff) {
    var act = eff.type ? S.TYPES[eff.type].label : '호흡';
    var maxI = -1;
    daily.forEach(function (v, i) { if (v != null && (maxI < 0 || v >= daily[maxI])) maxI = i; });
    $('suggest-text').textContent = maxI >= 0 && daily[maxI] >= 3
      ? DOW[maxI] + '요일 아침 ' + act + ' 3분으로 시작해 볼까요? 불안이 높았던 요일이에요.'
      : '하루 한 번, ' + act + ' 3분으로 마음을 돌봐 볼까요? 정해둔 시간에 알려드릴게요.';
  }

  $('wk-prev').addEventListener('click', function () { monday = S.addDays(monday, -7); render(); });
  $('wk-next').addEventListener('click', function () {
    if (S.addDays(monday, 7) <= today) { monday = S.addDays(monday, 7); render(); }
  });

  // ---------- 알림 설정 바텀시트 ----------
  var overlayEl = $('notify-overlay');
  var sheet = Breath.overlay(overlayEl, { trigger: $('notify-open') });
  $('notify-open').addEventListener('click', function () { sheet.open(); });
  // 시트 바깥(어두운 배경)을 누르면 닫힘
  overlayEl.addEventListener('click', function (e) { if (e.target === overlayEl) sheet.close('close'); });

  var toastTimer;
  $('notify-form').addEventListener('notify:saved', function (e) {
    sheet.close('save');
    var d = e.detail;
    var t = $('toast');
    t.textContent = d.enabled ? '알림을 저장했어요.' : '활동 알림을 껐어요.';
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2000);
  });

  render();
})();
