# 패니켓

불안·공황을 겪는 사람을 위한 마음 관리 앱(정적 웹 페이지) + AI 상담(패니).

## AI 상담 구조
- 화면: `counsel.html`, `counsel.js` — 브라우저에는 API 키가 없어요.
- AI 호출: Vercel 함수 `api/counsel.js`(배포용) / `server.py`(로컬용)가 Gemini API를 대신 불러요.
- 상담 원칙(시스템 프롬프트): `prompts/counsel-system.txt`
- **API 키는 저장소에 절대 넣지 않아요.** 배포에서는 Vercel 환경 변수, 로컬에서는 `config.py`(.gitignore)에만 둬요.

## 배포 (Vercel)
1. https://vercel.com 에 GitHub 계정으로 가입 → **Add New → Project** → 이 저장소 Import
2. Framework Preset은 **Other**, Build 설정은 비워 둔 채로
3. **Environment Variables**에 추가
   - `GEMINI_API_KEY` = Google AI Studio에서 발급받은 키
   - (선택) `GEMINI_MODEL` = `gemini-3.5-flash`
   - (선택) `GEMINI_FALLBACK_MODELS` = `gemini-3.8-flash,gemini-flash-latest`
4. **Deploy** → 나오는 `https://….vercel.app` 링크를 공유하면 돼요.

키가 없으면 앱은 그대로 쓸 수 있고, AI 상담만 "준비 중" 안내가 나와요.

## 로컬 실행
```
copy config.example.py config.py   # config.py 에 키 입력
python server.py                   # http://localhost:8000
```
