// AI 상담하기 (Figma 1:2268)
// - 첫 진입: 패니(고양이) 인사 말풍선만 노출
// - 사용자가 입력창/빠른 답변 칩으로 메시지를 보내면 사용자 말풍선 추가
// - 이후 패니의 답변은 '입력중' 애니메이션만 반복 (실제 답변 없음)
// - 입력창을 클릭하면 바로 타자로 입력 가능, Enter 또는 전송 버튼으로 보냄
(function () {
  const log = document.getElementById('chat-log');
  const scroller = document.querySelector('.chat__scroll');
  const form = document.getElementById('chat-form');
  const field = document.getElementById('chat-text');
  const chips = document.querySelectorAll('.chat-chip');

  function scrollToBottom() {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
  }

  function typingGroup() {
    const li = document.createElement('li');
    li.className = 'chat-group chat-group--bot chat-group--typing';
    li.innerHTML =
      '<img class="chat-avatar" src="assets/counsel/panny-avatar.png" width="44" height="36" alt="패니" />' +
      '<p class="chat-bubble chat-bubble--bot chat-typing" role="status" aria-label="패니가 입력 중이에요">' +
      '<span></span><span></span><span></span></p>';
    return li;
  }

  function send(text) {
    const msg = text.trim();
    if (!msg) return;

    // 기존 입력중 표시는 제거하고 항상 맨 아래에 하나만 유지
    const prevTyping = log.querySelector('.chat-group--typing');
    if (prevTyping) prevTyping.remove();

    const li = document.createElement('li');
    li.className = 'chat-group chat-group--user';
    const bubble = document.createElement('p');
    bubble.className = 'chat-bubble chat-bubble--user';
    bubble.textContent = msg;
    li.appendChild(bubble);
    log.appendChild(li);

    log.appendChild(typingGroup());
    scrollToBottom();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send(field.value);
    field.value = '';
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => send(chip.textContent));
  });
})();
