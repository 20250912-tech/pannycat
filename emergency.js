// 긴급 연락 설정 (Figma 1:5005) — 연락 방식 선택 + 긴급 메세지 작성 (이 기기에만 저장)
window.Emergency = (function () {
  const KEY = 'panny.emergency';
  const DEFAULTS = { method: 'message', message: '지금 도움이 필요해요.' };

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  return { load, save, DEFAULTS };
})();

(function () {
  const form = document.getElementById('emergency-form');
  if (!form) return;

  const options = Array.from(form.querySelectorAll('.emergency-option'));
  const textarea = document.getElementById('em-message');
  const count = document.getElementById('em-count');
  const saveBtn = document.getElementById('save-btn');

  const data = Emergency.load();
  let method = data.method;
  textarea.value = data.message;

  function renderMethod() {
    options.forEach((btn) => {
      const on = btn.dataset.method === method;
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
  }

  // 내용 길이에 맞춰 입력창 높이 자동 조절
  function autosize() {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  function validate() {
    const len = textarea.value.length;
    count.textContent = len;
    // 메세지 전송을 고른 경우에만 내용이 필요
    const ok = method !== 'message' || textarea.value.trim().length > 0;
    saveBtn.disabled = !ok;
    textarea.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  options.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      method = btn.dataset.method;
      renderMethod();
      validate();
    });
    // 라디오 그룹 방향키 이동
    btn.addEventListener('keydown', (e) => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const next = options[(i + dir + options.length) % options.length];
      next.click();
      next.focus();
    });
  });

  textarea.addEventListener('input', () => { autosize(); validate(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) { textarea.focus(); return; }
    Emergency.save({ method, message: textarea.value.trim() });
    location.href = 'mypage.html';
  });

  renderMethod();
  autosize();
  validate();
})();
