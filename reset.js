// 응답 재설정 (Figma 1:4709) + 항목 수정 시트 (33:8408 · 32:7943 · 32:8195 · 33:8301 · 33:8364)
// 시트 [저장하기] → 화면에 반영, 화면 [저장하기] → 기기에 저장 후 마이페이지로
(function () {
  const Q = Answers.QUESTIONS;
  const answers = Answers.load();

  const overlayEl = document.getElementById('reset-overlay');
  const optionsEl = document.getElementById('reset-options');
  const titleEl = document.getElementById('reset-sheet-title');
  const hintEl = document.getElementById('reset-sheet-hint');
  const sheetSave = document.getElementById('reset-sheet-save');
  const items = document.querySelectorAll('.reset__item');

  let current = null;   // 열린 질문 key
  let draft = null;     // 시트 안에서 고치는 중인 답변 { values, custom }
  let editing = false;  // 직접 작성 입력창 열림 여부

  // ---------- 목록 카드 설명 ----------
  function renderItem(btn) {
    const key = btn.dataset.q;
    const list = Answers.labels(key, answers[key]);
    btn.querySelector('[data-desc]').textContent = list.length ? list.join(', ') : '선택하지 않았어요';
  }
  items.forEach(renderItem);

  // ---------- 시트 ----------
  const sheet = Breath.overlay(overlayEl, {
    onClose() { current = null; draft = null; editing = false; }
  });
  // 시트 바깥(어두운 배경)을 누르면 저장하지 않고 닫기
  overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) sheet.close('backdrop'); });

  function option(value, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'reset-option';
    b.dataset.value = value;
    b.textContent = label;
    b.setAttribute('aria-pressed', String(draft.values.includes(value)));
    b.addEventListener('click', () => toggle(value));
    return b;
  }

  function customRow() {
    const q = Q[current];
    // 입력 중
    if (editing) {
      const form = document.createElement('form');
      form.className = 'reset-option reset-option--input';
      form.innerHTML =
        '<label class="visually-hidden" for="reset-custom-text">' + q.title + ' 직접 작성</label>' +
        '<input id="reset-custom-text" type="text" maxlength="24" autocomplete="off" enterkeyhint="done" placeholder="직접 입력해 주세요" />' +
        '<button type="submit" class="chip-input__submit">확인</button>';
      const input = form.querySelector('input');
      input.value = draft.custom;
      form.addEventListener('submit', (e) => { e.preventDefault(); commitCustom(input.value); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); editing = false; render(); focusCustom(); }
      });
      // 입력창 밖을 누르면 입력한 내용으로 확정 (시트 저장 버튼 클릭도 포함)
      form.addEventListener('focusout', (e) => {
        if (!editing || form.contains(e.relatedTarget)) return;
        commitCustom(input.value, true);
      });
      return form;
    }
    // 작성한 내용이 있으면 선택(on) 상태로 표시
    if (draft.custom) {
      const box = document.createElement('div');
      box.className = 'reset-option reset-option--custom';
      box.setAttribute('aria-pressed', 'true');

      const text = document.createElement('button');
      text.type = 'button';
      text.className = 'reset-option__text';
      text.textContent = draft.custom;
      text.setAttribute('aria-label', '직접 작성: ' + draft.custom + ' (눌러서 고치기)');
      text.addEventListener('click', openCustom);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'chip--custom__remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', '“' + draft.custom + '” 삭제');
      remove.addEventListener('click', () => { draft.custom = ''; render(); focusCustom(); });

      box.append(text, remove);
      return box;
    }
    // 기본: 직접 작성하기 (off)
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'reset-option';
    b.textContent = '직접 작성하기';
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', openCustom);
    return b;
  }

  function render() {
    const q = Q[current];
    optionsEl.replaceChildren(...q.options.map(([v, label]) => option(v, label)));
    if (q.custom) {
      const row = customRow();
      row.dataset.custom = '';
      optionsEl.append(row);
    }
  }

  function focusCustom() {
    const row = optionsEl.querySelector('[data-custom]');
    const target = row && (row.matches('button') ? row : row.querySelector('input, button'));
    if (target) target.focus();
  }

  function toggle(value) {
    const on = draft.values.includes(value);
    if (Q[current].multi) {
      draft.values = on ? draft.values.filter((v) => v !== value) : draft.values.concat(value);
    } else if (!on) {
      draft.values = [value];  // 하나만 선택: 직접 작성 내용도 해제
      draft.custom = '';
    }
    editing = false;
    render();
    const btn = optionsEl.querySelector('[data-value="' + value + '"]');
    if (btn) btn.focus();
  }

  function openCustom() {
    editing = true;
    render();
    const input = optionsEl.querySelector('#reset-custom-text');
    input.focus();
    input.select();
  }

  function commitCustom(raw, fromBlur) {
    const text = raw.trim().replace(/\s+/g, ' ');
    draft.custom = text;
    if (text && !Q[current].multi) draft.values = [];
    editing = false;
    render();
    if (!fromBlur) focusCustom();
  }

  function open(btn) {
    current = btn.dataset.q;
    const q = Q[current];
    draft = { values: answers[current].values.slice(), custom: answers[current].custom };
    editing = false;
    titleEl.textContent = q.title + ' 수정';
    hintEl.textContent = q.multi ? '여러 개를 선택할 수 있어요.' : '하나만 선택할 수 있어요.';
    overlayEl.querySelector('.reset-sheet').dataset.q = current;
    render();
    sheet.open();
  }

  items.forEach((btn) => btn.addEventListener('click', () => open(btn)));

  // 입력창이 열린 채로 누르면 입력 내용까지 확정해서 반영
  sheetSave.addEventListener('click', () => {
    if (!current) return;
    if (editing) {
      const input = optionsEl.querySelector('#reset-custom-text');
      if (input) commitCustom(input.value, true);
    }
    answers[current] = { values: draft.values.slice(), custom: draft.custom };
    const btn = document.querySelector('.reset__item[data-q="' + current + '"]');
    renderItem(btn);
    sheet.close('save');
  });

  // ---------- 화면 저장 ----------
  document.getElementById('reset-save').addEventListener('click', () => {
    if (!Answers.save(answers)) {
      alert('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    location.href = 'mypage.html';
  });
})();
