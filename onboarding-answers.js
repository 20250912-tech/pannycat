// 온보딩 질문 화면 공용 — <main data-question="help|trigger|coping|anxiety|feeling">
// · 다음으로: 답을 하나도 고르지 않으면 이동하지 않고 안내, 고르면 답변 저장 후 이동
// · 건너뛰기: 이 질문부터 끝까지 빈 답변(아무것도 선택 안 함)으로 저장 후 이동
// · 저장된 답변은 마이페이지 → 응답 재설정(reset.js)에서 보고 고칠 수 있음
// · 이전으로 돌아와도 고른 답이 그대로 보이도록 저장된 답을 되살림
(function () {
  var main = document.querySelector('main[data-question]');
  if (!main || !window.Answers) return;
  var key = main.dataset.question;
  var nextBtn = document.querySelector('.btn-row .btn-primary');
  var skipLink = document.querySelector('.skip-link');
  var all = Answers.load();
  var saved = all[key] || { values: [], custom: '' };

  // ---------- 안내 토스트 ----------
  var toastEl = document.createElement('p');
  toastEl.className = 'saved__toast onboarding__toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  toastEl.hidden = true;
  main.appendChild(toastEl);
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2000);
  }

  // ---------- 현재 답 읽기 · 되살리기 ----------
  var read, hasAnswer;

  if (key === 'anxiety') {
    // 불안 정도 슬라이더: 직접 눌러서(또는 방향키로) 정해야 답한 것으로 봄
    var slider = document.getElementById('level-slider');
    var answered = saved.values.length > 0;
    var control = AnxietySlider.init({
      slider: slider,
      panny: document.getElementById('anxiety-panny'),
      valueEl: document.getElementById('level-value'),
      labelEl: document.getElementById('anxiety-label'),
      initial: answered ? Number(saved.values[0]) : 1
    });
    function markAnswered() { answered = true; refresh(); }
    slider.addEventListener('pointerdown', markAnswered);
    slider.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End'].indexOf(e.key) !== -1) markAnswered();
    });
    read = function () { return { values: [String(control.get())], custom: '' }; };
    hasAnswer = function () { return answered; };
  } else {
    var group = document.querySelector('.chips');
    var chips = function () {
      return Array.prototype.slice.call(group.querySelectorAll('.chip[aria-pressed][data-value]'));
    };
    // 저장된 보기 · 직접 작성한 답 되살리기
    chips().forEach(function (c) {
      if (saved.values.indexOf(c.dataset.value) !== -1) c.setAttribute('aria-pressed', 'true');
    });
    if (saved.custom && window.OnboardingChips) {
      saved.custom.split(', ').filter(Boolean).forEach(function (t) { OnboardingChips.addCustom(t); });
    }
    read = function () {
      var values = chips()
        .filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
        .map(function (c) { return c.dataset.value; });
      var customs = Array.prototype.slice.call(group.querySelectorAll('.chip--custom__text'))
        .map(function (el) { return el.textContent.trim(); })
        .filter(Boolean);
      return { values: values, custom: customs.join(', ') };
    };
    hasAnswer = function () { var a = read(); return a.values.length > 0 || !!a.custom; };
    // 보기를 누르거나 직접 작성 답을 추가·삭제하면 버튼 상태 갱신
    new MutationObserver(refresh).observe(group, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed'] });
  }

  // 답을 고르기 전에는 다음으로 버튼을 흐리게 (눌러도 이동 안 하고 안내)
  function refresh() {
    nextBtn.classList.toggle('is-incomplete', !hasAnswer());
    nextBtn.setAttribute('aria-disabled', String(!hasAnswer()));
  }

  nextBtn.addEventListener('click', function (e) {
    if (!hasAnswer()) {
      e.preventDefault();
      toast(key === 'anxiety' ? '지금 불안 정도를 표시해 주세요.' : '답변을 선택해 주세요.');
      return;
    }
    all = Answers.load();
    all[key] = read();
    Answers.save(all);
  });

  // 건너뛰기 → 이 질문부터 마지막 질문까지 아무것도 고르지 않은 상태로 저장
  skipLink.addEventListener('click', function () {
    all = Answers.load();
    Answers.ORDER.slice(Answers.ORDER.indexOf(key)).forEach(function (k) {
      all[k] = { values: [], custom: '' };
    });
    Answers.save(all);
  });

  refresh();
})();
