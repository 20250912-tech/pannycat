// 보호자 연락처 저장소 — 이 기기에만 저장
window.Guardians = (function () {
  const KEY = 'panny.guardians';
  const RELATIONS = { parent: '부모님', family: '가족', friend: '친구', other: '기타' };

  function load() {
    try {
      const list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false; // 용량 초과 등
    }
  }

  // 숫자만 남겨 010-0000-0000 / 010-000-0000 형태로
  function formatPhone(value) {
    const d = String(value).replace(/\D/g, '').slice(0, 11);
    if (d.length < 4) return d;
    if (d.length < 8) return d.slice(0, 3) + '-' + d.slice(3);
    if (d.length < 11) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
    return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
  }

  function isValidPhone(value) {
    return /^01\d-\d{3,4}-\d{4}$/.test(value);
  }

  return { load, save, formatPhone, isValidPhone, RELATIONS };
})();
