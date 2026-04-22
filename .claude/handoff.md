# Session Handoff

> 세션 시작 시 이 파일을 먼저 읽고, 종료 전 업데이트할 것.

---

## 📍 현재 상태
- 프롬프트 라이브러리 완성. 다음 도구 개발 단계.

## ✅ 완료된 작업
- 이미지 그리드 분할기 (100%)
- 비디오 레퍼런스 수집기 (100%) — diff 소형 캔버스 + 루미넌스 최적화, 영상 교체 버튼, AI 분석 제거
- 프롬프트 라이브러리 (100%) — Supabase 연동, 썸네일 업로드 + 드래그 포커스 포인트
- 홈 화면 UI
- GitHub + Netlify 자동 배포 연결

## 🔜 다음 할 일
1. AI 스토리보드 도구 개발
2. 카메라 스튜디오 도구 개발

## 🔒 결정된 사항
- 도구 목록: AI 스토리보드 / 이미지 그리드 분할기 / 카메라 스튜디오 / 비디오 레퍼런스 수집기 / 프롬프트 라이브러리 (5개)
- 배포: Netlify 자동 배포 (git push 시 반영)
- 개발 서버 포트: 5173 고정
- Supabase: prompts 테이블 (id, title, content, tags, memo, thumbnail_url, thumbnail_position, created_at, updated_at)
- RLS: anon 전체 허용 (개인용)

## ⚠️ 열린 문제
-

## 🐛 알려진 이슈
-

## 📁 주요 파일 경로
- 메인: src/App.jsx
- 이미지 분할기: src/components/ImageSplitterTool.jsx
- 비디오 수집기: src/components/VideoReferenceCollector.jsx
- 프롬프트 라이브러리: src/components/PromptVault.jsx
- Supabase 클라이언트: src/lib/supabase.js
- 배포 URL: https://garamtools.netlify.app
- GitHub: https://github.com/GARAM4466/garam_tools

---
_Last updated: 2026-04-23_
