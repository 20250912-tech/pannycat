// 기능 진입 화면(호흡·그라운딩·바디스캔·마음일기)의 뒤로 가기 목적지
// 기록 캘린더 카드로 들어왔으면 → 기록 페이지, 온보딩 추천활동으로 들어왔으면 → 홈, 그 외(활동하기 등) → 원래 href(activity.html)
window.BackOrigin = (function () {
  var KEY = 'panny-back-origin';

  function set(url) { try { sessionStorage.setItem(KEY, url); } catch (e) { /* 무시 */ } }
  function clear() { try { sessionStorage.removeItem(KEY); } catch (e) { /* 무시 */ } }
  function get() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }

  // body[data-back-origin="apply"] 인 진입 화면: 뒤로 가기 버튼 목적지 교체
  // body[data-back-origin="clear"] 인 탭 화면(활동하기·홈): 기록에서 온 표시 지우기
  var mode = document.body && document.body.dataset.backOrigin;
  if (mode === 'clear') clear();
  if (mode === 'apply') {
    var url = get();
    if (url) {
      document.querySelectorAll('.appbar__back').forEach(function (a) {
        a.href = url;
        a.setAttribute('aria-label', url.indexOf('record') === 0 ? '기록으로 돌아가기' : '홈으로 돌아가기');
      });
    }
  }

  return { set: set, clear: clear, get: get };
})();
