// 마음일기 저장소: localStorage 에 { id, emo, text, at } 목록으로 보관
window.DiaryStore = (function () {
  var KEY = 'panny-diary';
  var EMOTIONS = [
    { key: 'calm',    label: '차분', color: '#9B87F5' },
    { key: 'content', label: '만족', color: '#A8DFC8' },
    { key: 'anger',   label: '분노', color: '#F4AE9E' },
    { key: 'sad',     label: '우울', color: '#8EB2D2' },
    { key: 'tense',   label: '긴장', color: '#DCDD8E' }
  ];
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  function all() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  function emotion(key) {
    for (var i = 0; i < EMOTIONS.length; i++) if (EMOTIONS[i].key === key) return EMOTIONS[i];
    return null;
  }

  function add(emo, text) {
    var entry = { id: Date.now().toString(36), emo: emo, text: text, at: Date.now() };
    var list = all();
    list.push(entry);
    return write(list) ? entry : null;
  }

  function get(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // 기존 일기 수정: 내용·감정만 바뀌고 작성 시각(at)은 그대로 유지
  function update(id, emo, text) {
    var list = all();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i].emo = emo;
        list[i].text = text;
        list[i].editedAt = Date.now();
        return write(list) ? list[i] : null;
      }
    }
    return null;
  }

  // 최신 기록이 먼저 오도록 정렬
  function byEmotion(emo) {
    return all().filter(function (d) { return d.emo === emo; })
      .sort(function (a, b) { return b.at - a.at; });
  }
  function count(emo) { return byEmotion(emo).length; }

  // "10월 17일 (토)"
  function formatDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DAYS[d.getDay()] + ')';
  }
  // "오후 9:36"
  function formatTime(ts) {
    var d = new Date(ts);
    var h = d.getHours(), m = d.getMinutes();
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return (h < 12 ? '오전 ' : '오후 ') + h12 + ':' + (m < 10 ? '0' : '') + m;
  }

  // 일기 속 긍정적인 변화 표현을 <b>로 강조한 HTML (예: "한결 나아졌다." "차분해졌다." "답답함이 해소되었다.")
  // 강조 범위: [한결·훨씬 같은 꾸밈말 또는 '~이/가' 주어] + 긍정 변화 서술어 + 문장부호
  var POSITIVE = new RegExp(
    '(?:(?:한결|훨씬|많이|조금|좀|한층|점점|다시|꽤|확실히|[가-힣]+[이가])\\s)?' +
    '(?:' +
      '(?:나아|차분해|편안해|편해|괜찮아|가벼워|좋아|후련해|개운해|상쾌해|평온해|여유로워|밝아|맑아|안정돼|진정돼)(?:졌|지고|진다|지는|져서|져)' +
      '|(?:안정|진정|해소|정리|안심|위로)(?:이 |가 )?(?:되었|됐|되고|된다|되는|돼)' +
      '|(?:풀렸|풀어졌|줄었|줄어들었|가라앉았|누그러졌|여유가 생겼|힘이 났|힘이 생겼|기분이 좋아졌)' +
    ')[가-힣]*[.!~]*', 'g');
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function highlight(text) {
    return escapeHtml(text).replace(POSITIVE, '<b>$&</b>');
  }

  return {
    EMOTIONS: EMOTIONS, emotion: emotion, all: all, add: add, get: get, update: update,
    byEmotion: byEmotion, count: count, formatDate: formatDate, formatTime: formatTime,
    highlight: highlight
  };
})();
