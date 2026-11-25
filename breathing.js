// 호흡 진입 (Figma 1:3117): 호흡법 선택 + 호흡 설정하기 바텀시트(2058:17190)
(function () {
  const cards = document.querySelectorAll('.pattern-card[role="radio"]');
  const startBtn = document.getElementById('start-btn');
  const addBtn = document.getElementById('add-btn');
  const addOverlay = document.getElementById('add-overlay');

  function select(card) {
    cards.forEach((c) => {
      const on = c === card;
      c.setAttribute('aria-checked', String(on));
      c.tabIndex = on ? 0 : -1;
    });
    startBtn.href = 'breathing-session.html?pattern=' + card.dataset.pattern;
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

  // ---------- 단계별 초 휠 피커 (위아래 스크롤, 가운데 값이 선택됨) ----------
  const MIN = 1;
  const MAX = 10;
  const ITEM_H = 42;   // CSS .breath-picker__item 높이와 같아야 함

  function makeWheel(wheel) {
    const items = [];
    for (let v = MIN; v <= MAX; v++) {
      const el = document.createElement('span');
      el.className = 'breath-picker__item';
      el.textContent = v;
      el.addEventListener('click', () => set(v, true));
      wheel.appendChild(el);
      items.push(el);
    }
    wheel.setAttribute('aria-valuemin', MIN);
    wheel.setAttribute('aria-valuemax', MAX);

    let value = MIN;
    let raf = 0;

    function mark(v) {
      value = v;
      items.forEach((el, i) => el.classList.toggle('is-selected', i === v - MIN));
      wheel.setAttribute('aria-valuenow', v);
      wheel.setAttribute('aria-valuetext', v + '초');
    }

    function set(v, smooth) {
      v = Math.max(MIN, Math.min(MAX, v));
      mark(v);
      wheel.scrollTo({ top: (v - MIN) * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
    }

    wheel.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const v = MIN + Math.round(wheel.scrollTop / ITEM_H);
        if (v !== value) mark(Math.max(MIN, Math.min(MAX, v)));
      });
    });

    wheel.addEventListener('keydown', (e) => {
      const step = { ArrowUp: -1, ArrowDown: 1 }[e.key];
      if (e.key === 'Home') { e.preventDefault(); set(MIN, true); return; }
      if (e.key === 'End') { e.preventDefault(); set(MAX, true); return; }
      if (!step) return;
      e.preventDefault();
      set(value + step, true);
    });

    return { set, get value() { return value; } };
  }

  const wheels = Array.from(addOverlay.querySelectorAll('.breath-picker__wheel')).map(makeWheel);

  // 호흡 설정하기 → 바텀시트
  const sheet = Breath.overlay(addOverlay, { trigger: addBtn });
  function openSheet(secs) {
    Breath.bindSwitches(addOverlay, Breath.load());
    sheet.open();
    // 시트가 보인 뒤에야 스크롤 위치를 잡을 수 있음
    wheels.forEach((w, i) => w.set(secs[i], false));
  }
  addBtn.addEventListener('click', () => openSheet(Breath.loadCustom()));

  // 호흡 진행 중 설정 → '호흡 패턴'으로 들어온 경우: 진행 중이던 패턴을 선택하고 그 값으로 팝업 열기
  // (breathing.html?pattern=sleep&edit=1 / ?pattern=custom&secs=6-2-4-1&edit=1)
  const params = new URLSearchParams(location.search);
  const fromKey = params.get('pattern');
  const fromCard = Array.from(cards).find((c) => c.dataset.pattern === fromKey);
  if (fromCard) select(fromCard);
  if (params.get('edit') === '1') {
    let secs = fromKey === 'custom' ? Breath.parseSecs(params.get('secs')) : null;
    if (!secs && fromCard) {
      // 카드 표기 "5 - 4 - 5 - 4 • 4회"에서 초 읽기 (3단계 패턴은 마지막 멈추기를 저장값으로 채움)
      const nums = fromCard.querySelector('.pattern-card__meta').textContent.split('•')[0].split('-').map(Number);
      secs = nums.concat(Breath.loadCustom().slice(nums.length)).slice(0, 4);
    }
    openSheet(secs || Breath.loadCustom());
  }

  // 적용하기 → 설정 저장 후 설정한 호흡으로 바로 진행
  addOverlay.querySelector('[data-apply]').addEventListener('click', () => {
    Breath.save(Breath.readSwitches(addOverlay, Breath.load()));
    const secs = wheels.map((w) => w.value);
    Breath.saveCustom(secs);
    location.href = 'breathing-session.html?pattern=custom&secs=' + secs.join('-');
  });
})();
