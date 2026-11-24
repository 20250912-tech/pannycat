// 확언 진행 (읽기 · 탭하기 · 쓰기)
// 읽기: 마이크로 소리 내어 읽으면 읽은 만큼 진하게, 패니 음성 듣기(TTS)
// 탭하기: 구절을 순서대로 누르기 / 쓰기: 따라 적으면 맞게 적은 만큼 굵게
// 문장 하나를 끝내면 다음 문장으로, 설정한 문장 수를 모두 마치면 활동 완료로 이동
(function () {
  var S = AffirmationStore;
  var $ = function (id) { return document.getElementById(id); };
  var root = $('session');

  var MODE_LABEL = { read: '읽기', tap: '탭하기', write: '쓰기' };
  var GUIDE = {
    read: '나를 위한 문장을<br />천천히 읽어보세요.',
    tap: '한 구절씩 눌러<br />나를 위한 문장을 완성해 보세요.',
    write: '나를 위한 문장을<br />한 글자씩 천천히 따라 적어보세요.'
  };
  var NODE = { read: '92:5605', tap: '92:5647', write: '92:5577' };

  // ---------- 세션 ----------
  var session = S.getSession();
  if (!session || !session.sentences || !session.sentences.length) {
    // 직접 들어온 경우: 저장된 주제(없으면 추천 주제)로 구성
    var topics = S.getTopics().length ? S.getTopics() : S.RECOMMEND.topics;
    session = { sentences: S.pool(topics).slice(0, S.getCount()) };
  }
  var sentences = session.sentences;
  var total = sentences.length;
  var index = 0;
  var mode = 'read';
  var doneBy = [];                    // 문장별로 완료한 방식
  var startedAt = Date.now();
  var finishing = false;

  // ---------- 공용 ----------
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1600);
  }

  // 공백·문장부호를 뺀 글자 목록 (비교용)
  function isMark(ch) { return /[\s.,!?·~'"“”‘’…]/.test(ch); }
  function letters(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) if (!isMark(str[i])) out.push(str[i]);
    return out;
  }

  // 글자 n개(공백·부호 제외)만큼을 진하게 표시
  function paint(el, text, n) {
    var cut = 0, seen = 0;
    if (n >= letters(text).length) cut = text.length;
    else {
      while (cut < text.length && seen < n) { if (!isMark(text[cut])) seen++; cut++; }
    }
    el.innerHTML = '';
    var on = document.createElement('span');
    on.className = 'is-on';
    on.textContent = text.slice(0, cut);
    var off = document.createElement('span');
    off.textContent = text.slice(cut);
    el.appendChild(on);
    el.appendChild(off);
    el.setAttribute('aria-label', text.replace(/\n/g, ' '));
  }

  function current() { return sentences[index]; }

  // ---------- 진행 ----------
  function renderCount() {
    document.querySelectorAll('.aff-session__now').forEach(function (el) { el.textContent = index + 1; });
    document.querySelectorAll('.aff-session__total').forEach(function (el) { el.textContent = total; });
    $('prev-btn').disabled = index === 0;
    $('next-btn').textContent = index === total - 1 ? '완료하기' : '다음으로';
  }

  function render() {
    stopAll();
    renderCount();
    renderRead();
    renderTap();
    renderWrite();
  }

  function complete() {
    if (doneBy[index]) return;
    doneBy[index] = mode;
    stopAll();
    toast(index === total - 1 ? '모든 문장을 마쳤어요!' : '잘했어요! 다음 문장으로 넘어갈게요.');
    setTimeout(function () { go(1); }, 900);
  }

  function go(d) {
    if (finishing) return;
    var next = index + d;
    if (next < 0) return;
    if (next >= total) { finish(); return; }
    index = next;
    render();
  }

  function finish() {
    finishing = true;
    stopAll();
    // 가장 많이 쓴 방식 (없으면 지금 방식)
    var tally = {};
    doneBy.forEach(function (m) { if (m) tally[m] = (tally[m] || 0) + 1; });
    var method = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; })[0] || mode;
    ActivityRecord.setLast({
      type: 'affirmation',
      count: total,
      done: doneBy.filter(Boolean).length,
      method: MODE_LABEL[method],
      seconds: Math.round((Date.now() - startedAt) / 1000),
      text: sentences[0].replace(/\n/g, ' ')
    });
    location.href = 'activity-complete.html';
  }

  $('prev-btn').addEventListener('click', function () { go(-1); });
  $('next-btn').addEventListener('click', function () { go(1); });

  // ---------- 탭 전환 ----------
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.aff-seg [role="tab"]'));
  function setMode(m) {
    mode = m;
    root.dataset.mode = m;
    root.dataset.nodeId = NODE[m];
    tabs.forEach(function (t) {
      var on = t.dataset.mode === m;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('panel-' + t.dataset.mode).hidden = !on;
    });
    $('guide').innerHTML = GUIDE[m];
    render();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { setMode(t.dataset.mode); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      setMode(n.dataset.mode);
      n.focus();
    });
  });

  // ---------- 읽기: 음성 듣기 (TTS) ----------
  var listenBtn = $('listen-btn');
  function stopSpeaking() {
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) { /* 미지원 */ } }
    listenBtn.setAttribute('aria-pressed', 'false');
    $('listen-label').textContent = '패니 음성 듣기';
  }
  listenBtn.addEventListener('click', function () {
    if (!('speechSynthesis' in window)) { toast('이 기기에서는 음성 듣기를 지원하지 않아요.'); return; }
    if (listenBtn.getAttribute('aria-pressed') === 'true') { stopSpeaking(); return; }
    stopListening();
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(current().replace(/\n/g, ' '));
      u.lang = 'ko-KR';
      u.rate = 0.85;
      u.onend = u.onerror = stopSpeaking;
      speechSynthesis.speak(u);
      listenBtn.setAttribute('aria-pressed', 'true');
      $('listen-label').textContent = '듣는 중… 멈추기';
    } catch (e) { stopSpeaking(); }
  });

  // ---------- 읽기: 마이크로 소리 입력 ----------
  var micBtn = $('mic-btn');
  var rec = null;
  var readCount = 0;                  // 읽은 글자 수 (되돌아가지 않음)

  // 들은 말을 문장 앞에서부터 맞춰 봄 (한두 글자 틀려도 이어서 인정)
  function matchSpoken(spoken) {
    var target = letters(current());
    var heard = letters(spoken);
    var j = 0;
    heard.forEach(function (ch) {
      for (var k = j; k < Math.min(j + 3, target.length); k++) {
        if (target[k] === ch) { j = k + 1; return; }
      }
    });
    return j;
  }

  function renderRead() {
    readCount = 0;
    paint($('read-text'), current(), 0);
  }

  function setMic(on) {
    micBtn.setAttribute('aria-pressed', String(on));
    micBtn.setAttribute('aria-label', on ? '소리 입력 멈추기' : '소리 내어 읽기 시작');
    micBtn.classList.toggle('is-listening', on);
  }

  function stopListening() {
    if (rec) { try { rec.abort(); } catch (e) { /* 무시 */ } rec = null; }
    setMic(false);
  }

  micBtn.addEventListener('click', function () {
    if (micBtn.getAttribute('aria-pressed') === 'true') { stopListening(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('이 브라우저에서는 음성 입력을 지원하지 않아요.'); return; }
    stopSpeaking();
    rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = true;
    var text = current();
    rec.onresult = function (e) {
      var said = '';
      for (var i = 0; i < e.results.length; i++) said += e.results[i][0].transcript + ' ';
      var n = matchSpoken(said);
      if (n > readCount) {
        readCount = n;
        paint($('read-text'), text, n);
      }
      if (readCount >= letters(text).length) complete();
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('마이크 사용을 허용해 주세요.');
      else if (e.error === 'no-speech') toast('소리가 들리지 않았어요. 다시 눌러 읽어보세요.');
      stopListening();
    };
    rec.onend = function () { if (rec) { rec = null; setMic(false); } };
    try {
      rec.start();
      setMic(true);
    } catch (err) {
      rec = null;
      toast('음성 입력을 시작하지 못했어요.');
    }
  });

  // ---------- 탭하기 ----------
  // 단어 두 개씩 한 구절 (예: 모든 것을 / 지금 당장 / 해결하지 않아도 / 괜찮아요.)
  function phrases(text) {
    var words = text.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
    var out = [];
    for (var i = 0; i < words.length; i += 2) {
      // 마지막 한 단어가 남으면 앞 구절이 세 단어가 되지 않도록 그대로 둠
      out.push(words.slice(i, i + 2).join(' '));
    }
    return out;
  }

  function renderTap() {
    var box = $('tap-chips');
    box.innerHTML = '';
    phrases(current()).forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip aff-chip';
      b.textContent = p;
      b.setAttribute('aria-pressed', 'false');
      b.dataset.order = i;
      box.appendChild(b);
    });
  }

  $('tap-chips').addEventListener('click', function (e) {
    var b = e.target.closest('.aff-chip');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    var next = $('tap-chips').querySelector('.aff-chip[aria-pressed="false"]');
    if (b !== next) {
      // 순서가 아니면 살짝 흔들어 알려줌
      b.classList.remove('is-wrong');
      void b.offsetWidth;
      b.classList.add('is-wrong');
      return;
    }
    b.setAttribute('aria-pressed', 'true');
    if (!$('tap-chips').querySelector('.aff-chip[aria-pressed="false"]')) complete();
  });

  // ---------- 쓰기 ----------
  var input = $('write-input');

  function typedCount() {
    var target = letters(current());
    var typed = letters(input.value);
    var n = 0;
    while (n < typed.length && n < target.length && typed[n] === target[n]) n++;
    return n;
  }

  function renderWrite() {
    input.value = '';
    paint($('write-text'), current(), 0);
  }

  // 맞게 적은 만큼 굵게, 끝까지 맞으면 완료 (마지막 글자 조합이 끝나면 바로)
  function checkWrite() {
    var n = typedCount();
    paint($('write-text'), current(), n);
    if (n >= letters(current()).length) {
      input.blur();
      complete();
    }
  }
  input.addEventListener('input', checkWrite);
  input.addEventListener('compositionend', checkWrite);

  $('write-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (typedCount() >= letters(current()).length) complete();
    else toast('문장을 끝까지 따라 적어보세요.');
  });

  // ---------- 그만하기 ----------
  function stopAll() { stopSpeaking(); stopListening(); }
  var closeBtn = $('close-btn');
  var stopModal = Breath.overlay($('stop-overlay'), { trigger: closeBtn });
  closeBtn.addEventListener('click', function () { stopAll(); stopModal.open(); });
  window.addEventListener('pagehide', stopAll);

  setMode('read');
})();
