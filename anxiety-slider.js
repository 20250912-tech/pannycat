// 불안 정도 드래그 바 + 고양이 변화 (온보딩4 · 활동 완료 공용)
// 위치(pos) 1 = 왼쪽(매우 불안) … 5 = 오른쪽(매우 편안). 고양이는 pos에 맞춰 바뀜.
// options.display(pos) 로 카드에 보이는 숫자를 바꿀 수 있음 (활동 완료: 5 → 1 역순)
window.AnxietySlider = (function () {
  var LABELS = ['매우 불안해요', '불안해요', '차분해요', '편안해요', '매우 편안해요'];
  var CAT_ALT = [
    '식은땀을 흘리며 불안해하는 검은 고양이 패니',
    '식은땀을 흘리며 걱정하는 검은 고양이 패니',
    '담담한 표정의 검은 고양이 패니',
    '눈을 감고 편안해하는 검은 고양이 패니',
    '꽃과 함께 활짝 웃는 검은 고양이 패니'
  ];

  function init(opts) {
    var slider = opts.slider;
    var panny = opts.panny;
    var display = opts.display || function (pos) { return pos; };
    var value = 1;

    function set(v) {
      value = Math.min(5, Math.max(1, v));
      var shown = display(value);
      slider.style.setProperty('--pos', (value - 1) / 4);
      panny.dataset.level = value;
      panny.setAttribute('aria-label', CAT_ALT[value - 1]);
      opts.valueEl.textContent = shown;
      opts.labelEl.textContent = LABELS[value - 1];
      slider.setAttribute('aria-valuenow', shown);
      slider.setAttribute('aria-valuetext', shown + ', ' + LABELS[value - 1]);
      if (opts.onChange) opts.onChange(value, shown);
    }

    function fromPointer(e) {
      var r = slider.getBoundingClientRect();
      var x = e.clientX - r.left, best = 1, bestD = Infinity;
      for (var v = 1; v <= 5; v++) {   // 각 단계의 썸 중심(막대 끝 - 15.5, 1단계는 15)에 가장 가까운 값
        var c = Math.max(15, r.width * (v - 1) / 4 - 15.5);
        if (Math.abs(x - c) < bestD) { bestD = Math.abs(x - c); best = v; }
      }
      set(best);
    }

    slider.addEventListener('pointerdown', function (e) {
      slider.setPointerCapture(e.pointerId);
      slider.classList.add('is-dragging');
      fromPointer(e);
    });
    slider.addEventListener('pointermove', function (e) {
      if (slider.hasPointerCapture(e.pointerId)) fromPointer(e);
    });
    slider.addEventListener('pointerup', function () { slider.classList.remove('is-dragging'); });
    slider.addEventListener('pointercancel', function () { slider.classList.remove('is-dragging'); });

    slider.addEventListener('keydown', function (e) {
      var map = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
      if (e.key in map) set(value + map[e.key]);
      else if (e.key === 'Home') set(1);
      else if (e.key === 'End') set(5);
      else return;
      e.preventDefault();
    });

    set(opts.initial || 1);
    return { get: function () { return value; }, set: set };
  }

  return { init: init, LABELS: LABELS };
})();
