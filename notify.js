// 알림 설정 (Figma 1597:12814) + 알람시간 스크롤 선택 (37:8750) — 이 기기에만 저장
// 추가하기 → 아래 목록에 알림 저장, X → 삭제 (목록이 있는 마이페이지 화면에서만)
window.NotifySettings = (function () {
  const KEY = 'panny.notify';
  const DEFAULTS = { enabled: true, hour: 21, minute: 0, days: [1, 2, 3, 4, 5], alarms: [] };

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
  const addBtn = document.getElementById('nt-add');
  const alarmList = document.getElementById('nt-alarms');
  const alarmTpl = document.getElementById('nt-alarm-item');

  const data = NotifySettings.load();
  let enabled = data.enabled;
  let days = new Set(data.days);
  let alarms = Array.isArray(data.alarms) ? data.alarms : [];
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
    renderAddBtn();
  }
  enabledSw.addEventListener('click', () => {
    enabled = !enabled;
    if (!enabled) closePicker(false);
    renderEnabled();
  });

  // ---------- 반복 요일 ----------
  function renderDays() {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(days.has(Number(c.dataset.day)))));
    renderAddBtn();
  }
  chips.forEach((c) => {
    c.addEventListener('click', () => {
      const d = Number(c.dataset.day);
      if (days.has(d)) days.delete(d); else days.add(d);
      renderDays();
    });
  });

  // ---------- 알림 추가 · 삭제 ----------
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
  const hour24 = () => (time.hour % 12) + (time.ampm === 'pm' ? 12 : 0);
  const sortDays = (list) => DAY_ORDER.filter((d) => list.indexOf(d) !== -1);

  function daysText(list) {
    if (list.length === 7) return '매일';
    return sortDays(list).map((d) => DAY_NAMES[d]).join('∙');
  }

  function renderAddBtn() {
    if (addBtn) addBtn.disabled = !enabled || days.size === 0;
  }

  function persistAlarms() {
    NotifySettings.save(Object.assign(NotifySettings.load(), { alarms }));
  }

  function renderAlarms() {
    if (!alarmList) return;
    alarmList.textContent = '';
    alarms.forEach((a) => {
      const li = alarmTpl.content.firstElementChild.cloneNode(true);
      const ampm = a.hour >= 12 ? '오후' : '오전';
      const clock = `${a.hour % 12 === 0 ? 12 : a.hour % 12} : ${pad(a.minute)}`;
      const dayLabel = daysText(a.days);
      li.querySelector('.notify-alarm__ampm').textContent = ampm;
      li.querySelector('.notify-alarm__clock').textContent = clock;
      li.querySelector('.notify-alarm__days').textContent = dayLabel;
      const rm = li.querySelector('.notify-alarm__remove');
      rm.dataset.id = a.id;
      rm.setAttribute('aria-label', `${ampm} ${clock.replace(/ /g, '')} ${dayLabel} 알림 삭제`);
      alarmList.appendChild(li);
    });
  }

  if (addBtn && alarmList) {
    addBtn.addEventListener('click', () => {
      closePicker(false);
      if (!enabled || days.size === 0) return;
      const entry = { id: Date.now().toString(36), hour: hour24(), minute: time.min, days: sortDays(Array.from(days)) };
      const dup = alarms.some((a) => a.hour === entry.hour && a.minute === entry.minute && a.days.join() === entry.days.join());
      if (!dup) {
        alarms = alarms.concat(entry).sort((x, y) => (x.hour * 60 + x.minute) - (y.hour * 60 + y.minute));
        persistAlarms();
        renderAlarms();
      }
    });

    // X → 삭제 후 다음 X(없으면 추가하기)로 포커스
    alarmList.addEventListener('click', (e) => {
      const rm = e.target.closest('.notify-alarm__remove');
      if (!rm) return;
      const i = alarms.findIndex((a) => a.id === rm.dataset.id);
      if (i === -1) return;
      alarms = alarms.filter((a) => a.id !== rm.dataset.id);
      persistAlarms();
      renderAlarms();
      const btns = alarmList.querySelectorAll('.notify-alarm__remove');
      (btns[Math.min(i, btns.length - 1)] || addBtn).focus({ preventScroll: true });
    });
  }

  // ---------- 저장 → 마이페이지 ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    closePicker(false);
    // 리포트의 바텀시트(data-mode="sheet")에서 저장하면 그 시간·요일을
    // 마이페이지 → 알림 설정의 알림 목록에도 추가 (같은 알림이 이미 있으면 그대로)
    if (form.dataset.mode === 'sheet' && enabled && days.size > 0) {
      const fresh = Array.isArray(NotifySettings.load().alarms) ? NotifySettings.load().alarms : alarms;
      const entry = { id: Date.now().toString(36), hour: hour24(), minute: time.min, days: sortDays(Array.from(days)) };
      const dup = fresh.some((a) => a.hour === entry.hour && a.minute === entry.minute && a.days.join() === entry.days.join());
      alarms = dup ? fresh : fresh.concat(entry).sort((x, y) => (x.hour * 60 + x.minute) - (y.hour * 60 + y.minute));
    }
    const saved = { enabled, hour: hour24(), minute: time.min, days: Array.from(days).sort(), alarms };
    NotifySettings.save(saved);
    // 리포트의 바텀시트에서는 페이지 이동 없이 시트만 닫음
    if (form.dataset.mode === 'sheet') {
      form.dispatchEvent(new CustomEvent('notify:saved', { detail: saved }));
      return;
    }
    location.href = 'mypage.html';
  });

  renderDisplay();
  renderEnabled();
  renderDays();
  renderAlarms();
})();
