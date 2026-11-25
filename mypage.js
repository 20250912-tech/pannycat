// 마이페이지 — "화면 꺼짐 방지" 스위치 토글 (선택값은 이 기기에만 저장)
(function () {
  const KEY = 'panny.keepAwake';
  const sw = document.querySelector('.mypage-switch');
  if (!sw) return;

  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null) sw.setAttribute('aria-checked', saved);
  } catch (e) { /* 저장소를 쓸 수 없으면 기본값(켜짐) 유지 */ }

  sw.addEventListener('click', () => {
    const next = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(next));
    try { localStorage.setItem(KEY, String(next)); } catch (e) { /* 무시 */ }
  });
})();

// 프로필 수정에서 저장한 닉네임·사진 반영
(function () {
  if (!window.Profile) return;
  const p = Profile.load();
  const name = document.getElementById('mp-nickname');
  const avatar = document.querySelector('.mypage-profile__avatar');
  if (name && p.nickname) name.textContent = p.nickname;
  if (avatar && p.photo) {
    avatar.src = p.photo;
    avatar.classList.add('has-photo');
  }
})();
