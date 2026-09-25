# 차기 개발 작업 지시서 (Work Order Specification)

## [완료된 주요 작업]
1. Firebase Auth 연동 및 Global Auth Guard 기반 로그인 보안 강화.
2. 품목별 카테고리 개편 (인테리어/엘리베이터/소방/주차장).
3. 조달(구매) 장바구니 작성 및 결재 대시보드.
4. 더미 제품 사진 전체 정규화 및 실제 B2B API 부품 데이터 연결 모사 테스트.

## [차기 스프린트 (Sprint 1) - 프로젝트 견적 시스템 고도화]
### Task 1: 견적 생성기 (Quotation Builder) UI 구축
- **목표**: 선택한 품의서(구매 요청건)를 바탕으로 고객사 제출용 견적서(Invoice/Quotation)를 자동 생성.
- **기능**:
  - `estimates.html` 신규 생성.
  - 마진율(Margin %), 세금(VAT), 운송비, 제반 경비를 일괄 혹은 개별 적용 가능한 계산기 로직.
  - 최종본을 A4 형식의 미리보기 뷰로 출력 및 인쇄/PDF 저장 기능(`window.print()`) 탑재.

### Task 2: 메인 대시보드(Dashboard) 시각화 데이터 연동
- **목표**: `admin/dashboard.html`에 단순히 하드코딩된 숫자가 아닌 실제 통계 시각화 도입.
- **기능**:
  - Chart.js를 이용해 '카테고리별 구매 예산 집행액 추이' 등 시각화.

### Task 3: 권한 관리 로직 실제 연동 (User Role Enforcement)
- **목표**: 하드코딩된 UI 권한 테이블을 실제 Firestore Security Rules에 맞게 연동.
- **기능**:
  - `users` 컬렉션에 사용자 데이터 저장하여 특정 등급(SUPER/ADMIN/VIEWER) 부여.
