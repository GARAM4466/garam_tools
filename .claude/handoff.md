# Session Handoff

> 세션 시작 시 이 파일을 먼저 읽고, 종료 전 업데이트할 것.

---

## 📍 현재 상태
- 로컬 개발 — `npm run dev` → http://localhost:5173 (PM2로 항상 켜두기 가능)
- **전체 도구 1차 완성 상태** — 쓰면서 디벨로업 방식으로 전환.
- 캐릭터 생성기 프롬프트 엔진 고도화 완료 — 실사 기준 테스트 통과
- **프롬프트 라이브러리 DB를 Supabase → GitHub로 이전 완료** (Supabase 무료 티어 1주 비활성 시 자동 일시정지 문제 해결)

## ✅ 완료된 작업

### 2026-05-23 세션 2차: HTML 셀렉터 도구 추가 (id 11)
- **워크플로우**: 폴더 안의 각 파일 = 4분할 그리드 이미지 1장. 셀렉터가 **캔버스로 그 파일을 셀별로 잘라** 보여줌 → 좋은 컷 클릭 선택 → 잘린 PNG + selection.json export → 업스케일링(Higgsfield MCP 등)에 투입.
- **이미지 접근**: File System Access API (`showDirectoryPicker`) — 폴더 한 번 선택하면 하위까지 재귀 스캔, 업로드/사전 manifest 스크립트 불필요. F드라이브 등 로컬 폴더 직접 읽음. 미지원 브라우저(FF/Safari)는 `<input webkitdirectory>` 폴백.
- **신규 파일**:
  - `src/lib/fileSystem.js` — FS Access 래퍼: 폴더 선택/재귀 스캔, IndexedDB 핸들 영속화("이전 폴더 다시 열기"), verifyPermission, getSubdirHandle/writeBlobToDirectory/writeJsonToDirectory, webkitdirectory 폴백
  - `src/lib/imageGrid.js` — `GRID_MODES`(2x2 / 1x4) + `cropFileToCells(file, rows, cols, type, quality)` (createImageBitmap + canvas, row-major 셀 순서)
  - `src/components/HtmlSelectorTool.jsx` — 메인 UI
- **그리드 분할**: 토글 2모드 — **2x2(4분할)** / **1x4(세로 4칸)**. 한 파일 = 한 그룹 행, 셀 4개에 1~4 번호 badge.
- **선택**: cell id = `relativePath#idx`. `selected` Set, 클릭 토글, 노란 테두리. localStorage 자동 저장 키 = `html-selector:selection:{folder}:{gridMode}` (모드별 분리). 새로고침 유지.
- **컨트롤바**(sticky top-16): 카운터(cells/files/selected) / 그리드 모드 토글 / 보이는 컷 전체 선택 / 전체 해제 / 폴더에 저장(FS 시) / Export(PNG+JSON).
- **Export 2종**:
  - `Export (PNG + JSON)`: ZIP 다운로드. `images/*.png`(풀해상도 크롭) + `selection.json`. 어디서나 동작.
  - `폴더에 저장`(FS 지원 시): 원본 폴더 안 `_selected_<timestamp>/` 하위에 `images/` PNG + selection.json 직접 기록.
  - ⚠️ 표시는 빠르게 jpeg 0.82로 크롭, **export는 SELECTED 셀만 풀해상도 PNG 재크롭**.
- **selection.json 스키마**: `{ project_id, exported_at, grid, total_files, total_cells, total_selected, items[{id, source_file, source_folder, cell_index, grid, output_file}] }`
- **필터 탭**: top-level 하위폴더 자동 생성 (All + 폴더명)
- **성능**: GroupRow가 IntersectionObserver로 viewport 진입 시에만 파일 1회 디코드→4셀 크롭→objectURL, 언마운트 시 revoke.
- **App.jsx**: tools id 11, MousePointerClick 아이콘, 라우팅 분기. **index.css**: `.ctrl-btn` 추가.
- **검증**: `npm run build` 통과(1741 모듈), 신규 파일 lint clean. ⚠️ 폴더 선택→크롭 표시→export 인터랙션은 네이티브 다이얼로그 필요 → 브라우저 수동 테스트 필요(미완).
- **다음 단계 아이디어**: export된 PNG/selection.json을 Higgsfield MCP 업스케일에 연결 (별도 작업).

### 2026-05-23 세션: 프롬프트 라이브러리 DB를 GitHub로 이전
- **배경**: Supabase 무료 티어가 1주일 비활성 시 자동 일시정지 → 한 달쯤 지나면 DB 잠김
- **신규 파일**: `src/lib/github.js` — GitHub Contents API 클라이언트 (`fetch`만 사용, 외부 SDK 없음)
  - `fetchPrompts / savePrompt / deletePrompt` → `prompts.json` 한 파일에 배열로 저장 (읽기→쓰기 2-call, 저장마다 커밋 생성)
  - `uploadThumbnail / deleteThumbnailByUrl` → `thumbnails/` 폴더에 파일 커밋, `raw.githubusercontent.com` URL로 표시
