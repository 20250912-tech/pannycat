// Vercel 서버리스 함수: POST /api/counsel
// - Gemini API 키는 Vercel 프로젝트의 환경 변수(GEMINI_API_KEY)에만 있어요.
//   브라우저·GitHub 저장소 어디에도 키가 나타나지 않아요.
// - 대화 내용은 저장하거나 로그로 남기지 않고, 답변을 만들기 위해 Gemini API로만 보내요.
// - 로컬에서는 같은 역할을 server.py 가 해요(규칙·제한값 동일).
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.5-flash';
const DEFAULT_FALLBACKS = ['gemini-3.8-flash', 'gemini-flash-latest'];
const PLACEHOLDER_KEY = 'ABC';
const MAX_TURNS = 30;
const MAX_CHARS = 1000;
const TIMEOUT_MS = 25000;
const RETRY_CODES = new Set([404, 429, 500, 503, 504]);
const REFUSAL_REPLY = '그 이야기는 패니가 답하기 어려워요. 지금 마음이 어떤지 조금 더 들려줄래요?';

const SYSTEM_PROMPT = fs.readFileSync(path.join(process.cwd(), 'prompts', 'counsel-system.txt'), 'utf8');

function config() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_MODEL || '').trim() || DEFAULT_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const models = [...new Set([model, ...(fallbacks.length ? fallbacks : DEFAULT_FALLBACKS)])];
  return { key, models, ready: Boolean(key) && key !== PLACEHOLDER_KEY };
}

// 브라우저에서 온 대화를 검사해 user/assistant가 번갈아 나오는 목록으로 정리
function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = [];
  for (const item of raw.slice(-MAX_TURNS)) {
    if (!item || typeof item !== 'object') return null;
    const { role, content } = item;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    const text = content.trim().slice(0, MAX_CHARS);
    if (!text) continue;
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content += '\n' + text;
    else msgs.push({ role, content: text });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

async function askPanny(messages, { key, models }) {
  const payload = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  });

  let data = null;
  let lastError = [502, { error: 'upstream' }];
  for (const model of models) {
    let res;
    try {
      res = await fetch(`${API_BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: payload,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      console.warn(`[Gemini] ${model}: 연결 실패/시간 초과`);
      lastError = [502, { error: 'network' }];
      continue;
    }
    if (res.ok) { data = await res.json(); break; }
    console.warn(`[Gemini] ${model}: HTTP ${res.status}`);   // 대화 내용은 기록하지 않음
    if (RETRY_CODES.has(res.status)) {
      lastError = (res.status === 429 || res.status === 503) ? [429, { error: 'busy' }] : [502, { error: 'upstream' }];
      continue;
    }
    if ([400, 401, 403].includes(res.status)) return [502, { error: 'auth' }];
    return [502, { error: 'upstream' }];
  }
  if (!data) return lastError;

  if (data.promptFeedback && data.promptFeedback.blockReason) return [200, { reply: REFUSAL_REPLY }];
  const cand = (data.candidates || [])[0];
  if (!cand) return [502, { error: 'empty' }];
  const parts = (cand.content && cand.content.parts) || [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
  if (!text) {
    if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(cand.finishReason)) {
      return [200, { reply: REFUSAL_REPLY }];
    }
    return [502, { error: 'empty' }];
  }
  return [200, { reply: text }];
}

// 다른 사이트에서 이 함수를 불러 키를 대신 쓰지 못하게 같은 주소에서 온 요청만 허용
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;            // 같은 주소에서의 일부 요청은 Origin 이 없음
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }
  if (!sameOrigin(req)) return res.status(403).json({ error: 'forbidden' });

  const cfg = config();
  if (!cfg.ready) return res.status(503).json({ error: 'no_key' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const messages = cleanMessages(body && body.messages);
  if (!messages) return res.status(400).json({ error: 'bad_request' });

  const [status, payload] = await askPanny(messages, cfg);
  return res.status(status).json(payload);
};

module.exports.cleanMessages = cleanMessages;
