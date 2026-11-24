// 확언 공용 데이터: 주제별 문장, 저장한 문장, 선택한 주제, 진행할 문장 수 (localStorage)
// 문장 안의 \n 은 카드·목록에서 줄바꿈으로 보여요 (white-space: pre-line)
window.AffirmationStore = (function () {
  var KEY_SAVED = 'panny-affirmation-saved';
  var KEY_TOPICS = 'panny-affirmation-topics';
  var KEY_COUNT = 'panny-affirmation-count';
  var KEY_SESSION = 'panny-affirmation-session';

  var TOPICS = ['긴장 완화', '자기 확신', '도전•성장', '자기 돌봄', '수면•휴식', '안정', '집중', '위로'];

  var SENTENCES = {
    '긴장 완화': [
      '모든 것을 지금 당장\n해결하지 않아도 괜찮아요.',
      '숨을 천천히 내쉬면\n몸도 조금씩 풀려요.',
      '이 긴장은 곧\n지나갈 거예요.',
      '실수해도 괜찮아요.\n나는 다시 해낼 수 있어요.',
      '어깨의 힘을 빼고\n지금 이 순간에 머물러요.',
      '완벽하지 않아도\n충분히 괜찮아요.'
    ],
    '자기 확신': [
      '나는 나의 속도로\n나아갈 수 있어요.',
      '지금 이대로도\n나는 충분히 잘하고 있어요.',
      '나는 준비한 만큼\n해낼 수 있어요.',
      '내 목소리는\n들을 가치가 있어요.',
      '나는 생각보다\n더 단단한 사람이에요.',
      '모든 사람에게\n잘 보일 필요는 없어요.'
    ],
    '도전•성장': [
      '작은 노력도 분명히\n나를 앞으로 나아가게 해요.',
      '조금 느리더라도\n앞으로 나아가고 있어요.',
      '어려운 순간도\n나를 성장시켜요.',
      '처음은 누구에게나\n서툴러요.',
      '한 걸음씩이면\n충분해요.',
      '오늘의 시도가\n내일의 나를 만들어요.'
    ],
    '자기 돌봄': [
      '지금은 잠시 멈추고\n나를 돌봐도 괜찮아요.',
      '오늘도 충분히 애썼어요',
      '쉬는 것도\n나를 위한 일이에요.',
      '내 마음을 먼저\n살펴도 괜찮아요.',
      '나는 따뜻하게\n대해질 자격이 있어요.',
      '힘들 땐 도움을 청해도\n괜찮아요.'
    ],
    '수면•휴식': [
      '오늘 하루도\n잘 보냈어요.',
      '이제 편안히\n쉬어도 괜찮아요.',
      '내일 일은\n내일의 내가 할 거예요.',
      '몸과 마음이\n천천히 가라앉고 있어요.',
      '지금 이 쉼이\n나를 다시 채워줘요.',
      '눈을 감고\n숨에만 집중해요.'
    ],
    '안정': [
      '나는 지금\n안전한 곳에 있어요.',
      '이 불안은 지나가는\n감정일 뿐이에요.',
      '발이 땅에 닿아 있는\n감각을 느껴요.',
      '천천히 숨 쉬면\n마음도 고요해져요.',
      '지금 이 순간,\n나는 괜찮아요.',
      '흔들려도 다시\n중심을 찾을 수 있어요.'
    ],
    '집중': [
      '지금 할 수 있는\n한 가지에만 집중해요.',
      '잠시 흐트러져도\n다시 돌아오면 돼요.',
      '나는 지금 여기에\n머물러 있어요.',
      '하나씩 차근차근\n해내면 돼요.',
      '내 속도에 맞춰\n집중할 수 있어요.',
      '작은 일부터\n시작해도 괜찮아요.'
    ],
    '위로': [
      '힘든 마음을 느끼는 것도\n자연스러운 일이에요.',
      '혼자가 아니에요.\n곁에 함께 있어요.',
      '울고 싶을 땐\n울어도 괜찮아요.',
      '오늘 힘들었던 만큼\n나를 안아줘요.',
      '지금 느끼는 감정도\n소중한 나의 일부예요.',
      '괜찮지 않아도\n괜찮아요.'
    ]
  };

  // 저장한 문장 기본값 (Figma 92:5670 예시)
  var DEFAULT_SAVED = [
    '나는 나의 속도로\n나아갈 수 있어요.',
    '모든 것을 지금 당장\n해결하지 않아도 괜찮아요.',
    '작은 노력도 분명히\n나를 앞으로 나아가게 해요.',
    '지금은 잠시 멈추고\n나를 돌봐도 괜찮아요.',
    '오늘도 충분히 애썼어요',
    '조금 느리더라도\n앞으로 나아가고 있어요.',
    '모든 사람에게\n잘 보일 필요는 없어요.'
  ];

  // 내 기록으로 추천받기: 최근 기록 기반 추천 주제
  var RECOMMEND = {
    topics: ['긴장 완화', '자기 확신', '안정'],
    insight: '최근 기록에서 발표 준비에 대한 걱정과 실수에 대한 긴장이 나타났어요. 부담을 덜고 자신감을 높일 수 있는 문장들을 추천했어요.'
  };

  var COUNT_MIN = 1, COUNT_MAX = 10, COUNT_DEFAULT = 4;

  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 불가 환경은 무시 */ }
  }

  // ---------- 저장한 문장 ----------
  function getSaved() {
    var list = read(KEY_SAVED, null);
    return Array.isArray(list) ? list : DEFAULT_SAVED.slice();
  }
  function isSaved(text) { return getSaved().indexOf(text) !== -1; }
  function addSaved(text) {
    var list = getSaved().filter(function (t) { return t !== text; });
    list.unshift(text);                                  // 최근 저장한 문장이 맨 위
    write(KEY_SAVED, list);
  }
  function removeSaved(text) {
    write(KEY_SAVED, getSaved().filter(function (t) { return t !== text; }));
  }
  function toggleSaved(text) {
    if (isSaved(text)) { removeSaved(text); return false; }
    addSaved(text); return true;
  }

  // ---------- 주제 · 문장 수 ----------
  function getTopics() {
    var t = read(KEY_TOPICS, null);
    return Array.isArray(t) ? t.filter(function (x) { return TOPICS.indexOf(x) !== -1; }) : [];
  }
  function setTopics(list) { write(KEY_TOPICS, list); }

  function getCount() {
    var n = parseInt(read(KEY_COUNT, COUNT_DEFAULT), 10);
    return n >= COUNT_MIN && n <= COUNT_MAX ? n : COUNT_DEFAULT;
  }
  function setCount(n) { write(KEY_COUNT, n); }

  // ---------- 문장 풀 ----------
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  // 고른 주제의 문장을 먼저, 부족하면 다른 주제 문장으로 채움
  function pool(topics) {
    var primary = [], rest = [];
    TOPICS.forEach(function (t) {
      var bucket = topics.indexOf(t) !== -1 ? primary : rest;
      SENTENCES[t].forEach(function (s) { if (bucket.indexOf(s) === -1) bucket.push(s); });
    });
    return shuffle(primary).concat(shuffle(rest));
  }

  function setSession(data) {
    try { sessionStorage.setItem(KEY_SESSION, JSON.stringify(data)); } catch (e) { /* 무시 */ }
  }
  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(KEY_SESSION) || 'null'); } catch (e) { return null; }
  }

  return {
    TOPICS: TOPICS,
    RECOMMEND: RECOMMEND,
    COUNT_MIN: COUNT_MIN,
    COUNT_MAX: COUNT_MAX,
    getSaved: getSaved,
    isSaved: isSaved,
    addSaved: addSaved,
    removeSaved: removeSaved,
    toggleSaved: toggleSaved,
    getTopics: getTopics,
    setTopics: setTopics,
    getCount: getCount,
    setCount: setCount,
    pool: pool,
    setSession: setSession,
    getSession: getSession
  };
})();