- **`PromptVault.jsx`**: Supabase 호출 전부 GitHub API로 교체, 모달에 저장 에러 표시(`saveError`) 추가
- **데이터 레포**: `GARAM4466/garam_tools_DB` (public — 썸네일 raw URL 표시 위해 public 필수, private면 `<img>` 인증 안 됨)
- **인증**: fine-grained PAT (`garam_tools_DB` 레포 한정, Contents Read+write). `VITE_GITHUB_TOKEN`으로 주입
  - 로컬 `.env.local` + Netlify 환경변수 양쪽에 설정
  - ⚠️ 클라이언트 번들에 박히므로 노출됨 — fine-grained라 피해는 이 레포 하나로 한정
- **상태바**: 현재 디렉토리 / 모델명 / 컨텍스트 사용량 표시 (`.claude/settings.json`)
- **검증 완료**: 로컬(localhost:5173) + 배포 사이트(garamtools.netlify.app) 양쪽에서 프롬프트 저장 정상 작동 확인

### 이전 세션 2차: 영상 스타일 시스템 도입

- **"아트 스타일" 제거 → "영상 스타일" 3버튼 교체**
  - 시네마틱: 기존 photorealistic/cinematic 프롬프트 그대로 유지
  - 광고: 커머셜 5가지 치환 원칙 적용
    - 피부: `realistic skin / visible pores` → `satin-skin finish, poreless appearance`
    - 조명: `natural lighting` → `butterfly beauty lighting, softbox setup`
    - 맥락: `cinematic` → `commercial photography aesthetic`
    - 품질: `photorealistic` → `magazine editorial quality`
    - 색감: `dark / moody` → `high-key clean, minimal shadow`
    - **Creative Direction 자동 치환 규칙 내장**: 컨셉 노트에 충돌 키워드를 써도 Claude가 먼저 커머셜 동의어로 치환 후 프롬프트 작성. Visual Style이 Creative Direction보다 항상 우선.
    - MOOD REFERENCE 패널 묘사도 commercial 씬으로 치환 (lifestyle campaign, beauty studio, luxury editorial 등)
  - 애니메이션: Pixar/DreamWorks 3D CGI 스타일, character bible 방향
- **default fallback**: `anime style` → `cinematic`
- **파일 변경**: `CharacterGeneratorTool.jsx` (UI/state), `openrouter.js` (STYLE_GUIDE 전면 교체)

### 이번 세션 1차: 캐릭터 생성기 전면 고도화
- **UI 구조 변경**: 토글 방식 → 8개 텍스트 슬롯 방식 (Character Requirements 블록)
  - 슬롯: 국적/성별/연령대, 얼굴형+인상, 눈/코/입 특징, 헤어, 체형, 퍼스널 컬러/무드, 포지션/콘셉트, 스타일링 방향성
  - 전체 분위기/컨셉 textarea 유지, 아트 스타일 토글 유지
  - 표정 토글 제거 (섹션 구조 변경으로 불필요)
- **프롬프트 생성 방식**: 템플릿 조합 → `anthropic/claude-sonnet-4-5` AI 생성
- **이미지 생성 응답 파싱**: `message.images` 배열 처리 추가 (Seedream 4.5 실제 응답 구조 대응)
- **프롬프트 구조 확정**: 100점 프롬프트 기반 6블록 구조 (도입 → 레이아웃 문단 → 섹션 리스트 → Overall aesthetic → Character requirements → Important)
- **섹션 구성 변경**:
  - 제거: 서브 포트레이트, 감정 표현 시트
  - 추가/격상: CHARACTER MOOD REFERENCE (시트 1/3 이상 점유, 4~6개 시네마틱 패널 — 다양한 환경/조명/상황에서 인물 표현)
  - 추가: Profile information section (name, age, height, position, personality, charm points 등 한국어 라벨)
- **7가지 프롬프트 작성 규칙 적용**: 섹션 내 품질 키워드 금지, 부정 프롬프트 위치 고정, 키워드 반복 금지 등
- **아트 스타일별 차별화 지시**: realistic 전용 `instructions` 필드 — 블록별 작성 가이드 포함
- **타이포그래피 강제 삽입**: Claude 생성 프롬프트 뒤에 코드로 직접 추가 (항상 포함 보장)
  - Profile information section 문구
  - Pretendard/Noto Sans KR 계열, 한영 병기 라벨, no garbled Korean characters 등

### 이전 세션 완료 항목
- 이미지 그리드 분할기 (100%)
- 비디오 레퍼런스 수집기 (100%) — 라이트박스, 원본 해상도 캡처
- 프롬프트 라이브러리 (100%) — Supabase 연동
- 이미지 스튜디오 (100%) — OpenRouter `google/gemini-2.0-flash-exp` 연동, 5개 플랫폼
- 브라우저 뒤로가기 정상 동작
- GitHub + Netlify 자동 배포 연결

