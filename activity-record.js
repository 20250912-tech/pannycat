// 활동 기록: 방금 마친 활동(sessionStorage) + 저장한 마음기록 목록(localStorage)
window.ActivityRecord = (function () {
  var LAST_KEY = 'panny-last-activity';
  var RECORDS_KEY = 'panny-mind-records';
  var PROGRESS_KEY = 'panny-unfinished';          // 하다가 그만둔 활동 (홈 "이어서 하기")
  var PROGRESS_TTL = 7 * 24 * 3600e3;             // 일주일 지나면 버림
  var FALLBACK = { type: 'breathing', pattern: '4-2-4-2', seconds: 60, rounds: 5 };

  function read(store, key, fallback) {
    try {
      var v = JSON.parse(store.getItem(key) || 'null');
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경은 무시 */ }
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  // 호흡 등 활동이 끝났을 때 호출 → 끝까지 했으니 '이어서 하기'는 지움
  function setLast(activity) {
    write(sessionStorage, LAST_KEY, activity);
    clearProgress();
  }

  // ---------- 하다가 그만둔 활동 ----------
  // 진행 중 상태를 저장 { type, href, ...활동별 상태 }. 활동을 마치면(setLast) 지워짐
  function saveProgress(p) { write(localStorage, PROGRESS_KEY, Object.assign({}, p, { at: Date.now() })); }
  function clearProgress() { try { localStorage.removeItem(PROGRESS_KEY); } catch (e) { /* 무시 */ } }
  function getProgress(type) {
    var p = read(localStorage, PROGRESS_KEY, null);
    if (!p || !p.type || !p.href) return null;
    if (Date.now() - (p.at || 0) > PROGRESS_TTL) { clearProgress(); return null; }
    return !type || p.type === type ? p : null;
  }
  // ?resume=1 로 들어왔을 때만 저장된 진행 상태를 돌려줌
  function resuming(type) {
    try { if (new URLSearchParams(location.search).get('resume') !== '1') return null; } catch (e) { return null; }
    return getProgress(type);
  }
  // 지금 화면 주소 (resume 파라미터 제외) — 이어서 할 때 같은 설정으로 열기
  function here() {
    var q = new URLSearchParams(location.search);
    q.delete('resume');
    var qs = q.toString();
    return location.pathname.split('/').pop() + (qs ? '?' + qs : '');
  }
  // 이어서 하기 링크
  function resumeHref(p) { return p.href + (p.href.indexOf('?') === -1 ? '?' : '&') + 'resume=1'; }
  // 저장된 마음기록 전체 (오래된 순)
  function all() { return read(localStorage, RECORDS_KEY, []); }
  function getLast() { return Object.assign({}, FALLBACK, read(sessionStorage, LAST_KEY, {})); }

  // 마음기록 저장 → 저장된 기록 반환
  function save(extra) {
    var record = Object.assign(getLast(), extra, { day: today(), at: Date.now() });
    var list = read(localStorage, RECORDS_KEY, []);
    list.push(record);
    write(localStorage, RECORDS_KEY, list);
    return record;
  }

  function latest() {
    var list = read(localStorage, RECORDS_KEY, []);
    return list.length ? list[list.length - 1] : Object.assign(getLast(), { day: today() });
  }

  function countToday(type) {
    var d = today();
    var n = read(localStorage, RECORDS_KEY, []).filter(function (r) {
      return r.day === d && (!type || r.type === type);
    }).length;
    return Math.max(n, 1);
  }

  function formatDuration(sec) {
    sec = Math.round(sec);
    if (sec < 60) return sec + '초';
    var m = Math.floor(sec / 60), s = sec % 60;
    return s ? m + '분 ' + s + '초' : m + '분';
  }

  return {
    setLast: setLast, getLast: getLast, save: save, latest: latest, countToday: countToday, formatDuration: formatDuration,
    all: all, saveProgress: saveProgress, getProgress: getProgress, clearProgress: clearProgress,
    resuming: resuming, here: here, resumeHref: resumeHref
  };
})();
