# AI & Harness 코딩 표준 가이드 (BEST_ERP)
이 가이드는 향후 AI 어시스턴트(Claude/Gemini 등)와 개발자가 일관된 코드를 작성할 수 있도록 뼈대(Harness)를 제공합니다.

## 1. 기술 스택 (Tech Stack)
- **Frontend**: HTML5, Vanilla JavaScript (ESM 모듈), CSS3 (Tailwind 지양, Custom Vanilla CSS 선호)
- **Build Tool**: Vite (로컬 개발 서버 및 빌드 병합용)
- **Backend / Database**: Firebase v10 SDK (Auth, Firestore, Storage)

## 2. 프롬프트 및 시스템 제어 규칙 (Harness Rules)
1. **인코딩 철칙 (UTF-8)**: 
   - Windows PowerShell 스크립트를 통한 텍스트 조작은 한글 인코딩을 파괴할 우려가 큽니다.
   - 대규모 텍스트 처리나 DOM 조작 스크립트는 반드시 Node.js (write_to_file 도구 등) 방식으로 작성하여 인코딩을 보호하세요.
2. **보안 (Global Auth Guard)**:
   - 신규 HTML 페이지 추가 시 `<script type="module">` 블록에 `checkAdminAuth()`를 기본 탑재하여 인가되지 않은 접근을 리다이렉션 방어해야 합니다.
3. **스타일링 원칙 (UI/UX Aesthetics)**:
   - 폰트는 구글 폰트(Inter) 고정. Glassmorphism, Micro-animations 등 고급스러운 룩앤필 유지.
4. **Firebase 모듈화**:
   - 직접 Firebase CDN을 넣지 않으며, 모든 DB 핸들링은 기능별로 구분된 `services/` 형태의 래퍼(Wrapper) 안에서 구현합니다.
5. **소스 복구 및 Git 체크아웃 주의 (Uncommitted Changes)**:
   - 장애 발생 시 급하게 `git checkout` 등으로 파일을 롤백하면, 최근 AI가 생성하고 아직 커밋되지 않은 새 기능들(uncommitted changes)이 영구적으로 유실될 수 있습니다.
   - 복구나 롤백 명령 전에는 반드시 변경된 내용이나 파일 상태를 면밀히 점검하고 사전 백업을 철저히 진행하세요.

## 3. 디렉토리 구조 (Directory Structure)
```text
BEST_ERP/
├── index.html            // 메인 대시보드 (로그인 시)
├── login.html            // 통합 Auth 게이트웨이
├── admin/                // 관리자 전용 뷰 
├── assets/               // CSS, Image 리소스
├── docs/                 // 기획서 및 하네스 코딩 명세서
├── scripts/              // 각종 유틸리티 훅 (시딩, 인코딩 픽스 등)
└── services/             // API 로직 (firebase-config, auth, materialApi, purchaseApi)
```
