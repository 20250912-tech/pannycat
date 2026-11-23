// 활동 기록: 방금 마친 활동(sessionStorage) + 저장한 마음기록 목록(localStorage)
window.ActivityRecord = (function () {
  var LAST_KEY = 'panny-last-activity';
  var RECORDS_KEY = 'panny-mind-records';
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

  // 호흡 등 활동이 끝났을 때 호출
  function setLast(activity) { write(sessionStorage, LAST_KEY, activity); }
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

  return { setLast: setLast, getLast: getLast, save: save, latest: latest, countToday: countToday, formatDuration: formatDuration };
})();
