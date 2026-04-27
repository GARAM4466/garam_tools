# Session Handoff

> 세션 시작 시 이 파일을 먼저 읽고, 종료 전 업데이트할 것.

---

## 📍 현재 상태
- Netlify 무료 크레딧 소진으로 사이트 일시 중단. 다음 달 자동 복구 예정 (계정 billing cycle 기준 — 대시보드에서 확인).
- 로컬 개발만 가능 — `npm run dev` → http://localhost:5173
- **전체 도구 1차 완성 상태** — 쓰면서 디벨로업 방식으로 전환. 기능 추가/수정은 실사용 중 발견되는 필요에 따라 진행.
- 캐릭터 생성기 신규 추가 완료 (id: 9)

## ✅ 완료된 작업
- **이번 세션**: 캐릭터 생성기 (id: 9) 신규 개발
  - 성별/나이/헤어/눈/피부/체형/의상/소품/아트스타일/표정 입력
  - 컬러피커 + hex 텍스트 동기화 (헤어색상, 눈색상, 의상색상 최대 5개)
  - 표정 다중 선택
  - buildPrompt()로 GPT Image 2 최적화 영어 프롬프트 자동 조합
  - Seedream 4.5 (bytedance-seed/seedream-4.5) 미리보기 이미지 생성
- 이미지 그리드 분할기 (100%)
- 비디오 레퍼런스 수집기 (100%) — diff 소형 캔버스 + 루미넌스 최적화, 영상 교체 버튼, 200MB 지원
  - **이번 세션 추가**: 라이트박스(이미지 클릭 → 크게 보기 + 방향키 이동 + 다운로드 + Esc/배경 클릭 닫기)
  - **이번 세션 추가**: 원본 해상도 캡처 (OUTPUT_WIDTH=480 제거 → video.videoWidth/videoHeight 사용)
- 프롬프트 라이브러리 (100%) — Supabase 연동, 썸네일 업로드 + 드래그 포커스 포인트
- 홈 화면 UI
- GitHub + Netlify 자동 배포 연결
- **이번 세션**: 브라우저 뒤로가기 버튼 정상 동작 (App.jsx에 history.pushState + popstate 리스너 추가)
- **이번 세션**: 카메라 스튜디오 → "이미지 스튜디오"로 이름 변경
- **이번 세션**: 이미지 스튜디오 (= 샷 프롬프트 빌더) 도구 신규 개발 (id: 7)
  - 좌측: 레퍼런스 이미지 업로드 + BASE 프롬프트(잠금 토글)
  - 가운데: 씬 이름 + 9개 카테고리 탭 + 태그 pill + customText
  - 우측: 씬 목록(추가/삭제) + 플랫폼별 출력(KO/EN, 복사)
  - localStorage 자동저장 (key: `prompt-builder-state-v1`, 500ms debounce)
  - 씬 1개 남으면 삭제 버튼 비활성, 활성 씬 삭제 시 첫 씬으로 이동
- **이번 세션**: OpenRouter API 연동 (google/gemini-2.0-flash-exp)
  - 로컬 실시간 빌드 로직 완전 제거 → AI 호출로 전환
  - 5개 플랫폼: Midjourney / Google Flow / ChatGPT Images / 범용(gen) / JSON
  - 한국어 customText 자동 번역 + 태그 충돌 지능 처리 (system prompt에 명시)
  - "프롬프트 생성" 버튼 / 로딩 스피너 / 에러 메시지 박스
  - 씬 변경 시 결과 자동 초기화

## 🔜 다음 할 일
1. AI 스토리보드 도구 개발
2. **API 키 회전** — 채팅창 노출되었으므로 OpenRouter 대시보드에서 새 키 발급 권장
3. 실사용 중 발견되는 개선사항 디벨로업

## 🔒 결정된 사항
- 도구 목록: AI 스토리보드 / 이미지 그리드 분할기 / **이미지 스튜디오** / 비디오 레퍼런스 수집기 / 프롬프트 라이브러리 / **캐릭터 생성기** (6개)
- 배포: Netlify 자동 배포 (git push 시 반영)
- 개발 서버 포트: 5173 고정
- Supabase: prompts 테이블 (id, title, content, tags, memo, thumbnail_url, thumbnail_position, created_at, updated_at)
- RLS: anon 전체 허용 (개인용)
- **이미지 스튜디오 플랫폼 키**: `mj` / `flow` / `gpt` / `gen` / `json` (스펙 정합)
- **OpenRouter 모델**: `google/gemini-2.0-flash-exp` (max_tokens 1000) — 이미지 스튜디오
- **캐릭터 생성기 이미지 모델**: `bytedance-seed/seedream-4.5` (modalities: ["image"])
- **AI 분석 버튼**: Phase 2로 보류 (disabled + tooltip)

## ⚠️ 열린 문제
- Netlify 크레딧 소진 — 다음 달 자동 리셋. 현재 사이트 접속 불가.
- **🔴 OpenRouter API 키 보안 이슈**:
  - 채팅창에 평문 노출됨 → 작업 검증 후 키 회전 필요
  - Vite `import.meta.env.VITE_*`는 빌드 시 클라이언트 번들에 박힘 → 배포 시 누구나 추출 가능
  - 향후 보안 강화 시: Netlify Function 프록시로 서버사이드 호출 고려
  - OpenRouter 대시보드에서 사용량/지출 한도 설정 권장

## 🐛 알려진 이슈
- (테스트 후 발견 시 추가)

## 📁 주요 파일 경로
- 메인: src/App.jsx (history 기반 라우팅, 5개 도구 분기)
- 이미지 분할기: src/components/ImageSplitterTool.jsx
- 비디오 수집기: src/components/VideoReferenceCollector.jsx
- 프롬프트 라이브러리: src/components/PromptVault.jsx
- **이미지 스튜디오**: src/components/PromptBuilderTool.jsx
- **캐릭터 생성기**: src/components/CharacterGeneratorTool.jsx
- Supabase 클라이언트: src/lib/supabase.js
- **OpenRouter 클라이언트**: src/lib/openrouter.js
- 환경변수: .env.local (gitignore됨, `*.local` 패턴)
  - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / **VITE_OPENROUTER_API_KEY**
- 배포 URL: https://garamtools.netlify.app
- GitHub: https://github.com/GARAM4466/garam_tools

---
_Last updated: 2026-04-27 (캐릭터 생성기 신규 추가)_
