// 호흡 진입 (Figma 1:3117): 호흡법 선택 + 추가하기 바텀시트(15:5946)
(function () {
  const cards = document.querySelectorAll('.pattern-card[role="radio"]');
  const startBtn = document.getElementById('start-btn');
  const addBtn = document.getElementById('add-btn');
  const addOverlay = document.getElementById('add-overlay');
  const sheetTitle = document.getElementById('add-title');

  function select(card) {
    cards.forEach((c) => {
      const on = c === card;
      c.setAttribute('aria-checked', String(on));
      c.tabIndex = on ? 0 : -1;
    });
    startBtn.href = 'breathing-session.html?pattern=' + card.dataset.pattern;
    sheetTitle.textContent = card.querySelector('.pattern-card__name').textContent;
  }

  cards.forEach((card, i) => {
    card.addEventListener('click', () => select(card));
    card.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const next = cards[(i + dir + cards.length) % cards.length];
      select(next);
      next.focus();
    });
  });
  select(document.querySelector('.pattern-card[aria-checked="true"]'));

  // 추가하기 → 바텀시트
  const sheet = Breath.overlay(addOverlay, { trigger: addBtn });
  addBtn.addEventListener('click', () => {
    Breath.bindSwitches(addOverlay, Breath.load());
    sheet.open();
  });
  addOverlay.querySelector('[data-apply]').addEventListener('click', () => {
    Breath.save(Breath.readSwitches(addOverlay, Breath.load()));
    sheet.close('apply');
  });
})();