## 🔜 다음 할 일
1. **classic GitHub 토큰 폐기** (위 열린 문제 참고)
2. 캐릭터 생성기 3가지 영상 스타일 테스트 (시네마틱/광고/애니메이션)
3. AI 스토리보드 도구 개발 (App.jsx에 분기 미구현 — 카드만 존재)
4. **OpenRouter API 키 회전** — 대시보드에서 새 키 발급 권장

## 🔒 결정된 사항
- 도구 목록: AI 스토리보드 / 이미지 그리드 분할기 / 이미지 스튜디오 / 비디오 레퍼런스 수집기 / 프롬프트 라이브러리 / 캐릭터 생성기 (6개)
- 배포: Netlify 자동 배포 (git push 시 반영)
- 개발 서버 포트: 5173 고정
- **프롬프트 라이브러리 저장소**: GitHub `GARAM4466/garam_tools_DB` (public) — `prompts.json` + `thumbnails/`
  - 프롬프트 객체: id(uuid), title, content, tags, memo, thumbnail_url, thumbnail_position, created_at, updated_at
  - 인증: fine-grained PAT, `VITE_GITHUB_TOKEN` (로컬 .env.local + Netlify 환경변수)
  - 이미지 스튜디오/캐릭터 생성기는 여전히 Supabase 미사용 (OpenRouter만 사용), 기존 Supabase 프로젝트는 사실상 미사용 상태
- **이미지 스튜디오 플랫폼 키**: `mj` / `flow` / `gpt` / `gen` / `json`
- **OpenRouter 모델 (이미지 스튜디오)**: `google/gemini-2.0-flash-exp` (max_tokens 1000)
- **OpenRouter 모델 (캐릭터 생성기 프롬프트)**: `anthropic/claude-sonnet-4-5` (max_tokens 1500)
- **캐릭터 생성기 이미지 모델**: `bytedance-seed/seedream-4.5` (modalities: ["image"])
- **캐릭터 프롬프트 구조**: 6블록 고정 (Claude 생성 + mandatory 강제 삽입 후처리)
- **영상 스타일 키**: `cinematic` / `commercial` / `animation` — STYLE_GUIDE에 각각 전용 instructions 포함
- **광고 스타일 자동 치환**: Creative Direction 충돌 키워드를 Claude가 커머셜 동의어로 자동 치환 (instructions 내 override 규칙)

## ⚠️ 열린 문제
- **🟡 classic GitHub 토큰(`ghp_BKHV...`) 폐기 필요** — 채팅에 노출됐고 계정 전체 `repo` 권한. `github.com/settings/tokens`에서 삭제. (현재 앱은 fine-grained 토큰만 사용하므로 삭제해도 영향 없음)
- **🔴 클라이언트 번들 키 노출 (구조적)**:
  - `VITE_OPENROUTER_API_KEY`, `VITE_GITHUB_TOKEN` 모두 빌드 시 클라이언트 번들에 박힘 → 배포 사이트에서 누구나 추출 가능
  - GitHub 토큰은 fine-grained라 피해가 `garam_tools_DB` 한 레포로 한정됨 (수용한 트레이드오프)
  - OpenRouter 키는 회전 권장
  - 근본 해결: Netlify Function 프록시로 서버사이드 호출 (Netlify 크레딧 여유 있을 때 고려)

## 🐛 알려진 이슈
- (발견 시 추가)

## 📁 주요 파일 경로
- 메인: src/App.jsx (history 기반 라우팅, 도구 분기)
- 이미지 분할기: src/components/ImageSplitterTool.jsx
- 비디오 수집기: src/components/VideoReferenceCollector.jsx
- 프롬프트 라이브러리: src/components/PromptVault.jsx (GitHub API 연동)
- 이미지 스튜디오: src/components/PromptBuilderTool.jsx
- **캐릭터 생성기**: src/components/CharacterGeneratorTool.jsx
- **GitHub 클라이언트**: src/lib/github.js (프롬프트 라이브러리 DB+스토리지)
- Supabase 클라이언트: src/lib/supabase.js (현재 미사용)
- **OpenRouter 클라이언트**: src/lib/openrouter.js (캐릭터 생성기 + 이미지 스튜디오 공용)
- 환경변수: .env.local (gitignore됨)
  - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_OPENROUTER_API_KEY / VITE_GITHUB_TOKEN
  - Netlify에도 동일 환경변수 등록 필요 (특히 VITE_GITHUB_TOKEN)
- 배포 URL: https://garamtools.netlify.app
- GitHub: https://github.com/GARAM4466/garam_tools

---
_Last updated: 2026-05-23 (프롬프트 라이브러리 DB Supabase → GitHub 이전, Netlify 배포 반영)_
