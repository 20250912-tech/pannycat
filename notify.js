// 알림 설정 (Figma 1:5030) + 알람시간 스크롤 선택 (37:8750) — 이 기기에만 저장
window.NotifySettings = (function () {
  const KEY = 'panny.notify';
  const DEFAULTS = { enabled: true, hour: 21, minute: 0, days: [1, 2, 3, 4, 5] };

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
  const form = document.getElementById('notify-form');
  if (!form) return;

  const ROW = 31;    // 휠 한 행 높이 (px)
  const COPIES = 5;  // 시·분 휠을 끝없이 도는 것처럼 보이게 반복할 횟수
  const MID = Math.floor(COPIES / 2);

  const card = form.querySelector('.notify-card');
  const enabledSw = document.getElementById('nt-enabled');
  const timeBox = form.querySelector('.notify-time');
  const timeBtn = document.getElementById('nt-time-btn');
  const picker = document.getElementById('nt-picker');
  const dispAmpm = document.getElementById('nt-disp-ampm');
  const dispClock = document.getElementById('nt-disp-clock');
  const chips = Array.from(form.querySelectorAll('.day-chip'));

  const data = NotifySettings.load();
  let enabled = data.enabled;
  let days = new Set(data.days);
  // 상태: 오전/오후 · 1~12시 · 0~59분
  const time = {
    ampm: data.hour >= 12 ? 'pm' : 'am',
    hour: data.hour % 12 === 0 ? 12 : data.hour % 12,
    min: data.minute,
  };

  const pad = (n) => String(n).padStart(2, '0');

  // ---------- 휠 정의 ----------
  const wheels = {
    ampm: { values: ['pm', 'am'], label: (v) => (v === 'pm' ? '오후' : '오전'), loop: false }, // 디자인 순서: 오후 위, 오전 아래
    hour: { values: Array.from({ length: 12 }, (_, i) => i + 1), label: String, loop: true },
    min: { values: Array.from({ length: 60 }, (_, i) => i), label: pad, loop: true },
  };

  Object.keys(wheels).forEach((key) => {
    const w = wheels[key];
    w.el = picker.querySelector(`[data-col="${key}"]`);
    const copies = w.loop ? COPIES : 1;
    const frag = document.createDocumentFragment();
    for (let c = 0; c < copies; c++) {
      w.values.forEach((v, i) => {
        const item = document.createElement('div');
        item.className = 'time-picker__item';
        item.setAttribute('role', 'option');
        item.textContent = w.label(v);
        item.dataset.index = String(c * w.values.length + i);
        if (c !== (w.loop ? MID : 0)) item.setAttribute('aria-hidden', 'true');
        frag.appendChild(item);
      });
    }
    w.el.appendChild(frag);
    w.items = Array.from(w.el.children);
    w.timer = null;
  });

  function baseIndex(key) {
    const w = wheels[key];
    const i = w.values.indexOf(time[key]);
    return (w.loop ? MID * w.values.length : 0) + i;
  }

  function markSelected(key, index) {
    const w = wheels[key];
    w.items.forEach((it, i) => {
      const on = i === index;
      it.classList.toggle('is-selected', on);
      it.setAttribute('aria-selected', String(on));
    });
  }

  function scrollTo(key, index, smooth) {
    const w = wheels[key];
    w.el.scrollTo({ top: index * ROW, behavior: smooth ? 'smooth' : 'auto' });
    markSelected(key, index);
  }

  function currentIndex(key) {
    const w = wheels[key];
    return Math.max(0, Math.min(w.items.length - 1, Math.round(w.el.scrollTop / ROW)));
  }

  // 스크롤이 멈추면 값 확정 + 반복 휠은 가운데 묶음으로 조용히 되돌림
  function settle(key) {
    const w = wheels[key];
    const idx = currentIndex(key);
    time[key] = w.values[idx % w.values.length];
    if (w.loop) {
      const target = baseIndex(key);
      if (target !== idx) scrollTo(key, target, false);
    }
    renderDisplay();
  }

  Object.keys(wheels).forEach((key) => {
    const w = wheels[key];
    w.el.addEventListener('scroll', () => {
      markSelected(key, currentIndex(key));
      clearTimeout(w.timer);
      w.timer = setTimeout(() => settle(key), 120);
    }, { passive: true });

    // 항목을 누르면 그 값으로 이동
    w.el.addEventListener('click', (e) => {
      const item = e.target.closest('.time-picker__item');
      if (item) scrollTo(key, Number(item.dataset.index), true);
    });

    // 방향키로 한 칸씩
    w.el.addEventListener('keydown', (e) => {
      const dir = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const next = Math.max(0, Math.min(w.items.length - 1, currentIndex(key) + dir));
      scrollTo(key, next, true);
    });
  });

  // ---------- 접힘/펼침 ----------
  function renderDisplay() {
    dispAmpm.textContent = time.ampm === 'pm' ? '오후' : '오전';
    dispClock.textContent = `${time.hour} : ${pad(time.min)}`;
  }

  function openPicker(e) {
    timeBox.classList.add('is-open');
    picker.hidden = false;
    timeBtn.setAttribute('aria-expanded', 'true');
    Object.keys(wheels).forEach((key) => scrollTo(key, baseIndex(key), false));
    // 키보드로 연 경우에만 휠로 포커스 이동 (터치·마우스는 포커스 링 없이)
    if (e && e.detail === 0) wheels.hour.el.focus({ preventScroll: true });
  }

  function closePicker(focusBtn) {
    if (picker.hidden) return;
    Object.keys(wheels).forEach((key) => { clearTimeout(wheels[key].timer); settle(key); });
    picker.hidden = true;
    timeBox.classList.remove('is-open');
    timeBtn.setAttribute('aria-expanded', 'false');
    if (focusBtn) timeBtn.focus();
  }

  timeBtn.addEventListener('click', openPicker);
  document.addEventListener('pointerdown', (e) => {
    if (!picker.hidden && !picker.contains(e.target)) closePicker(false);
  });
  picker.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); closePicker(true); }
  });

  // ---------- 알림 스위치 ----------
  function renderEnabled() {
    enabledSw.setAttribute('aria-checked', String(enabled));
    card.classList.toggle('is-off', !enabled);
    timeBtn.disabled = !enabled;
    chips.forEach((c) => { c.disabled = !enabled; });
  }
  enabledSw.addEventListener('click', () => {
    enabled = !enabled;
    if (!enabled) closePicker(false);
    renderEnabled();
  });

  // ---------- 반복 요일 ----------
  function renderDays() {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(days.has(Number(c.dataset.day)))));
  }
  chips.forEach((c) => {
    c.addEventListener('click', () => {
      const d = Number(c.dataset.day);
      if (days.has(d)) days.delete(d); else days.add(d);
      renderDays();
    });
  });

  // ---------- 저장 → 마이페이지 ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    closePicker(false);
    const hour24 = (time.hour % 12) + (time.ampm === 'pm' ? 12 : 0);
    const saved = { enabled, hour: hour24, minute: time.min, days: Array.from(days).sort() };
    NotifySettings.save(saved);
    // 리포트의 바텀시트(data-mode="sheet")에서는 페이지 이동 없이 시트만 닫음
    if (form.dataset.mode === 'sheet') {
      form.dispatchEvent(new CustomEvent('notify:saved', { detail: saved }));
      return;
    }
    location.href = 'mypage.html';
  });

  renderDisplay();
  renderEnabled();
  renderDays();
})();
