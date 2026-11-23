// 호흡 화면 공용: 설정 저장, 스위치, 오버레이(바텀시트·모달) 열고 닫기
window.Breath = (function () {
  const KEY = 'panny-breathing-settings';
  const DEFAULTS = { bgPlay: false, voice: true, vibrate: true, keepAwake: true };

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(settings) {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* 저장 불가 환경은 무시 */ }
  }

  // 시트 안 스위치를 settings 값으로 채우고, 누르면 토글(적용 전까지는 화면 상태만 바뀜)
  function bindSwitches(root, settings) {
    root.querySelectorAll('.switch[data-setting]').forEach((sw) => {
      sw.setAttribute('aria-checked', String(!!settings[sw.dataset.setting]));
      if (sw.dataset.bound) return;
      sw.dataset.bound = '1';
      sw.addEventListener('click', () => {
        sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
      });
    });
  }

  function readSwitches(root, settings) {
    root.querySelectorAll('.switch[data-setting]').forEach((sw) => {
      settings[sw.dataset.setting] = sw.getAttribute('aria-checked') === 'true';
    });
    return settings;
  }

  // 오버레이: 배경 40% 검정, 배경 클릭으로는 닫히지 않음, ESC로 닫기
  function overlay(overlayEl, { trigger, onClose } = {}) {
    const dialog = overlayEl.querySelector('[role="dialog"]');
    const frame = overlayEl.parentElement;
    let lastFocus = null;

    function siblings() {
      return Array.from(frame.children).filter((el) => el !== overlayEl && !el.classList.contains('overlay'));
    }

    function open() {
      lastFocus = document.activeElement;
      overlayEl.hidden = false;
      siblings().forEach((el) => { el.inert = true; });
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      dialog.focus();
    }

    function close(reason) {
      if (overlayEl.hidden) return;
      overlayEl.hidden = true;
      siblings().forEach((el) => { el.inert = false; });
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (onClose) onClose(reason);
    }

    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    overlayEl.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close('close')));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlayEl.hidden) close('close');
    });

    return { open, close, get isOpen() { return !overlayEl.hidden; } };
  }

  return { load, save, bindSwitches, readSwitches, overlay };
})();
