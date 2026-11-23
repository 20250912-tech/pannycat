// 프로필 수정 (Figma 1:4279) + 사진 선택하기 시트 (24:7736)
(function () {
  const AVATAR = 'assets/profile/avatar.svg';
  const MIN_LEN = 2;
  const PHOTO_PX = 320; // 저장용 축소 크기 (표시 156px × 2)

  const form = document.getElementById('profile-form');
  const img = document.getElementById('photo-img');
  const cameraBtn = document.getElementById('camera-btn');
  const fileInput = document.getElementById('photo-file');
  const nickname = document.getElementById('nickname');
  const saveBtn = document.getElementById('save-btn');
  const overlayEl = document.getElementById('photo-overlay');

  const profile = Profile.load();
  let photo = profile.photo;
  nickname.value = profile.nickname || '';

  function renderPhoto() {
    img.src = photo || AVATAR;
    img.classList.toggle('has-photo', !!photo);
  }

  function validate() {
    const ok = nickname.value.trim().length >= MIN_LEN;
    saveBtn.disabled = !ok;
    nickname.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  // 사진 선택 시트
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

  // 닉네임
  nickname.addEventListener('input', validate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) { nickname.focus(); return; }
    const saved = Profile.save({ nickname: nickname.value.trim(), photo });
    if (!saved) {
      alert('사진 용량이 커서 저장하지 못했어요. 다른 사진을 선택해 주세요.');
      return;
    }
    location.href = 'mypage.html';
  });

  renderPhoto();
  validate();
})();
