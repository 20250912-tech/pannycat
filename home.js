// 홈 — 레벨업 기준 오버레이 (Figma 프로토타입: 1:2391 클릭 → 1597:12008 오버레이 열기, 1597:12015 클릭 → 닫기)
// 전환 애니메이션 없음(즉시), 배경 클릭으로는 닫히지 않음(overlayBackgroundInteraction: NONE)
(function () {
  const trigger = document.querySelector('.home__info');
  const overlay = document.getElementById('levelup-overlay');
  const dialog = document.getElementById('levelup-dialog');
  const closeBtn = overlay.querySelector('.levelup__close');
  const scroller = document.querySelector('.home__scroll');

  function open() {
    overlay.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    scroller.inert = true;
    document.querySelector('.tabbar').inert = true;
    dialog.focus();
  }

  function close() {
    overlay.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    scroller.inert = false;
    document.querySelector('.tabbar').inert = false;
    trigger.focus();
  }

  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });
})();
