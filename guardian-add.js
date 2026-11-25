// 보호자 추가하기 (Figma 1597:12741) + 사진 선택하기 시트 (33:8593)
// 보호자별 긴급 연락 방식(전화/메시지)과 긴급 메시지도 함께 저장
// ?id=... 로 열면 해당 보호자를 수정
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

  function validate() {
    const nameOk = nameInput.value.trim().length >= 1;
    const phoneOk = Guardians.isValidPhone(phoneInput.value);
    nameInput.setAttribute('aria-invalid', String(!nameOk));
    phoneInput.setAttribute('aria-invalid', String(!phoneOk));
    saveBtn.disabled = !(nameOk && phoneOk);
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
      (nameInput.value.trim() ? phoneInput : nameInput).focus();
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

  renderPhoto();
  renderRelation();
  renderMethod();
  autosize();
  validate();
})();
