// 홈 — 긴급 SOS 아래 "이어서 하기" 카드 + "나를 위한 추천활동" 카드
// · 이어서 하기: 하다가 그만둔 활동(ActivityRecord.getProgress)을 멈춘 곳부터 다시 열기.
//   그만둔 활동이 없으면 가장 최근에 마친 활동을 한 번 더 권하고, 기록이 하나도 없으면 카드를 숨김
// · 추천활동: 기록이 적은 첫 사용자는 온보딩 답변으로,
//   꾸준히 쓰는 사용자(완료 기록 REGULAR_MIN개 이상)는 자주 한 활동 + 불안이 가장 많이 줄어든 활동으로 추천
(function () {
  var REGULAR_MIN = 5;

  // 활동 정보 (활동하기 탭의 카드와 같은 이름 · 아이콘 · 링크)
  var ACT = {
    breathing:   { name: '호흡',     verb: '호흡하기', href: 'breathing.html',   icon: 'assets/activity/breathing.svg',     w: 117,     h: 101,
                   pitch: '천천히 숨 고르며 안정을 찾아봐요' },
    bodyscan:    { name: '바디스캔', verb: '바디스캔', href: 'bodyscan.html',    icon: 'assets/activity/hands-praying.svg', w: 119.745, h: 119.745,
                   pitch: '몸의 감각에 집중해 긴장을 풀어요' },
    grounding:   { name: '그라운딩', verb: '그라운딩', href: 'grounding.html',   icon: 'assets/activity/grounding.svg',     w: 92,      h: 92,
                   pitch: '주변 감각으로 지금에 머물러 봐요' },
    affirmation: { name: '확언',     verb: '확언하기', href: 'affirmation.html', icon: 'assets/activity/affirmation.svg',   w: 95,      h: 92,
                   pitch: '긍정 문장으로 나를 격려해 봐요' },
    diary:       { name: '마음일기', verb: '마음일기', href: 'diary-write.html', icon: 'assets/activity/diary.svg',         w: 104.721, h: 89.7026,
                   pitch: '감정을 적으며 마음을 들여다봐요' }
  };
  var ORDER = ['breathing', 'bodyscan', 'grounding', 'affirmation', 'diary'];
  // 활동 후 기록의 불안도: 5 매우 불안 ~ 1 매우 편안
  var BREATH_NAMES = { '4-2-4-2': '기본 호흡', '5-4-5-4': '수면 호흡', '5-5-5': '느린 호흡' };

  var $ = function (id) { return document.getElementById(id); };
  // 받침에 따라 을/를
  function obj(w) {
    var c = w.charCodeAt(w.length - 1) - 0xac00;
    return w + (c >= 0 && c <= 11171 && c % 28 ? '을' : '를');
  }

  // 완료 기록 (오래된 순) — 활동 전 불안도가 없으면 직전 기록의 불안도를 "전"으로 (기록 탭과 같은 방식)
  function records() {
    var raw = [];
    try { raw = JSON.parse(localStorage.getItem('panny-mind-records') || '[]'); } catch (e) { /* 저장소 사용 불가 */ }
    var list = (Array.isArray(raw) ? raw : []).filter(function (r) { return r && ACT[r.type]; });
    list.sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
    var prev = null;
    return list.map(function (r) {
      var e = Object.assign({}, r);
      if (typeof e.anxiety === 'number') {
        if (typeof e.anxietyBefore !== 'number' && prev != null) e.anxietyBefore = prev;
        prev = e.anxiety;
      }
      return e;
    });
  }

  // ---------- 이어서 하기 ----------
  function resumeInfo(p) {
    var a = ACT[p.type];
    if (p.type === 'breathing') {
      return {
        title: a.verb + ' · ' + (BREATH_NAMES[p.pattern] || p.pattern),
        desc: (p.rounds || 0) + '회 중 ' + p.round + '회째에서 멈췄어요.'
      };
    }
    if (p.type === 'grounding') {
      return { title: a.verb, desc: (p.total || 5) + '단계 중 ' + (p.step + 1) + '단계' + (p.sense ? '(' + p.sense + ')' : '') + '에서 멈췄어요.' };
    }
    if (p.type === 'bodyscan') {
      var m = Math.floor(p.elapsed / 60), s = p.elapsed % 60;
      return { title: a.verb + ' ' + Math.round((p.total || 120) / 60) + '분', desc: m + ':' + (s < 10 ? '0' : '') + s + '에서 멈췄어요.' };
    }
    return { title: a.verb, desc: (p.total || 0) + '문장 중 ' + (p.index + 1) + '번째에서 멈췄어요.' };
  }

  function renderResume(list) {
    var card = $('resume-card');
    // 예전 activity-record.js가 캐시돼 있으면 이어서 하기 없이 진행
    var p = typeof ActivityRecord.getProgress === 'function' ? ActivityRecord.getProgress() : null;
    if (p && ACT[p.type]) {
      var info = resumeInfo(p);
      $('resume-title').textContent = info.title;
      $('resume-desc').innerHTML = info.desc + '<br />멈춘 곳부터 이어서 해볼까요?';
      $('resume-btn').href = ActivityRecord.resumeHref(p);
      card.hidden = false;
      return;
    }
    // 그만둔 활동이 없으면 → 가장 최근에 마친 활동 한 번 더
    var last = list[list.length - 1];
    if (!last) { card.hidden = true; return; }
    var a = ACT[last.type];
    var title = a.verb;
    if (last.seconds) title += ' ' + ActivityRecord.formatDuration(last.seconds);
    var line1 = typeof last.anxietyBefore === 'number' && typeof last.anxiety === 'number' && last.anxiety < last.anxietyBefore
      ? '불안이 ' + last.anxietyBefore + '→' + last.anxiety + '로 감소했어요.'
      : '지난번에 ' + obj(a.name) + ' 끝까지 해냈어요.';
    $('resume-title').textContent = title;
    $('resume-desc').innerHTML = line1 + '<br />' + obj(a.name) + ' 한 번 더 해볼까요?';
    $('resume-btn').href = a.href;
    card.hidden = false;
  }

  // ---------- 추천: 첫 사용자 (온보딩 답변) ----------
  // 답변 → 활동 점수. 도움이 되는 방법(coping)을 가장 크게, 지금 느낌 → 도움 방식·불안 순간 순
  var MAP = {
    coping:  { w: 3, breathing: 'breathing', grounding: 'grounding', 'comforting-words': 'affirmation', relaxation: 'bodyscan', journaling: 'diary' },
    feeling: { w: 2, 'racing-heart': 'breathing', worry: 'affirmation', unfocused: 'grounding', escape: 'grounding', calm: 'bodyscan' },
    help:    { w: 1, calm: 'breathing', 'daily-care': 'bodyscan', 'mood-log': 'diary', emergency: 'grounding' },
    trigger: { w: 1, crowded: 'grounding', anticipatory: 'affirmation', 'body-change': 'bodyscan', 'big-event': 'breathing',
               'hard-to-escape': 'grounding', alone: 'affirmation' }
  };
  var REASON = {
    coping: '도움이 된다고 답한 방법이에요',
    feeling: '지금 느낌에 잘 맞는 활동이에요',
    help: '답변을 바탕으로 골라봤어요',
    trigger: '답변을 바탕으로 골라봤어요'
  };

  function fromOnboarding() {
    var ans = window.Answers ? Answers.load() : {};
    var score = {}, why = {};
    Object.keys(MAP).forEach(function (q) {
      var vals = (ans[q] && ans[q].values) || [];
      vals.forEach(function (v) {
        var t = MAP[q][v];
        if (!t) return;
        score[t] = (score[t] || 0) + MAP[q].w;
        if (!why[t] || MAP[why[t]].w < MAP[q].w) why[t] = q;   // 가장 무게가 큰 답변을 이유로
      });
    });
    var best = ORDER.slice().sort(function (a, b) { return (score[b] || 0) - (score[a] || 0); })[0];
    if (!score[best]) return { type: 'breathing', reason: REASON.help };
    return { type: best, reason: REASON[why[best]] };
  }

  // ---------- 추천: 꾸준히 쓰는 사용자 (자주 한 활동 + 불안 감소) ----------
  function fromHistory(list) {
    var stat = {};
    list.forEach(function (r) {
      var s = stat[r.type] || (stat[r.type] = { n: 0, drop: 0, m: 0 });
      s.n += 1;
      if (typeof r.anxiety === 'number' && typeof r.anxietyBefore === 'number') {
        s.drop += r.anxietyBefore - r.anxiety;
        s.m += 1;
      }
    });
    var types = Object.keys(stat);
    types.forEach(function (t) { stat[t].avg = stat[t].m ? stat[t].drop / stat[t].m : 0; });
    var maxN = Math.max.apply(null, types.map(function (t) { return stat[t].n; }));
    var maxAvg = Math.max.apply(null, types.map(function (t) { return stat[t].avg; }));

    // 빈도(가장 자주 = 1)와 평균 불안 감소(가장 많이 = 1)를 반씩
    function score(t) {
      var f = stat[t].n / maxN;
      var d = maxAvg > 0 ? Math.max(stat[t].avg, 0) / maxAvg : 0;
      return f * 0.5 + d * 0.5;
    }
    var best = types.sort(function (a, b) {
      return score(b) - score(a) || stat[b].n - stat[a].n || ORDER.indexOf(a) - ORDER.indexOf(b);
    })[0];

    var s = stat[best];
    var mostUsed = s.n === maxN;
    var mostDrop = maxAvg > 0 && s.avg === maxAvg;
    var reason;
    if (mostUsed && mostDrop) reason = '자주 하고 불안도 많이 줄었어요';
    else if (mostDrop) reason = '평균 불안이 ' + (Math.round(s.avg * 10) / 10) + '단계 줄었어요';
    else reason = '평소 가장 자주 하는 활동이에요';
    return { type: best, reason: reason };
  }

  function renderRecommend(list) {
    var pick = list.length >= REGULAR_MIN ? fromHistory(list) : fromOnboarding();
    var a = ACT[pick.type];
    var card = $('rec-card');
    card.className = 'rec-card rec-card--' + pick.type + ' act-card--' + pick.type;
    card.href = a.href;
    card.dataset.reason = list.length >= REGULAR_MIN ? 'history' : 'onboarding';
    $('rec-title').textContent = a.name;
    $('rec-desc').innerHTML = pick.reason + '<br />' + a.pitch;
    var icon = $('rec-icon');
    icon.src = a.icon;
    icon.width = a.w;
    icon.height = a.h;
  }

  var list = records();
  renderResume(list);
  renderRecommend(list);
})();
