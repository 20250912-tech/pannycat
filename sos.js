// 긴급화면 (Figma 1:1776)
// - 10초 카운트다운 후 긴급화면_호흡으로 자동 이동
// - 즉시 실행: 바로 이동
// - 밀어서 중단: 손잡이를 끝까지 밀면 홈으로 (미는 동안은 카운트다운 멈춤)
(function () {
  const NEXT = 'sos-breathing.html';
  const HOME = 'home.html';
  const TOTAL = 10;
  const DONE_RATIO = 0.85;   // 이만큼 밀면 중단

  const countEl = document.getElementById('sos-count');
  const slide = document.getElementById('sos-slide');
  const knob = document.getElementById('sos-knob');
  const text = slide.querySelector('.sos-slide__text');

  let left = TOTAL;          // 남은 시간(초)
  let last = null;
  let dragging = false;
  let leaving = false;

  function go(url) {
    if (leaving) return;
    leaving = true;
    location.href = url;
  }

  // ---------- 카운트다운 (실제 시간 기준, 미는 동안은 멈춤) ----------
  function tick() {
    if (leaving) return;
    const now = Date.now();
    if (last === null) last = now;
    const dt = (now - last) / 1000;
    last = now;
    if (!dragging) {
      left -= dt;
      countEl.textContent = Math.max(Math.ceil(left), 0);
      if (left <= 0) go(NEXT);
    }
  }

  // ---------- 밀어서 중단 ----------
  let startX = 0;
  let pos = 0;

  function maxX() {
    const pad = knob.offsetLeft;   // 왼쪽 여백만큼 오른쪽에도 남김
    return slide.clientWidth - knob.offsetWidth - pad * 2;
  }

  function setPos(x, animate) {
    pos = Math.min(Math.max(x, 0), maxX());
    const ratio = maxX() ? pos / maxX() : 0;
    knob.style.transition = animate ? 'transform 0.25s ease' : 'none';
    knob.style.transform = `translateX(${pos}px)`;
    text.style.opacity = String(1 - ratio);
    knob.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    return ratio;
  }

  function release() {
    if (!dragging) return;
    dragging = false;
    if (pos / maxX() >= DONE_RATIO) {
      setPos(maxX(), true);
      go(HOME);
    } else {
      setPos(0, true);
    }
  }

  knob.addEventListener('pointerdown', (e) => {
    if (leaving) return;
    dragging = true;
    startX = e.clientX - pos;
    knob.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  knob.addEventListener('pointermove', (e) => {
    if (dragging) setPos(e.clientX - startX, false);
  });
  knob.addEventListener('pointerup', release);
  knob.addEventListener('pointercancel', release);

  // 키보드: 오른쪽 방향키/End 로 밀기
  knob.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'End') {
      e.preventDefault();
      const r = setPos(e.key === 'End' ? maxX() : pos + maxX() / 4, true);
      if (r >= DONE_RATIO) go(HOME);
    } else if (e.key === 'ArrowLeft' || e.key === 'Home') {
      e.preventDefault();
      setPos(e.key === 'Home' ? 0 : pos - maxX() / 4, true);
    }
  });

  // 뒤로 가기로 이 화면에 다시 돌아온 경우 처음부터 다시 시작
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    left = TOTAL;
    last = null;
    countEl.textContent = TOTAL;
    setPos(0, false);
  });

  setInterval(tick, 100);
})();
