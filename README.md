# 가람 도구 모음 (FRAMVERSE)

AI 기반 콘텐츠 제작자를 위한 통합 도구 플랫폼.

---

## 접속 주소

| 환경 | URL |
|------|-----|
| 라이브 (Netlify) | https://garamtools.netlify.app |
| 로컬 개발 서버 | http://localhost:5173 |

---

## 배포 구조

```
코드 수정
  → git push (GitHub: GARAM4466/garam_tools)
    → Netlify 자동 감지
      → npm run build (dist/ 생성)
        → garamtools.netlify.app 자동 반영
```

- **GitHub 레포**: https://github.com/GARAM4466/garam_tools
- **Netlify**: GitHub main 브랜치 push 시 자동 빌드/배포
- **빌드 명령**: `npm run build`
- **배포 폴더**: `dist`

---

## 로컬 개발 시작

```bash
npm install       # 최초 1회
npm run dev       # 개발 서버 시작 → http://localhost:5173
```

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | React 19 |
| 번들러 | Vite 7 |
| 스타일 | Tailwind CSS 4 |
| 아이콘 | Lucide React |
| ZIP 처리 | JSZip |
| 패키지 매니저 | npm |

---

## 구현된 도구

| 도구 | 파일 | 상태 |
|------|------|------|
| 이미지 그리드 분할기 | `src/components/ImageSplitterTool.jsx` | ✅ 완성 |
| 비디오 컷 추출기 | `src/components/VideoReferenceCollector.jsx` | ✅ 완성 |
| AI 스토리보드 | - | 미개발 |
| 카메라 스튜디오 | - | 미개발 |

---

## 주요 파일 구조

```
src/
├── App.jsx                              # 메인 앱, 도구 라우팅
├── index.css                            # Tailwind + 커스텀 스타일
└── components/
    ├── ImageSplitterTool.jsx
    └── VideoReferenceCollector.jsx

.claude/
└── handoff.md                           # Claude 세션 인수인계
CLAUDE.md                                # Claude 작업 규칙
```

---

## 디자인 시스템

- **배경**: `#0b0b0b` (다크)
- **브랜드 컬러**: `#00ff41` (네온 그린)
- **카드 배경**: `#151515`
- **폰트**: Inter (Google Fonts)
