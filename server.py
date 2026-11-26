"""패니켓 로컬 서버 — 정적 페이지 + AI 상담 API(/api/counsel)

실행:  python server.py            (기본 포트 8000, 다른 포트는 python server.py 5174)
       추가 설치 없이 파이썬 기본 기능만 사용해요.

- AI는 Google AI Studio의 Gemini API를 사용해요.
- API 키는 config.py(또는 환경변수 GEMINI_API_KEY)에만 두고 브라우저로 보내지 않아요.
- 키가 'ABC'(자리표시자)면 AI를 부르지 않고 503 "준비 중" 응답을 돌려줘요.
- 대화 내용은 서버에 저장하거나 로그로 남기지 않아요. 답변을 만들기 위해 Gemini API로만 보내요.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from counsel_prompt import SYSTEM_PROMPT

PLACEHOLDER_KEY = "ABC"
DEFAULT_MODEL = "gemini-3.5-flash-lite"
# 기본 모델이 혼잡(503)·한도 초과(429)·종료(404)일 때 차례로 시도할 모델
DEFAULT_FALLBACKS = ["gemini-flash-lite-latest", "gemini-3.5-flash"]
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
MAX_TURNS = 30           # 서버로 받는 최근 메시지 수 상한
MAX_CHARS = 1000         # 메시지 하나의 글자 수 상한
MAX_BODY = 64 * 1024     # 요청 본문 크기 상한(byte)
TIMEOUT = 30             # 모델 하나당 응답 대기 시간(초)
RETRY_CODES = (404, 429, 500, 503, 504)

REFUSAL_REPLY = "그 이야기는 패니가 답하기 어려워요. 지금 마음이 어떤지 조금 더 들려줄래요?"


def load_config():
    try:
        import config  # 로컬 설정 파일 (.gitignore)
    except ImportError:
        config = None
    key = os.environ.get("GEMINI_API_KEY", "").strip() or str(getattr(config, "GEMINI_API_KEY", "")).strip()
    model = os.environ.get("GEMINI_MODEL", "").strip() or str(getattr(config, "GEMINI_MODEL", "")).strip()
    fallbacks = getattr(config, "GEMINI_FALLBACK_MODELS", DEFAULT_FALLBACKS)
    chain = [model or DEFAULT_MODEL] + [str(m).strip() for m in fallbacks if str(m).strip()]
    return key, list(dict.fromkeys(chain))   # 중복 제거, 순서 유지


API_KEY, MODELS = load_config()
MODEL = MODELS[0]


def ai_ready():
    return bool(API_KEY) and API_KEY != PLACEHOLDER_KEY


def clean_messages(raw):
    """브라우저에서 온 대화를 검사해 user/assistant가 번갈아 나오는 목록으로 정리."""
    if not isinstance(raw, list):
        return None
    msgs = []
    for item in raw[-MAX_TURNS:]:
        if not isinstance(item, dict):
            return None
        role, content = item.get("role"), item.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str):
            return None
        content = content.strip()[:MAX_CHARS]
        if not content:
            continue
        if msgs and msgs[-1]["role"] == role:          # 같은 역할이 연달아 오면 합치기
            msgs[-1]["content"] += "\n" + content
        else:
            msgs.append({"role": role, "content": content})
    while msgs and msgs[0]["role"] != "user":           # 첫 메시지는 user 여야 함
        msgs.pop(0)
    if not msgs or msgs[-1]["role"] != "user":
        return None
    return msgs


def ask_panny(messages):
    """Gemini generateContent 호출 → (HTTP 상태, 응답 JSON)."""
    body = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [
            {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
            for m in messages
        ],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048},
    }
    payload = json.dumps(body).encode("utf-8")

    data, last_error = None, (502, {"error": "upstream"})
    for model in MODELS:
        req = urllib.request.Request(
            f"{API_BASE}/{model}:generateContent",
            data=payload,
            headers={"Content-Type": "application/json", "x-goog-api-key": API_KEY},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
                data = json.loads(res.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as e:
            # 원인은 서버 콘솔에만 표시(대화 내용은 표시 안 함)
            sys.stderr.write(f"[Gemini] {model}: HTTP {e.code}\n")
            if e.code in RETRY_CODES:
                last_error = (429, {"error": "busy"}) if e.code in (429, 503) else (502, {"error": "upstream"})
                continue                                  # 다음 모델로
            if e.code in (400, 401, 403):
                sys.stderr.write("[Gemini] API 키나 모델 설정(config.py)을 확인하세요.\n")
                return 502, {"error": "auth"}
            return 502, {"error": "upstream"}
        except (urllib.error.URLError, TimeoutError, ValueError):
            sys.stderr.write(f"[Gemini] {model}: 연결 실패/시간 초과\n")
            last_error = (502, {"error": "network"})
            continue
    if data is None:
        return last_error

    if (data.get("promptFeedback") or {}).get("blockReason"):
        return 200, {"reply": REFUSAL_REPLY}
    candidates = data.get("candidates") or []
    if not candidates:
        return 502, {"error": "empty"}
    cand = candidates[0]
    parts = (cand.get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
    if not text:
        if cand.get("finishReason") in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"):
            return 200, {"reply": REFUSAL_REPLY}
        return 502, {"error": "empty"}
    return 200, {"reply": text}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # 경로만 남기고 대화 내용은 절대 기록하지 않아요.
        sys.stderr.write("%s %s\n" % (self.command, self.path.split("?")[0]))

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/counsel/status":
            return self.send_json(200, {"ready": ai_ready()})
        # 서버 코드·설정 파일(키 포함)은 브라우저로 내보내지 않기
        if path.endswith(".py") or "__pycache__" in path or path.startswith("/.git"):
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/counsel":
            return self.send_error(404)
        if not ai_ready():
            return self.send_json(503, {"error": "no_key"})

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.send_json(400, {"error": "bad_request"})
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {"error": "bad_request"})

        messages = clean_messages(data.get("messages") if isinstance(data, dict) else None)
        if messages is None:
            return self.send_json(400, {"error": "bad_request"})

        status, payload = ask_panny(messages)
        return self.send_json(status, payload)


def main():
    # Windows 콘솔(cp949)에서 한글·기호 출력 오류가 나지 않게
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except AttributeError:
            pass
    port = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8000))
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    state = f"Gemini 연결됨 ({MODEL})" if ai_ready() else "API 키 없음(ABC): AI 상담은 '준비 중'으로 표시돼요"
    print(f"패니켓 서버: http://localhost:{port}  [{state}]", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
