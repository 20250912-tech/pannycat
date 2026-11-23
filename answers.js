// 온보딩 답변 저장소 — 응답 재설정(response-reset)에서 읽고 수정. 이 기기에만 저장
window.Answers = (function () {
  const KEY = 'panny.answers';

  // 질문별 보기 (온보딩 화면의 data-value·문구와 동일)
  const QUESTIONS = {
    help: {
      title: '도움 방식',
      multi: true,
      custom: false,
      options: [
        ['calm', '빠른 진정'],
        ['daily-care', '평소 스트레스·마음 관리'],
        ['mood-log', '마음상태 기록'],
        ['emergency', '위급상황 대처']
      ]
    },
    trigger: {
      title: '불안을 느끼는 순간',
      multi: true,
      custom: true,
      options: [
        ['crowded', '사람이 많거나 붐비는 곳에 있을 때'],
        ['anticipatory', '불안이 다시 올까 걱정될 때'],
        ['body-change', '몸의 변화가 느껴질 때'],
        ['big-event', '중요한 일을 앞두고 있을 때'],
        ['hard-to-escape', '벗어나기 어려운 상황·공간'],
        ['alone', '혼자 있고 도움받기 어렵다고 느낄 때']
      ]
    },
    coping: {
      title: '불안 상황시 도움이 되는 방법',
      multi: true,
      custom: true,
      options: [
        ['breathing', '천천히 호흡하기'],
        ['grounding', '주변을 보거나 사물의 감촉에 집중하기'],
        ['comforting-words', '위로가 되는 문장 읽기·쓰기'],
        ['relaxation', '명상하거나 몸에 긴장 풀기'],
        ['talking', '누군가와 대화하기'],
        ['journaling', '마음을 글로 기록하기']
      ]
    },
    anxiety: {
      title: '현재의 불안 정도',
      multi: false,
      custom: false,
      // 시트에서는 편안함 → 불안 순서 (Figma 33:8301). 값은 불안 슬라이더와 같은 1(매우 불안)~5(매우 편안)
      options: [
        ['5', '매우 편안해요'],
        ['4', '편안해요'],
        ['3', '차분해요'],
        ['2', '불안해요'],
        ['1', '매우 불안해요']
      ]
    },
    feeling: {
      title: '현재의 느낌',
      multi: false,
      custom: true,
      options: [
        ['racing-heart', '몸이 두근거리거나 긴장돼요'],
        ['worry', '걱정과 생각이 많아져요'],
        ['unfocused', '주변에 집중하기 어려워요'],
        ['escape', '지금 있는 상황을 벗어나고 싶어요'],
        ['calm', '지금은 비교적 편안해요']
      ]
    }
  };

  // 저장된 답변이 없을 때 (Figma 1:4709 예시값)
  const DEFAULTS = {
    help: { values: ['calm'], custom: '' },
    trigger: { values: ['anticipatory', 'hard-to-escape'], custom: '' },
    coping: { values: ['breathing'], custom: '' },
    anxiety: { values: ['1'], custom: '' },
    feeling: { values: ['worry'], custom: '' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    const out = clone(DEFAULTS);
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      Object.keys(out).forEach((k) => {
        const a = saved[k];
        if (a && Array.isArray(a.values)) {
          out[k] = { values: a.values.map(String), custom: typeof a.custom === 'string' ? a.custom : '' };
        }
      });
    } catch (e) { /* 저장소를 쓸 수 없으면 기본값 */ }
    return out;
  }

  function save(answers) {
    try {
      localStorage.setItem(KEY, JSON.stringify(answers));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 선택한 보기 문구 목록 (직접 작성 포함, 보기 순서대로)
  function labels(key, answer) {
    const q = QUESTIONS[key];
    const list = q.options.filter(([v]) => answer.values.includes(v)).map(([, label]) => label);
    if (answer.custom) list.push(answer.custom);
    return list;
  }

  return { QUESTIONS, load, save, labels };
})();
