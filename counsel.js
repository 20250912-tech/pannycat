// AI 상담하기 (Figma 2001:20756)
// - 첫 진입: 패니(고양이) 안내·인사 말풍선 노출
// - 사용자가 입력창/빠른 답변 칩으로 보내면 → 사용자 말풍선 + 패니 '입력중' 표시
// - 서버(server.py)의 /api/counsel 이 Gemini API로 답을 받아 오면 패니 말풍선으로 바꿔 줌
// - API 키가 아직 'ABC'(자리표시자)이거나 서버가 없으면 "준비 중" 안내를 보여 줌
// - 대화는 이 페이지 메모리에만 있고, 페이지를 나가면 사라져요(저장·전송 안 함)
(function () {
  const ENDPOINT = '/api/counsel';
  const MAX_HISTORY = 30;            // 서버로 보내는 최근 메시지 수

  const log = document.getElementById('chat-log');
  const scroller = document.querySelector('.chat__scroll');
  const form = document.getElementById('chat-form');
  const field = document.getElementById('chat-text');
  const sendBtn = form.querySelector('.chat-input__send');
  const chips = document.querySelectorAll('.chat-chip');
  const nameEl = document.getElementById('chat-nickname');

  const FALLBACK = {
    no_key: '지금은 AI 상담을 준비하고 있어요. 조금만 기다려 주세요. 그동안 호흡이나 그라운딩 활동으로 마음을 쉬어 가도 좋아요 🐾',
    busy: '지금 이야기를 나누는 분이 많아서 답이 늦어지고 있어요. 잠시 후에 다시 말 걸어 줄래요?',
    error: '앗, 지금은 답을 전하기 어려워요. 잠시 후에 다시 이야기해 줄래요?',
  };

  // 닉네임은 화면 인사말에만 쓰고, AI로는 보내지 않아요.
  if (nameEl && window.Profile) {
    nameEl.textContent = window.Profile.load().nickname || window.Profile.DEFAULTS.nickname;
  }

  /** @type {{role:'user'|'assistant', content:string}[]} */
  const history = [];
  let pending = false;

  function scrollToBottom() {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
  }

  function botGroup() {
    const li = document.createElement('li');
    li.className = 'chat-group chat-group--bot';
    const avatar = document.createElement('img');
    avatar.className = 'chat-avatar';
    avatar.src = 'assets/counsel/panny-avatar.png';
    avatar.width = 44;
    avatar.height = 36;
    avatar.alt = '패니';
    li.appendChild(avatar);
    return li;
  }

  function showTyping() {
    const li = botGroup();
    li.classList.add('chat-group--typing');
    const p = document.createElement('p');
    p.className = 'chat-bubble chat-bubble--bot chat-typing';
    p.setAttribute('role', 'status');
    p.setAttribute('aria-label', '패니가 입력 중이에요');
    p.innerHTML = '<span></span><span></span><span></span>';
    li.appendChild(p);
    log.appendChild(li);
    return li;
  }

  // 입력중 말풍선을 실제 답변으로 교체
  function showReply(typingLi, text) {
    const li = botGroup();
    const p = document.createElement('p');
    p.className = 'chat-bubble chat-bubble--bot';
    p.textContent = text;              // AI 답변은 항상 텍스트로만 넣어요(HTML 해석 안 함)
    li.appendChild(p);
    typingLi.replaceWith(li);
    scrollToBottom();
  }

  function addUserBubble(text) {
    const li = document.createElement('li');
    li.className = 'chat-group chat-group--user';
    const bubble = document.createElement('p');
    bubble.className = 'chat-bubble chat-bubble--user';
    bubble.textContent = text;
    li.appendChild(bubble);
    log.appendChild(li);
  }

  function setPending(on) {
    pending = on;
    sendBtn.disabled = on;
    chips.forEach((c) => { c.disabled = on; });
  }

  async function requestReply() {
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
      });
    } catch (e) {
      return { ok: false, text: FALLBACK.error };
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* 정적 서버 등: JSON 아님 */ }

    if (res.ok && typeof data.reply === 'string' && data.reply.trim()) {
      return { ok: true, text: data.reply.trim() };
    }
    // AI 서버가 없는 정적 호스팅(python -m http.server 501, GitHub Pages 405 등) → 키 없음과 같은 안내
    if (data.error === 'no_key' || [404, 405, 501].includes(res.status)) {
      return { ok: false, text: FALLBACK.no_key };
    }
    if (data.error === 'busy') return { ok: false, text: FALLBACK.busy };
    return { ok: false, text: FALLBACK.error };
  }

  async function send(text) {
    const msg = text.trim();
    if (!msg || pending) return;

    addUserBubble(msg);
    history.push({ role: 'user', content: msg });
    const typing = showTyping();
    scrollToBottom();
    setPending(true);

    const result = await requestReply();
    // 실패하면 안내 문구는 기록에 넣지 않아요. 보낸 질문은 남겨 두어 다음 요청 때 함께 전달돼요
    // (연달아 온 user 메시지는 서버가 하나로 합쳐요).
    if (result.ok) history.push({ role: 'assistant', content: result.text });
    showReply(typing, result.text);
    setPending(false);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pending) return;
    send(field.value);
    field.value = '';
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => send(chip.textContent));
  });
})();
