// 호흡 진행 (Figma 1:2823)
// 마시기/내쉬기: 단계 시간 동안 고양이 바깥 원이 채워짐 · 고양이는 마시기에 커지고, 멈추기에 고정, 내쉬기에 줄어듦
// 한 바퀴(마시기→멈추기→내쉬기→멈추기)마다 회차 +1, 정해진 횟수만큼 반복
(function () {
  const PATTERNS = {
    basic: { secs: [4, 2, 4, 2], rounds: 5 },
    sleep: { secs: [5, 4, 5, 4], rounds: 4 },
    slow:  { secs: [5, 5, 5],    rounds: 7 },
  };
  const PHASES = [
    { key: 'inhale', title: (s) => `${s}초 숨 마시고`, desc: '코로 천천히 숨을 들이마셔요.', voice: '숨을 마셔요' },
    { key: 'hold',   title: (s) => `${s}초 숨 멈추고`, desc: '숨을 잠시 머금어요.',          voice: '멈춰요' },
    { key: 'exhale', title: (s) => `${s}초 숨 내쉬고`, desc: '입으로 천천히 숨을 내쉬어요.', voice: '숨을 내쉬어요' },
    { key: 'rest',   title: (s) => `${s}초 숨 멈추고`, desc: '편안하게 잠시 쉬어요.',        voice: '멈춰요' },
  ];
  const CAT_MAX = 1.3;   // 마시기 끝 크기
  const DOT_X = [18, 105, 187, 269];   // 단계 점 중심 x (Figma 1:2847 기준)

  // 완료 후 이동할 화면: <main data-complete="…"> (긴급 호흡은 sos-check.html)
  const main = document.querySelector('main');
  const COMPLETE_URL = (main && main.dataset.complete) || 'activity-complete.html';
  const EMERGENCY = !!(main && main.classList.contains('breath--sos'));

  const params = new URLSearchParams(location.search);
  const patternKey = params.get('pattern');
  const customSecs = patternKey === 'custom' ? Breath.parseSecs(params.get('secs')) : null;
  // 호흡 설정하기로 만든 호흡의 반복 횟수 (1~10회, 없으면 기본 5회)
  const customRounds = Breath.parseRounds(params.get('rounds')) || Breath.ROUNDS_DEFAULT;
  const pattern = customSecs
    ? { secs: customSecs, rounds: customRounds }
    : PATTERNS[patternKey] || PATTERNS.basic;
  const settings = Breath.load();

  const $ = (id) => document.getElementById(id);
  const titleEl = $('guide-title');
  const descEl = $('guide-desc');
  const ring = $('ring-progress');
  const cat = $('cat');
  const roundNow = $('round-now');
  const steps = $('steps');
  const labels = steps.querySelectorAll('.breath-steps__labels li');
  const pauseBtn = $('pause-btn');
  const pauseLabel = $('pause-label');
  const muteBtn = $('mute-btn');

  $('round-total').textContent = pattern.rounds;
  if (pattern.secs.length < 4) steps.classList.add('breath-steps__inner--three');

  let round = 1;        // 현재 회차 (1부터)
  let phase = 0;        // 현재 단계 index
  let elapsed = 0;      // 현재 단계 경과(초)
  let paused = false;   // 사용자가 일시정지했는지
  let blocked = false;  // 시트/모달이 열려 멈춘 상태
  let done = false;
  let last = null;
  let muted = false;
  let wakeLock = null;

  // 홈에서 '이어서 하기'로 들어오면 멈췄던 회차·단계부터 (긴급 호흡은 저장 안 함)
  const resume = EMERGENCY ? null : ActivityRecord.resuming('breathing');
  if (resume && resume.pattern === pattern.secs.join('-')) {
    round = Math.min(Math.max(resume.round || 1, 1), pattern.rounds);
    phase = Math.min(Math.max(resume.phase || 0, 0), pattern.secs.length - 1);
    elapsed = 0;   // 멈춘 단계의 처음부터
  }

  // 진행 상태 저장 (그만두거나 앱을 닫아도 홈에서 이어서 할 수 있게)
  function saveProgress() {
    if (EMERGENCY || done || (round === 1 && phase === 0 && elapsed < 2)) return;
    ActivityRecord.saveProgress({
      type: 'breathing', href: ActivityRecord.here(),
      pattern: pattern.secs.join('-'), rounds: pattern.rounds, round: round, phase: phase,
    });
  }
  window.addEventListener('pagehide', saveProgress);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveProgress(); });

  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function render() {
    const dur = pattern.secs[phase];
    const p = Math.min(elapsed / dur, 1);
    const key = PHASES[phase].key;

    // 바깥 원: 마시기/내쉬기 동안 0 → 100% 채움, 멈추기 동안은 가득 찬 채 유지
    const fill = done ? 100 : (key === 'inhale' || key === 'exhale') ? p * 100 : 100;
    ring.style.strokeDasharray = `${fill} 100`;
    ring.style.opacity = fill > 0.3 ? 1 : 0;

    // 고양이 크기
    let scale = 1;
    if (key === 'inhale') scale = 1 + (CAT_MAX - 1) * easeInOut(p);
    else if (key === 'hold') scale = CAT_MAX;
    else if (key === 'exhale') scale = CAT_MAX - (CAT_MAX - 1) * easeInOut(p);
    if (done) scale = 1;
    cat.style.transform = `scale(${scale})`;
  }

  function showPhase() {
    const def = PHASES[phase];
    titleEl.textContent = def.title(pattern.secs[phase]);
    descEl.textContent = def.desc;
    steps.style.setProperty('--dot-x', DOT_X[phase] + 'px');
    labels.forEach((li, i) => li.classList.toggle('is-active', i === phase));
    roundNow.textContent = round;
  }

  function cue() {
    if (settings.vibrate && navigator.vibrate) {
      try { navigator.vibrate(60); } catch (e) { /* 미지원 */ }
    }
    if (settings.voice && !muted && 'speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(PHASES[phase].voice);
        u.lang = 'ko-KR';
        speechSynthesis.speak(u);
      } catch (e) { /* 미지원 */ }
    }
  }

  function finish() {
    done = true;
    elapsed = 0;
    phase = 0;
    titleEl.textContent = '잘 하셨어요!';
    descEl.textContent = '호흡을 모두 마쳤어요.';
    roundNow.textContent = pattern.rounds;
    labels.forEach((li) => li.classList.remove('is-active'));
    steps.classList.add('is-done');
    pauseBtn.disabled = true;
    releaseWake();
    render();
    ActivityRecord.setLast({
      type: 'breathing',
      pattern: pattern.secs.join('-'),
      seconds: pattern.secs.reduce((t, x) => t + x, 0) * pattern.rounds,
      rounds: pattern.rounds,
      emergency: EMERGENCY,
    });
    // 잠깐 완료 문구를 보여준 뒤 활동 완료 화면으로
    setTimeout(() => { location.href = COMPLETE_URL; }, 1500);
  }

  function advance() {
    elapsed -= pattern.secs[phase];
    phase += 1;
    if (phase >= pattern.secs.length) {
      phase = 0;
      if (round >= pattern.rounds) return finish();
      round += 1;                      // 한 바퀴 끝 → 회차 +1
    }
    showPhase();
    cue();
    saveProgress();
  }

  function tick(now) {
    if (last === null) last = now;
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (!paused && !blocked && !done) {
      elapsed += dt;
      while (!done && elapsed >= pattern.secs[phase]) advance();
      render();
    }
    requestAnimationFrame(tick);
  }

  function setPaused(value) {
    paused = value;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseLabel.textContent = paused ? '계속하기' : '일시정지';
    if (paused && 'speechSynthesis' in window) speechSynthesis.cancel();
  }

  function restart() {
    round = 1;
    phase = 0;
    elapsed = 0;
    done = false;
    steps.classList.remove('is-done');
    pauseBtn.disabled = false;
    setPaused(false);
    requestWake();
    showPhase();
    render();
    cue();
  }

  // 화면 항상 켜기
  async function requestWake() {
    if (!settings.keepAwake || wakeLock || !('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  }
  function releaseWake() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !done) requestWake();
  });

  // 컨트롤
  $('restart-btn').addEventListener('click', restart);
  pauseBtn.addEventListener('click', () => setPaused(!paused));
  if (muteBtn) muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.setAttribute('aria-pressed', String(!muted));   // pressed = 소리 켜짐
    if (muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  });

  // 그만하기 → 확인 모달 (계속하기: 닫고 이어서 진행)
  const stopBtn = $('stop-btn');
  const stopModal = Breath.overlay($('stop-overlay'), {
    trigger: stopBtn,
    onClose: () => { blocked = false; },
  });
  stopBtn.addEventListener('click', () => {
    if (done) { location.href = COMPLETE_URL; return; }
    blocked = true;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    saveProgress();
    stopModal.open();
  });

  showPhase();
  render();
  requestWake();
  requestAnimationFrame(tick);
})();
