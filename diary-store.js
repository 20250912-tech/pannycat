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

  // 일기 속 긍정적인 표현을 <b>로 강조한 HTML
  // (예: "한결 나아졌다." "답답함이 해소되었다." "오늘 정말 좋았다!" "발표를 해내서 뿌듯했다.")
  // 강조 범위: [한결·정말 같은 꾸밈말 또는 '~이/가' 주어] + 긍정 서술어(활용형 포함) + 문장부호
  // "좋지 않았다" "안 즐거웠다" "행복하지 못했다" 같은 부정은 강조하지 않음

  // 1) 좋아지는 변화
  var CHANGE = [
    '(?:나아|차분해|편안해|편해|괜찮아|가벼워|좋아|후련해|개운해|상쾌해|평온해|여유로워|밝아|맑아|안정돼|진정돼|기운이 나|힘이 나)(?:졌|지고|진다|지는|져서|져)',
    '(?:안정|진정|해소|정리|안심|위로|힐링|도움)(?:이 |가 )?(?:되었|됐|되고|된다|되는|돼)',
    '(?:풀렸|풀어졌|줄었|줄어들었|가라앉았|누그러졌|사라졌|여유가 생겼|힘이 났|힘이 생겼|용기가 났|용기가 생겼|기운이 났|웃음이 났|마음이 놓였|마음이 놓인)'
  ];
  // 2) 긍정적인 감정·평가 (어간 — 뒤에 붙는 활용 어미는 아래 [가-힣]*가 함께 잡음)
  var FEELING = [
    // 좋다·만족 계열
    '좋', '만족', '흡족', '흐뭇', '괜찮', '다행', '훌륭', '최고', '완벽',
    // 기쁨·즐거움
    '행복', '기쁘', '기뻤', '기뻐', '즐겁', '즐거', '신나', '신났', '신난', '재밌', '재미있', '웃었', '웃겼', '웃으', '설레', '설렜', '설렌', '두근두근',
    '반갑', '반가', '들뜬', '들떴', '신기',
    // 성취·자부심
    '뿌듯', '대견', '자랑스러', '자랑스럽', '해냈', '해낼', '해내', '성공', '이겨냈', '이겨내', '극복', '잘했', '잘해냈', '잘 해냈', '잘됐', '잘 됐', '잘되', '잘 되',
    '칭찬', '인정받', '성장', '발전', '뿌듯함',
    // 고마움·사랑·따뜻함
    '감사', '고맙', '고마', '사랑스러', '사랑스럽', '사랑한', '사랑해', '따뜻', '따듯', '포근', '든든', '소중', '감동', '뭉클', '위로가 됐', '위로받',
    // 편안·평화·안정
    '편안', '편했', '편하', '편한', '평온', '평화로', '평화롭', '홀가분', '후련', '개운', '상쾌', '여유로', '여유롭', '느긋', '안심', '안도', '차분했', '차분하', '차분한', '고요',
    '마음이 편', '마음이 놓', '마음이 가벼', '기분이 좋', '기분 좋', '기분이 나아',
    // 기대·의욕·희망
    '기대돼', '기대된', '기대되', '희망', '의욕', '힘이 됐', '힘이 된', '든든했', '용기',
    // 몸 상태·일상
    '맛있', '푹 잤', '잘 잤', '푹 쉬', '잘 쉬', '개운했', '가뿐', '상쾌했', '시원했', '시원하'
  ];

  var MODIFIER = '(?:(?:한결|훨씬|많이|조금|좀|한층|점점|다시|꽤|확실히|정말|진짜|너무|아주|참|무척|매우|엄청|되게|제법|충분히|오랜만에|[가-힣]+[이가])\\s)?';
  var POSITIVE = new RegExp(
    MODIFIER + '(?:' + CHANGE.concat(FEELING).join('|') + ')[가-힣]*[.!~]*', 'g');

  // 부정 · 다른 낱말 속에 들어간 경우는 제외
  function isPositive(match, offset, whole) {
    var before = whole.slice(0, offset);
    var after = whole.slice(offset + match.length);
    if (/[가-힣]$/.test(before)) return false;                      // 낱말 중간 (예: "안좋았다"의 "좋")
    if (/(?:^|\s)(?:안|못|덜|별로|전혀|하나도|조금도)\s$/.test(before)) return false; // "안 좋았다" "별로 즐겁지"
    if (/(?:지\s*않|지\s*못|지\s*마|지는\s*않|않았|않다|않아|않은|없었|없다|없어|없는|아니)/.test(match)) return false;
    if (/지$/.test(match) && /^\s*(?:않|못|마|말|도\s*않)/.test(after)) return false; // "좋지 않았다"
    if (/^\s*(?:않|못하|아니)/.test(after)) return false;
    return true;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function highlight(text) {
    return escapeHtml(text).replace(POSITIVE, function (m, offset, whole) {
      return isPositive(m, offset, whole) ? '<b>' + m + '</b>' : m;
    });
  }

  return {
    EMOTIONS: EMOTIONS, emotion: emotion, all: all, add: add, get: get, update: update,
    byEmotion: byEmotion, count: count, formatDate: formatDate, formatTime: formatTime,
    highlight: highlight
  };
})();
