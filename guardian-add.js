// 보호자 추가하기 (Figma 1597:12741) + 사진 선택하기 시트 (33:8593)
// 보호자별 긴급 연락 방식(전화/메시지)과 긴급 메시지도 함께 저장
// ?id=... 로 열면 해당 보호자를 수정 · 삭제
(function () {
  const AVATAR = 'assets/profile/avatar.svg';
  const PHOTO_PX = 320;

  const form = document.getElementById('guardian-form');
  const img = document.getElementById('photo-img');
  const cameraBtn = document.getElementById('camera-btn');
  const fileInput = document.getElementById('photo-file');
  const nameInput = document.getElementById('g-name');
  const phoneInput = document.getElementById('g-phone');
  const saveBtn = document.getElementById('save-btn');
  const overlayEl = document.getElementById('photo-overlay');
  const chips = Array.from(document.querySelectorAll('.guardian-chip'));
  const methods = Array.from(document.querySelectorAll('.emergency-option'));
  const messageInput = document.getElementById('g-message');
  const DEFAULT_MESSAGE = messageInput.placeholder;
  const deleteBtn = document.getElementById('delete-btn');
  const deleteOverlay = document.getElementById('delete-overlay');
  const toastEl = document.getElementById('toast');

  const list = Guardians.load();
  const editId = new URLSearchParams(location.search).get('id');
  const editing = editId ? list.find((g) => g.id === editId) : null;

  let photo = editing ? editing.photo : null;
  let relation = editing ? editing.relation : 'parent';
  let method = (editing && editing.method) || 'message';
  if (editing) {
    nameInput.value = editing.name;
    phoneInput.value = editing.phone;
    messageInput.value = editing.message || '';
    saveBtn.textContent = '저장하기';
    deleteBtn.hidden = false;
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  function renderPhoto() {
    img.src = photo || AVATAR;
    img.classList.toggle('has-photo', !!photo);
  }

  function renderRelation() {
    chips.forEach((c) => c.setAttribute('aria-checked', String(c.dataset.value === relation)));
  }

  function renderMethod() {
    methods.forEach((btn) => {
      const on = btn.dataset.method === method;
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
    });
  }

  // 내용 길이에 맞춰 메시지 입력창 높이 자동 조절
  function autosize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
  }

  // 버튼은 막지 않고(눌러도 아무 일 없는 것처럼 보이지 않게) 덜 채워졌을 때만 흐리게 표시,
  // 누르면 무엇이 빠졌는지 안내
  function validate() {
    const nameOk = nameInput.value.trim().length >= 1;
    const phoneOk = Guardians.isValidPhone(phoneInput.value);
    nameInput.setAttribute('aria-invalid', String(!nameOk));
    phoneInput.setAttribute('aria-invalid', String(!phoneOk));
    saveBtn.classList.toggle('is-incomplete', !(nameOk && phoneOk));
    return nameOk && phoneOk;
  }

  // 사진 선택 시트 (프로필 수정과 동일)
  const sheet = Breath.overlay(overlayEl, { trigger: cameraBtn });
  cameraBtn.addEventListener('click', () => sheet.open());

  overlayEl.querySelector('[data-action="album"]').addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });
  overlayEl.querySelector('[data-action="delete"]').addEventListener('click', () => {
    photo = null;
    renderPhoto();
    sheet.close('delete');
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      photo = await Profile.toSquareDataUrl(file, PHOTO_PX);
      renderPhoto();
      sheet.close('album');
    } catch (e) {
      alert('사진을 불러오지 못했어요. 다른 사진을 선택해 주세요.');
    }
  });

  // 연락처: 입력하는 대로 하이픈 자동 삽입
  phoneInput.addEventListener('input', () => {
    phoneInput.value = Guardians.formatPhone(phoneInput.value);
    validate();
  });
  nameInput.addEventListener('input', validate);

  // 나와의 관계: 하나만 선택 (방향키 이동 지원)
  chips.forEach((chip, i) => {
    chip.addEventListener('click', () => { relation = chip.dataset.value; renderRelation(); });
    chip.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = chips[(i + step + chips.length) % chips.length];
      relation = next.dataset.value;
      renderRelation();
      next.focus();
    });
  });

  // 연락 방식: 하나만 선택 (방향키 이동 지원)
  methods.forEach((btn, i) => {
    btn.addEventListener('click', () => { method = btn.dataset.method; renderMethod(); });
    btn.addEventListener('keydown', (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = methods[(i + step + methods.length) % methods.length];
      next.click();
      next.focus();
    });
  });
  messageInput.addEventListener('input', autosize);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) {
      if (!nameInput.value.trim()) {
        toast('보호자 이름을 입력해 주세요.');
        nameInput.focus();
      } else {
        toast('연락처를 010-0000-0000 형식으로 입력해 주세요.');
        phoneInput.focus();
      }
      return;
    }
    const entry = {
      id: editing ? editing.id : Date.now().toString(36),
      name: nameInput.value.trim(),
      phone: phoneInput.value,
      relation,
      method,
      message: messageInput.value.trim() || DEFAULT_MESSAGE,
      photo,
    };
    const next = editing ? list.map((g) => (g.id === editing.id ? entry : g)) : list.concat(entry);
    if (!Guardians.save(next)) {
      alert('사진 용량이 커서 저장하지 못했어요. 다른 사진을 선택해 주세요.');
      return;
    }
    location.href = 'guardian.html';
  });

  // 보호자 삭제 (수정할 때만): 확인창 → 목록에서 빼고 보호자 연락처 화면으로
  if (editing) {
    const deleteDialog = Breath.overlay(deleteOverlay, { trigger: deleteBtn });
    deleteBtn.addEventListener('click', () => deleteDialog.open());
    deleteOverlay.addEventListener('click', (e) => { if (e.target === deleteOverlay) deleteDialog.close('close'); });
    document.getElementById('delete-confirm').addEventListener('click', () => {
      if (!Guardians.save(Guardians.load().filter((g) => g.id !== editing.id))) {
        deleteDialog.close('error');
        toast('삭제하지 못했어요. 다시 시도해 주세요.');
        return;
      }
      location.replace('guardian.html');
    });
  }

  renderPhoto();
  renderRelation();
  renderMethod();
  autosize();
  validate();
})();
