import fs from 'fs';
import path from 'path';

const docsDir = path.join(process.cwd(), 'docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

// 1. Vision and Direction
const doc1 = `# BEST Group 통합 경영 자원 관리 (ERP) 개발 방향성

## 1. 시스템 개요
본 시스템은 기존 단순 자재 카탈로그 검색 도구('BEST MATERIAL DATA')에서 발전하여, BEST Group의 **전사적 경영 관리와 자원 통제**를 일원화하는 실무 중심의 ERP 플랫폼으로 진화합니다.

## 2. 발전 목표 (Core Vision)
- **Single Source of Truth (단일 진실 공급원)**: 모든 부서(인테리어, 엘리베이터, 소방, 주차 등)가 동일한 표준 원가 및 협력사 데이터를 바탕으로 투명하게 소통.
- **Workflow Automation (워크플로우 자동화)**: 기안 -> 조달 -> 승인 -> 발주로 이어지는 흐름을 시스템화하여 문서 누락 및 휴먼 에러 방지.
- **Data-Driven Decision (데이터 기반 경영)**: 글로벌 API (부품 시세) 및 사내 누적 단가를 비교하여 최적의 이익률(Margin) 도출.

## 3. 페이즈별 로드맵 (Roadmap)
- **[Phase 1] 자재 마스터 데이터 확립 (완료)**
  - 카테고리별 자재 DB화, 외부 API 모사 연동(엘리베이터 부품 등), 이미지 및 단가 시각화.
- **[Phase 2] 내부 통제 및 전자결재 (현재 적용 중)**
  - 구글 Auth 기반 글로벌 접근 제어(Auth Guard).
  - 부서별 장바구니 및 구매 품의 상신, 팀장/CEO 승인 대시보드 연동.
- **[Phase 3] 프로젝트 견적(Quotation) 및 이익률 분석 (Next Step)**
  - 조합된 자재 통계를 기반으로 고객 제출용 PDF 견적서 자동 생성.
  - 마진율 자동 계산 및 위험 비용(Risk Cost) 관리.
- **[Phase 4] 재고(Inventory) 및 협력사 관리 포털 (Future)**
  - 자재 입/출고 추적, 협력사 전용 로그인 및 납품 단가 직접 입찰 기능.
`;

// 2. Harness Coding Standard
const doc2 = `# AI & Harness 코딩 표준 가이드 (BEST_ERP)
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
   - 신규 HTML 페이지 추가 시 \`<script type="module">\` 블록에 \`checkAdminAuth()\`를 기본 탑재하여 인가되지 않은 접근을 리다이렉션 방어해야 합니다.
3. **스타일링 원칙 (UI/UX Aesthetics)**:
   - 폰트는 구글 폰트(Inter) 고정. Glassmorphism, Micro-animations 등 고급스러운 룩앤필 유지.
4. **Firebase 모듈화**:
   - 직접 Firebase CDN을 넣지 않으며, 모든 DB 핸들링은 기능별로 구분된 \`services/\` 형태의 래퍼(Wrapper) 안에서 구현합니다.

## 3. 디렉토리 구조 (Directory Structure)
\`\`\`text
BEST_ERP/
├── index.html            // 메인 대시보드 (로그인 시)
├── login.html            // 통합 Auth 게이트웨이
├── admin/                // 관리자 전용 뷰 
├── assets/               // CSS, Image 리소스
├── docs/                 // 기획서 및 하네스 코딩 명세서
├── scripts/              // 각종 유틸리티 훅 (시딩, 인코딩 픽스 등)
└── services/             // API 로직 (firebase-config, auth, materialApi, purchaseApi)
\`\`\`
`;

// 3. Work Order Spec
const doc3 = `# 차기 개발 작업 지시서 (Work Order Specification)

## [완료된 주요 작업]
1. Firebase Auth 연동 및 Global Auth Guard 기반 로그인 보안 강화.
2. 품목별 카테고리 개편 (인테리어/엘리베이터/소방/주차장).
3. 조달(구매) 장바구니 작성 및 결재 대시보드.
4. 더미 제품 사진 전체 정규화 및 실제 B2B API 부품 데이터 연결 모사 테스트.

## [차기 스프린트 (Sprint 1) - 프로젝트 견적 시스템 고도화]
### Task 1: 견적 생성기 (Quotation Builder) UI 구축
- **목표**: 선택한 품의서(구매 요청건)를 바탕으로 고객사 제출용 견적서(Invoice/Quotation)를 자동 생성.
- **기능**:
  - \`estimates.html\` 신규 생성.
  - 마진율(Margin %), 세금(VAT), 운송비, 제반 경비를 일괄 혹은 개별 적용 가능한 계산기 로직.
  - 최종본을 A4 형식의 미리보기 뷰로 출력 및 인쇄/PDF 저장 기능(\`window.print()\`) 탑재.

### Task 2: 메인 대시보드(Dashboard) 시각화 데이터 연동
- **목표**: \`admin/dashboard.html\`에 단순히 하드코딩된 숫자가 아닌 실제 통계 시각화 도입.
- **기능**:
  - Chart.js를 이용해 '카테고리별 구매 예산 집행액 추이' 등 시각화.

### Task 3: 권한 관리 로직 실제 연동 (User Role Enforcement)
- **목표**: 하드코딩된 UI 권한 테이블을 실제 Firestore Security Rules에 맞게 연동.
- **기능**:
  - \`users\` 컬렉션에 사용자 데이터 저장하여 특정 등급(SUPER/ADMIN/VIEWER) 부여.
`;

fs.writeFileSync(path.join(docsDir, '01_개발방향성(Vision_and_Direction).md'), doc1, 'utf8');
fs.writeFileSync(path.join(docsDir, '02_하네스코딩_표준(Harness_Coding_Standard).md'), doc2, 'utf8');
fs.writeFileSync(path.join(docsDir, '03_차기_개발작업지시서(Work_Order_Spec).md'), doc3, 'utf8');

console.log('Successfully generated the Planning and Harness Markdown documents in docs/ directory.');
