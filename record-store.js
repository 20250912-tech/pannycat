// 기록 탭 공용 데이터: 활동 기록(ActivityRecord · panny-mind-records) + 마음일기(DiaryStore · panny-diary)를
// 날짜별 "기록 항목"으로 합쳐 캘린더 · 자세히보기 · 리포트에서 함께 씀.
// 미리보기: URL 에 ?demo=1 → 예시 기록으로 표시(저장소는 건드리지 않음), ?demo=0 → 해제
window.RecordStore = (function () {
  var RECORDS_KEY = 'panny-mind-records';
  var DIARY_KEY = 'panny-diary';
  var DEMO_KEY = 'panny-record-demo';
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  // 활동 종류 — 이름 · 카드 색 · 아이콘 · 시작 링크 · 빈 카드 안내
  var TYPES = {
    affirmation: { label: '확언',     color: '#868BF2', icon: 'assets/record/ic-affirmation.svg', href: 'affirmation.html',  empty: '“오늘의 확언을 읽어보세요.”' },
    breathing:   { label: '호흡',     color: '#9B87F5', icon: 'assets/record/ic-breathing.svg',   href: 'breathing.html', empty: '호흡 운동을 해보세요.' },
    grounding:   { label: '그라운딩', color: '#36305D', icon: 'assets/record/ic-grounding.svg',   href: 'grounding.html', empty: '복잡해진 머리속을 정리해요.' },
    bodyscan:    { label: '바디스캔', color: '#584E91', icon: 'assets/record/ic-bodyscan.svg',    href: 'bodyscan.html',  empty: '명상을 해보세요.' },
    diary:       { label: '마음일기', color: '#867FA5', icon: 'assets/record/ic-diary.svg',       href: 'diary.html',     empty: '현재 마음을 기록해보세요.' }
  };
  var TYPE_ORDER = ['breathing', 'grounding', 'affirmation', 'bodyscan', 'diary'];

  var EMOTIONS = (window.DiaryStore && DiaryStore.EMOTIONS) || [
    { key: 'calm', label: '차분', color: '#9B87F5' },
    { key: 'content', label: '만족', color: '#A8DFC8' },
    { key: 'anger', label: '분노', color: '#F4AE9E' },
    { key: 'sad', label: '우울', color: '#8EB2D2' },
    { key: 'tense', label: '긴장', color: '#DCDD8E' }
  ];
  var DEFAULT_COLOR = '#9B87F5';

  function read(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  // ---------- 데모 모드 ----------
  (function () {
    try {
      var p = new URLSearchParams(location.search).get('demo');
      if (p === '1') sessionStorage.setItem(DEMO_KEY, '1');
      if (p === '0') sessionStorage.removeItem(DEMO_KEY);
    } catch (e) { /* 저장 불가 환경은 무시 */ }
  })();
  function isDemo() {
    try { return sessionStorage.getItem(DEMO_KEY) === '1'; } catch (e) { return false; }
  }

  function demoData() {
    var today = startOfDay(new Date());
    var acts = [], diary = [];
    var QUOTES = ['내일은 더 나아질 것이다', '나는 충분히 잘하고 있어', '천천히 가도 괜찮아'];
    var NOTES = ['발표 준비로 긴장됐는데, 호흡하고 나니 한결 나아졌다.\n오늘은 일찍 자야겠다.',
      '산책하면서 바람을 느끼니 마음이 차분해졌다.', '별일 없이 지나간 하루. 그래도 기록해 두고 싶었다.'];
    var emoKeys = ['calm', 'content', 'anger', 'sad', 'tense'];
    // 최근 16일: 날마다 1~5개 활동 (일부 날은 비움)
    for (var back = 15; back >= 0; back--) {
      if (back === 9 || back === 13) continue;  // 지난주(월~일)는 7일 모두 채워 인사이트가 보이도록
      var day = addDays(today, -back);
      var n = back === 0 ? 4 : ((back * 7) % 5) + 1;
      var anx = 4 - (back % 3);
      for (var i = 0; i < n; i++) {
        var type = ['breathing', 'grounding', 'affirmation', 'bodyscan', 'diary'][(i + back) % 5];
        if (back === 0) type = ['breathing', 'grounding', 'affirmation', 'diary'][i];
        var at = new Date(day.getTime() + (12 + i * 3) * 3600e3 + (59 - i * 13) * 60e3).getTime();
        if (type === 'diary') {
          diary.push({ id: 'd' + back + i, emo: back === 0 ? 'calm' : emoKeys[(back * 3) % 5], text: NOTES[back % 3], at: at, demo: true });
          continue;
        }
        var after = Math.max(1, Math.min(5, anx - (i % 2)));
        var rec = { type: type, at: at, anxietyBefore: Math.min(5, after + 1 + (i % 2)), anxiety: after };
        if (type === 'breathing') Object.assign(rec, { pattern: '4-7-8', seconds: 180, rounds: 4 });
        if (type === 'grounding') Object.assign(rec, { seconds: 300 });
        if (type === 'bodyscan') Object.assign(rec, { seconds: 240 });
        if (type === 'affirmation') rec.text = QUOTES[back % 3];
        acts.push(rec);
        anx = after;
      }
    }
    return { acts: acts, diary: diary };
  }

  // ---------- 날짜 도우미 ----------
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function sameDay(a, b) { return key(a) === key(b); }
  function weekday(d) { return DAYS[d.getDay()]; }

  // "오후 9:36"
  function formatTime(ts) {
    var d = new Date(ts), h = d.getHours(), m = d.getMinutes();
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 === 0 ? 12 : h % 12) + ':' + pad(m);
  }
  function formatDuration(sec) {
    sec = Math.round(sec || 0);
    if (sec < 60) return sec + '초';
    var m = Math.floor(sec / 60), s = sec % 60;
    return s ? m + '분 ' + s + '초' : m + '분';
  }

  // ---------- 항목 합치기 ----------
  var cache = null;
  function entries() {
    if (cache) return cache;
    var src = isDemo() ? demoData() : { acts: read(RECORDS_KEY), diary: read(DIARY_KEY) };
    var list = [];
    src.acts.forEach(function (r) {
      if (!r || !r.at || !TYPES[r.type]) return;
      list.push(Object.assign({ kind: 'activity' }, r));
    });
    src.diary.forEach(function (d) {
      if (!d || !d.at) return;
      list.push({ kind: 'diary', type: 'diary', at: d.at, emo: d.emo, text: d.text || '' });
    });
    list.sort(function (a, b) { return a.at - b.at; });
    // 활동 전 불안도가 따로 없으면 직전 활동 기록의 불안도를 "전"으로 사용
    var prev = null;
    list.forEach(function (e) {
      if (typeof e.anxiety !== 'number') return;
      if (typeof e.anxietyBefore !== 'number' && prev != null) e.anxietyBefore = prev;
      prev = e.anxiety;
    });
    cache = list;
    return list;
  }

  function onDay(d) {
    var k = key(d);
    return entries().filter(function (e) { return key(new Date(e.at)) === k; });
  }
  function inRange(from, toExclusive) {
    return entries().filter(function (e) { return e.at >= from.getTime() && e.at < toExclusive.getTime(); });
  }

  function emotion(k) {
    for (var i = 0; i < EMOTIONS.length; i++) if (EMOTIONS[i].key === k) return EMOTIONS[i];
    return null;
  }

  // 하루 요약 — 활동 수 · 마지막 불안도 · 대표 감정(가장 많이 고른 감정, 같으면 최근)
  function summary(list) {
    var lastAnx = null, counts = {}, top = null;
    list.forEach(function (e) {
      if (typeof e.anxiety === 'number') lastAnx = e.anxiety;
      if (e.type === 'diary' && emotion(e.emo)) {
        counts[e.emo] = (counts[e.emo] || 0) + 1;
        if (!top || counts[e.emo] >= counts[top]) top = e.emo;
      }
    });
    return { count: list.length, lastAnxiety: lastAnx, emotion: top ? emotion(top) : null };
  }

  // 고양이 발바닥: 활동 1개당 발가락 1개(왼→오), 5개째에 발바닥까지 · 색 = 그날 일기에서 고른 감정
  var PAW_EMPTY = '#EDEAF9';
  function pawSvg(count, color, size) {
    color = color || DEFAULT_COLOR;
    size = size || 40;
    var f = function (i) { return count >= i ? color : PAW_EMPTY; };
    return '<svg class="paw" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">' +
      '<path d="M20.0071 18.5813C22.4711 18.4791 27.5139 20.6997 28.0013 27.5686C28.0817 28.7058 27.2528 30.2553 25.9046 30.761C22.9426 31.5894 22.1394 30.2191 20.0071 30.219C17.8747 30.219 17.0716 31.5892 14.1097 30.761C12.7613 30.2554 11.9325 28.7059 12.013 27.5686C12.5004 20.6994 17.5433 18.4788 20.0071 18.5813Z" fill="' + f(5) + '"/>' +
      '<ellipse cx="3.17489" cy="3.72863" rx="3.17489" ry="3.72863" transform="matrix(0.958807 -0.284059 0.315102 0.949058 5.11792 16.928)" fill="' + f(1) + '"/>' +
      '<ellipse cx="15.5557" cy="13.3966" rx="3.54849" ry="4.42394" fill="' + f(2) + '"/>' +
      '<ellipse cx="24.4443" cy="13.3966" rx="3.54849" ry="4.42394" fill="' + f(3) + '"/>' +
      '<ellipse cx="3.17489" cy="3.72863" rx="3.17489" ry="3.72863" transform="matrix(-0.958807 -0.284059 -0.315102 0.949058 34.8821 16.928)" fill="' + f(4) + '"/>' +
      '</svg>';
  }
  function pawFor(d, size) {
    var list = onDay(d);
    var color = null;
    list.forEach(function (e) { if (e.type === 'diary' && emotion(e.emo)) color = emotion(e.emo).color; });
    return pawSvg(Math.min(5, list.length), color, size);
  }

  // 불안도 표기: "7 → 4" 또는 전 값이 없으면 "4"
  function anxietyText(e) {
    if (typeof e.anxiety !== 'number') return '';
    return typeof e.anxietyBefore === 'number' ? e.anxietyBefore + ' → ' + e.anxiety : String(e.anxiety);
  }

  // 자세히보기 펼침 문구
  function detailText(e) {
    if (e.type === 'breathing') {
      var parts = [(e.pattern || '4-2-4-2') + ' 호흡', formatDuration(e.seconds)];
      if (e.rounds) parts.push(e.rounds + '회 반복');
      return parts.join(' · ');
    }
    if (e.type === 'grounding') return '5-4-3-2-1 감각 찾기 · ' + formatDuration(e.seconds);
    if (e.type === 'bodyscan') return '바디스캔 명상 · ' + formatDuration(e.seconds);
    return '';
  }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  return {
    TYPES: TYPES, TYPE_ORDER: TYPE_ORDER, EMOTIONS: EMOTIONS, DAYS: DAYS,
    entries: entries, onDay: onDay, inRange: inRange, summary: summary, emotion: emotion,
    pawSvg: pawSvg, pawFor: pawFor, anxietyText: anxietyText, detailText: detailText,
    startOfDay: startOfDay, addDays: addDays, key: key, parseKey: parseKey, sameDay: sameDay,
    weekday: weekday, formatTime: formatTime, formatDuration: formatDuration, escape: escape, isDemo: isDemo
  };
})();
