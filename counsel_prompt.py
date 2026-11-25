# 패니 AI 상담 — 시스템 프롬프트
# 상담 원칙은 prompts/counsel-system.txt 한 곳에서 관리해요.
# (로컬 server.py 와 Vercel 함수 api/counsel.js 가 같은 파일을 읽어요.)
import os

_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts", "counsel-system.txt")

with open(_PATH, encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()
