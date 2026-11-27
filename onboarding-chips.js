(function () {
  // data-select="single" 이면 하나만 선택 (직접 작성 항목도 1개로 교체)
  var group = document.querySelector('.chips');
  var single = group && group.dataset.select === 'single';
  var MAX_CUSTOM = single ? 1 : 3; // 393×852 프레임 안에 들어가는 최대 개수

  function clearSelection() {
    document.querySelectorAll('.chip[aria-pressed="true"]').forEach(function (c) {
      c.setAttribute('aria-pressed', 'false');
    });
    document.querySelectorAll('.chip--custom').forEach(function (c) { c.remove(); });
  }

  document.querySelectorAll('.chip[aria-pressed]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var on = chip.getAttribute('aria-pressed') === 'true';
      if (single && !on) {
        clearSelection();
        if (form.hidden) openBtn.hidden = false;
      }
      chip.setAttribute('aria-pressed', String(!on));
    });
  });

  var openBtn = document.getElementById('custom-open');
  var form = document.getElementById('custom-form');
  var input = document.getElementById('custom-text');

  function customCount() {
    return document.querySelectorAll('.chip--custom').length;
  }

  function showForm() {
    openBtn.hidden = true;
    openBtn.setAttribute('aria-expanded', 'true');
    form.hidden = false;
    input.value = '';
    input.focus();
  }

  function hideForm() {
    form.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.hidden = customCount() >= MAX_CUSTOM;
  }

  function addCustom(text) {
    if (single) clearSelection();
    var box = document.createElement('div');
    box.className = 'chip chip--custom';
    box.dataset.value = 'custom';

    var label = document.createElement('span');
    label.className = 'chip--custom__text';
    label.textContent = text;

    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'chip--custom__remove';
    remove.setAttribute('aria-label', '“' + text + '” 삭제');
    remove.textContent = '×';
    remove.addEventListener('click', function () {
      box.remove();
      if (form.hidden) openBtn.hidden = customCount() >= MAX_CUSTOM;
      (openBtn.hidden ? input : openBtn).focus();
    });

    box.append(label, remove);
    openBtn.before(box);
  }

  // 저장된 답변 되살리기용 (onboarding-answers.js)
  window.OnboardingChips = {
    addCustom: function (text) {
      addCustom(text);
      openBtn.hidden = customCount() >= MAX_CUSTOM;
    }
  };

  openBtn.addEventListener('click', showForm);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim().replace(/\s+/g, ' ');
    input.value = ''; // 숨김 시 발생하는 focusout에서 중복 추가 방지
    if (text) addCustom(text);
    hideForm();
    if (!openBtn.hidden) openBtn.focus();
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; hideForm(); openBtn.focus(); }
  });

  // 입력창 밖을 누르면: 내용이 있으면 추가, 비어 있으면 닫기
  form.addEventListener('focusout', function (e) {
    if (form.contains(e.relatedTarget)) return;
    if (input.value.trim()) form.requestSubmit();
    else hideForm();
  });
})();
