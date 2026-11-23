// 그라운딩 진행 (5-4-3-2-1 오감): 건너뛰기·찾았어요 → 다음 단계, 5단계 후 활동 완료로 이동
(function () {
  var STEPS = [
    { sense: '시각', desc: '주변에서 보이는 물건 5가지를 찾아<br />모양, 색깔, 크기 등을 관찰해 보세요.',
      examples: ['책, 의자, 창문, 컵, 가방 등', '각각의 색과 모양을 자세히 살펴보세요.'] },
    { sense: '촉각', desc: '만질 수 있는 물건 4가지를 찾아<br />질감, 온도, 무게 등을 느껴보세요.',
      examples: ['옷의 감촉, 의자의 표면, 손에 닿는 책상 등', '부드러운지, 차가운지 살펴보세요.'] },
    { sense: '청각', desc: '주변에서 들리는 소리 3가지를 찾아<br />크기, 높낮이, 방향 등에 집중해 보세요.',
      examples: ['바람 소리, 발걸음 소리, 자동차 소리 등', '어디에서 들리는지 귀 기울여 보세요.'] },
    { sense: '후각', desc: '주변에서 맡을 수 있는 냄새 2가지를 찾아<br />어떤 향인지 천천히 알아차려 보세요.',
      examples: ['커피 향, 비누 향, 옷에서 나는 냄새 등', '향이 은은한지 진한지 느껴보세요.'] },
    { sense: '미각', desc: '입안에서 느껴지는 맛 1가지를 찾아<br />어떤 맛이 남아 있는지 집중해 보세요.',
      examples: ['입안에 남은 음식 맛, 음료의 맛 등', '단맛이나 짠맛이 느껴지는지 살펴보세요.'] }
  ];
  var TOTAL = STEPS.length;

  var $ = function (id) { return document.getElementById(id); };
  var root = $('ground');
  var showables = root.querySelectorAll('[data-show]');
  var results = [];                    // 단계별 'found' | 'skipped'
  var step = 0;
  var startedAt = Date.now();

  function render() {
    var s = STEPS[step], n = step + 1;
    root.dataset.step = n;
    $('step-now').textContent = n;
    $('step-num').textContent = n;
    $('step-sense').textContent = s.sense;
    $('step-desc').innerHTML = s.desc;
    $('step-examples').innerHTML = s.examples.map(function (t) { return '<li>' + t + '</li>'; }).join('');
    $('progress').setAttribute('aria-valuenow', n);
    $('progress-fill').style.width = (n / TOTAL * 100) + '%';
    showables.forEach(function (el) {
      el.hidden = el.dataset.show.split(' ').indexOf(String(n)) === -1;
    });
  }

  function next(result) {
    results[step] = result;
    if (step < TOTAL - 1) {
      step += 1;
      render();
      return;
    }
    var found = results.filter(function (r) { return r === 'found'; }).length;
    ActivityRecord.setLast({
      type: 'grounding',
      found: found,
      skipped: TOTAL - found,
      seconds: Math.round((Date.now() - startedAt) / 1000)
    });
    location.href = 'activity-complete.html';
  }

  $('found-btn').addEventListener('click', function () { next('found'); });
  $('skip-btn').addEventListener('click', function () { next('skipped'); });

  // 뒤로 가기: 이전 단계로, 1단계에서는 그라운딩 시작 전 화면으로
  $('back-btn').addEventListener('click', function (e) {
    if (step === 0) return;
    e.preventDefault();
    step -= 1;
    render();
  });

  render();
})();
