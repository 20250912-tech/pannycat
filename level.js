// 패니 레벨 — 레벨업 기준 5가지로 경험치를 계산
// 1. 상태 알아차리기   마음일기 작성(panny-diary)                     +1
// 2. 대처 행동 시도하기 호흡·그라운딩·바디스캔 시작(끝까지 안 해도 인정)   +1
// 3. 경험 돌아보기     활동 후 마음·불안 상태 기록(panny-mind-records)  +1
// 4. 스스로 선택하기   활동 중 "그만하기"로 멈추고 나옴                 +1
// 5. 꾸준한 활동 지속  쉬었다가 다시 찾아온 날 +1, 한 주(월~일)에 서로 다른 3일 이상 활동 +2
// 1~4는 같은 날 항목별 최대 3점까지만 인정(반복 누르기로 쌓이지 않도록). 15점마다 레벨업. 레벨이 오르면 그 화면에 레벨업 팝업을 띄움.
//
// 사용: <body data-level="try"> 인 활동 세션 화면은 열릴 때 "시도"를 기록하고,
//       .stop-dialog 안의 링크를 누르면 "스스로 선택하기"를 기록함.
window.Level = (function () {
  var LOG_KEY = 'panny-level-log';
  var DIARY_KEY = 'panny-diary';
  var RECORDS_KEY = 'panny-mind-records';
  var PER_LEVEL = 15;
  var DAILY_CAP = 3;
  var WEEKLY_DAYS = 3;
  var WEEKLY_BONUS = 2;

  function read(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // 그 주 월요일 날짜
  function weekKey(ts) {
    var d = new Date(ts);
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
    return dayKey(d.getTime());
  }

  // kind: 'try'(대처 행동 시도) | 'adjust'(스스로 선택하기)
  function log(kind) {
    var list = read(LOG_KEY);
    list.push({ kind: kind, at: Date.now() });
    try { localStorage.setItem(LOG_KEY, JSON.stringify(list)); } catch (e) { /* 저장 불가 환경은 무시 */ }
  }

  // 모든 행동을 { kind, at } 으로 모음
  function events() {
    var list = [];
    read(DIARY_KEY).forEach(function (d) { if (d && d.at) list.push({ kind: 'notice', at: d.at }); });
    read(RECORDS_KEY).forEach(function (r) { if (r && r.at) list.push({ kind: 'reflect', at: r.at }); });
    read(LOG_KEY).forEach(function (l) { if (l && l.at) list.push({ kind: l.kind, at: l.at }); });
    return list.sort(function (a, b) { return a.at - b.at; });
  }

  function points() {
    var perDay = {}, days = [], weeks = {};
    var total = 0;
    events().forEach(function (e) {
      var k = dayKey(e.at);
      var slot = k + '|' + e.kind;
      perDay[slot] = (perDay[slot] || 0) + 1;
      if (perDay[slot] <= DAILY_CAP) total += 1;
      if (days[days.length - 1] !== k) days.push(k);
    });
    // 5. 꾸준한 활동 지속
    days.forEach(function (k, i) {
      if (i > 0) {
        var prev = new Date(days[i - 1] + 'T00:00:00'), cur = new Date(k + 'T00:00:00');
        if (Math.round((cur - prev) / 864e5) >= 2) total += 1; // 하루 이상 쉬었다가 다시 찾아옴
      }
      var w = weekKey(new Date(k + 'T00:00:00').getTime());
      weeks[w] = (weeks[w] || 0) + 1;
    });
    Object.keys(weeks).forEach(function (w) { if (weeks[w] >= WEEKLY_DAYS) total += WEEKLY_BONUS; });
    return total;
  }

  function state() {
    var p = points();
    var into = p % PER_LEVEL;
    return { points: p, level: Math.floor(p / PER_LEVEL) + 1, percent: Math.round(into / PER_LEVEL * 100) };
  }

  // ---------- 레벨업 팝업 ----------
  var SEEN_KEY = 'panny-level-seen';
  // 단계별 그림·문구 (Figma 레벨1~5). 6레벨 이상은 5단계 그림을 그대로 씀.
  // home: 메인 홈 캐릭터 (높이 185 기준 크기) — 레벨이 오르면 홈의 패니도 같은 보금자리로 바뀜
  var STAGES = [
    { img: 'assets/levelup/panny-lv1.png', w: 125, h: 122, sub: '패니의 새로운 시작이에요!', caption: '패니가 새로운 보금자리를 기다리고 있어요.',
      home: { img: 'assets/home/panny-level1.png', w: 155, h: 185, alt: '돌계단 위에 앉아 눈을 감고 있는 검은 고양이 패니' } },
    { img: 'assets/levelup/panny-lv2.png', w: 125, h: 122, sub: '새로운 보금자리 획득!', caption: '패니에게 아늑한 상자가 생겼어요.',
      home: { img: 'assets/levelup/panny-lv2.png', w: 190, h: 185, alt: '아늑한 상자 안에 들어가 있는 검은 고양이 패니' } },
    { img: 'assets/levelup/panny-lv3.png', w: 125, h: 127, sub: '새로운 보금자리 획득!', caption: '패니에게 푹신한 방석이 생겼어요!',
      home: { img: 'assets/levelup/panny-lv3.png', w: 182, h: 185, alt: '푹신한 방석 위에 앉아 있는 검은 고양이 패니' } },
    { img: 'assets/levelup/panny-lv4.png', w: 209, h: 130, sub: '새로운 보금자리 획득!', caption: '패니에게 포근한 잠자리가 생겼어요!',
      home: { img: 'assets/levelup/panny-lv4.png', w: 297, h: 185, alt: '포근한 베개를 베고 잠든 검은 고양이 패니' } },
    { img: 'assets/levelup/panny-lv5.png', w: 151, h: 135, sub: '새로운 보금자리 획득!', caption: '패니에게 멋진 캣타워가 생겼어요!',
      home: { img: 'assets/levelup/panny-lv5.png', w: 207, h: 185, alt: '멋진 캣타워에 올라 있는 검은 고양이 패니' } }
  ];
  function stage(level) { return STAGES[Math.max(1, Math.min(level, STAGES.length)) - 1]; }

  function getSeen() {
    try { return parseInt(localStorage.getItem(SEEN_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function setSeen(n) {
    try { localStorage.setItem(SEEN_KEY, String(n)); } catch (e) { /* 무시 */ }
  }

  // 지금 레벨이 마지막으로 본 레벨보다 높으면 팝업
  function check() {
    var st = state();
    var seen = getSeen();
    if (st.level > seen) {
      setSeen(st.level);
      show(st);
    } else if (st.level < seen) {
      setSeen(st.level);
    }
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(st) {
    if (document.querySelector('.lvup-overlay')) return;
    var stage = STAGES[Math.min(st.level, STAGES.length) - 1];
    // 레벨업 창이 뜨는 순간 홈 캐릭터 등 화면 속 패니도 새 레벨로 바뀌도록 알림
    document.dispatchEvent(new CustomEvent('panny:levelup', { detail: { level: st.level } }));
    var into = st.points % PER_LEVEL;
    var left = PER_LEVEL - into;

    // 화면 프레임(body 의 첫 요소) 위에 덮음
    var host = document.querySelector('body > main, body > .home') || document.body;
    if (host !== document.body && getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var overlay = document.createElement('div');
    overlay.className = 'lvup-overlay';
    overlay.innerHTML =
      '<canvas class="lvup-confetti" aria-hidden="true"></canvas>' +
      '<div class="lvup" role="dialog" aria-modal="true" aria-labelledby="lvup-title" tabindex="-1">' +
        '<div class="lvup__badge" aria-hidden="true">level up</div>' +
        '<div class="lvup__card">' +
          '<h2 class="lvup__title" id="lvup-title"><span>Level Up</span><strong>' + st.level + '</strong></h2>' +
          '<p class="lvup__sub">' + stage.sub + '</p>' +
          '<div class="lvup__art"><img src="' + stage.img + '" width="' + stage.w + '" height="' + stage.h + '" alt="" /></div>' +
          '<p class="lvup__caption">' + stage.caption + '</p>' +
          '<div class="lvup__progress">' +
            '<div class="lvup__progress-head"><span>다음 레벨까지</span><b>' + into + '/' + PER_LEVEL + '</b></div>' +
            '<div class="lvup__track" role="progressbar" aria-label="다음 레벨까지 경험치" aria-valuemin="0" aria-valuemax="' + PER_LEVEL + '" aria-valuenow="' + into + '"><div class="lvup__fill" style="width:0"></div></div>' +
            '<p class="lvup__hint">' + left + '점을 더 모으면 다음 단계로 성장해요.</p>' +
          '</div>' +
          '<div class="lvup__btns">' +
            '<button type="button" class="lvup__btn" data-lvup="share">자랑하기</button>' +
            '<button type="button" class="lvup__btn lvup__btn--outline" data-lvup="close">돌아가기</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    host.appendChild(overlay);

    var dialog = overlay.querySelector('.lvup');
    var prevFocus = document.activeElement;
    var siblings = Array.prototype.filter.call(host.children, function (el) { return el !== overlay; });
    siblings.forEach(function (el) { el.inert = true; });
    dialog.focus();

    requestAnimationFrame(function () {
      overlay.querySelector('.lvup__fill').style.width = Math.round(into / PER_LEVEL * 100) + '%';
    });
    if (!reduceMotion) confetti(overlay.querySelector('.lvup-confetti'), dialog);

    function close() {
      siblings.forEach(function (el) { el.inert = false; });
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    overlay.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lvup]');
      if (!btn) return;
      if (btn.dataset.lvup === 'close') return close();
      var text = '패니가 Lv. ' + st.level + '이 되었어요! ' + stage.caption;
      if (navigator.share) {
        navigator.share({ title: '패니 레벨업', text: text }).catch(function () { /* 취소 무시 */ });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { btn.textContent = '복사했어요'; }, function () {});
      }
    });
  }

  // 보라색 종이 조각이 팝업 가운데서 터져 나와 흩날림
  function confetti(canvas, origin) {
    var COLORS = ['#9B87F5', '#868BF2', '#B9A8FA', '#6E5BD9', '#D9D0FD', '#584E91'];
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var o = origin.getBoundingClientRect();
    var cx = o.left - rect.left + o.width / 2;
    var cy = o.top - rect.top + o.height * 0.3;
    var parts = [];
    for (var i = 0; i < 140; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 4 + Math.random() * 9;
      parts.push({
        x: cx, y: cy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 4,
        w: 5 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        flip: Math.random() * Math.PI,
        vf: 0.08 + Math.random() * 0.15,
        color: COLORS[i % COLORS.length]
      });
    }
    var start = performance.now();
    var DURATION = 2600;
    function frame(now) {
      var t = now - start;
      if (!canvas.isConnected) return;
      ctx.clearRect(0, 0, rect.width, rect.height);
      var fade = t > DURATION - 600 ? Math.max(0, (DURATION - t) / 600) : 1;
      parts.forEach(function (p) {
        p.vx *= 0.97;
        p.vy = p.vy * 0.97 + 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.flip += p.vf;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.flip)); // 종이가 뒤집히며 펄럭이는 느낌
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (t < DURATION) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, rect.width, rect.height);
    }
    requestAnimationFrame(frame);
  }

  // ---------- 자동 연결 ----------
  if (document.body && document.body.dataset.level === 'try') log('try');
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.stop-dialog a[href]')) log('adjust');
  });
  // 미리보기: 주소 끝에 ?levelup=3 처럼 붙이면 저장된 점수와 상관없이 그 레벨 팝업을 띄움
  function boot() {
    var preview = parseInt(new URLSearchParams(location.search).get('levelup'), 10);
    if (preview > 0) show({ level: preview, points: (preview - 1) * PER_LEVEL, percent: 0 });
    else check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return { log: log, state: state, check: check, show: show, stage: stage, PER_LEVEL: PER_LEVEL };
})();
