// 바디스캔 진행 (Figma 1:2702): 2분 동안 바 이동 · 구간별 자막/음성 안내
// 소리·자막 on/off, 다시하기·일시정지·그만하기는 호흡 진행과 동일하게 동작
(function () {
  var TOTAL = 120;   // 초
  var SCRIPT = [
    { at: 0,   text: '편안한 자세로 앉거나 누워<br />천천히 숨을 쉬어 보세요' },
    { at: 12,  text: '발끝에 주의를 기울여 보세요.<br />따뜻함이나 무게감이 느껴지나요?' },
    { at: 26,  text: '종아리와 무릎, 허벅지로<br />천천히 주의를 옮겨 보세요' },
    { at: 40,  text: '배가 숨에 따라 부풀고 꺼지는<br />움직임을 느껴 보세요' },
    { at: 54,  text: '가슴과 심장이 뛰는 느낌에<br />가만히 머물러 보세요' },
    { at: 68,  text: '어깨와 팔, 손끝까지<br />힘을 툭 내려놓아 보세요' },
    { at: 82,  text: '목과 턱, 이마의 긴장을<br />부드럽게 풀어 보세요' },
    { at: 96,  text: '머리끝부터 발끝까지<br />몸 전체를 가볍게 살펴보세요' },
    { at: 108, text: '내 몸과 마음은 안전하고,<br />나는 괜찮다라고 스스로에게 말해보세요' }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var root = $('scan');
  var captionText = $('caption-text');
  var bar = $('bar');
  var thumb = $('bar-thumb');
  var timeNow = $('time-now');
  var pauseBtn = $('pause-btn');
  var pauseLabel = $('pause-label');
  var soundBtn = $('sound-btn');
  var captionBtn = $('caption-btn');

  var elapsed = 0, line = -1, last = null;
  var paused = false, blocked = false, done = false;
  var sound = true;

  // 홈에서 '이어서 하기'로 들어오면 멈췄던 시간부터
  var resume = ActivityRecord.resuming('bodyscan');
  if (resume) elapsed = Math.min(Math.max(resume.elapsed || 0, 0), TOTAL - 1);

  // 진행 상태 저장 (3초 안에 나가면 저장 안 함)
  var savedAt = elapsed;
  function saveProgress() {
    if (done || elapsed < 3) return;
    savedAt = elapsed;
    ActivityRecord.saveProgress({ type: 'bodyscan', href: ActivityRecord.here(), elapsed: Math.floor(elapsed), total: TOTAL });
  }
  window.addEventListener('pagehide', saveProgress);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') saveProgress(); });

  function fmt(sec) {
    sec = Math.floor(sec);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  function speak(html) {
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      if (!sound) return;
      var u = new SpeechSynthesisUtterance(html.replace(/<br\s*\/?>/g, ' '));
      u.lang = 'ko-KR';
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* 미지원 */ }
  }
  function hush() {
    if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) { /* 미지원 */ } }
  }

  function render() {
    var p = Math.min(elapsed / TOTAL, 1);
    root.style.setProperty('--scan-p', p);
    timeNow.textContent = fmt(elapsed);
    bar.setAttribute('aria-valuenow', Math.floor(elapsed));
    bar.setAttribute('aria-valuetext', fmt(elapsed) + ' / 2:00');

    var idx = 0;
    for (var i = 0; i < SCRIPT.length; i++) if (elapsed >= SCRIPT[i].at) idx = i;
    if (idx !== line) {
      line = idx;
      captionText.innerHTML = SCRIPT[idx].text;
      speak(SCRIPT[idx].text);
    }
  }

  function finish() {
    done = true;
    elapsed = TOTAL;
    pauseBtn.disabled = true;
    root.classList.add('is-paused');
    render();
    ActivityRecord.setLast({ type: 'bodyscan', seconds: TOTAL });
    setTimeout(function () { location.href = 'activity-complete.html'; }, 1500);
  }

  function tick(now) {
    if (last === null) last = now;
    var dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (!paused && !blocked && !done) {
      elapsed += dt;
      if (elapsed >= TOTAL) finish();
      else {
        render();
        if (elapsed - savedAt >= 5) saveProgress();   // 앱이 갑자기 꺼져도 5초 단위로 남김
      }
    }
    requestAnimationFrame(tick);
  }

  function setPaused(value) {
    paused = value;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseLabel.textContent = paused ? '계속하기' : '일시정지';
    root.classList.toggle('is-paused', paused);
    if (paused) hush();
  }

  function restart() {
    elapsed = 0;
    line = -1;
    done = false;
    pauseBtn.disabled = false;
    setPaused(false);
    render();
  }

  // 소리 on/off
  soundBtn.addEventListener('click', function () {
    sound = !sound;
    soundBtn.setAttribute('aria-pressed', String(sound));
    if (sound && !paused && !blocked && !done) speak(SCRIPT[line].text);
    else hush();
  });

  // 자막 on/off: off면 상단 자막 박스 숨김
  captionBtn.addEventListener('click', function () {
    var on = captionBtn.getAttribute('aria-pressed') !== 'true';
    captionBtn.setAttribute('aria-pressed', String(on));
    root.classList.toggle('is-caption-off', !on);
  });

  // 컨트롤
  $('restart-btn').addEventListener('click', restart);
  pauseBtn.addEventListener('click', function () { setPaused(!paused); });

  // 그만하기 → 확인 모달 (계속하기: 닫고 이어서 진행)
  var stopBtn = $('stop-btn');
  var stopModal = Breath.overlay($('stop-overlay'), {
    trigger: stopBtn,
    onClose: function () {
      blocked = false;
      root.classList.toggle('is-paused', paused);
      if (!paused && !done) speak(SCRIPT[line].text);
    }
  });
  stopBtn.addEventListener('click', function () {
    if (done) { location.href = 'activity-complete.html'; return; }
    blocked = true;
    root.classList.add('is-paused');
    hush();
    saveProgress();
    stopModal.open();
  });

  render();
  requestAnimationFrame(tick);
})();
