// 프로필(닉네임·사진) 저장소 — 이 기기에만 저장
window.Profile = (function () {
  const KEY = 'panny.profile';
  const DEFAULTS = { nickname: '수정', photo: null };
  const DEFAULT_AVATAR = 'assets/mypage/avatar.svg';

  function load() {
    try {
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(profile) {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
      return true;
    } catch (e) {
      return false; // 용량 초과 등
    }
  }

  // 사진 파일 → 가운데를 정사각형으로 잘라 축소한 data URL (프로필·보호자 사진 공용)
  function toSquareDataUrl(file, maxPx) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const size = Math.min(maxPx || 320, side);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        canvas.getContext('2d').drawImage(
          image,
          (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side,
          0, 0, size, size
        );
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
      image.src = url;
    });
  }

  return { load, save, toSquareDataUrl, DEFAULTS, DEFAULT_AVATAR };
})();
