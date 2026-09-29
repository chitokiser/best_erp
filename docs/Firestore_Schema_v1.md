# BESTwinner AI 경영관리 플랫폼 - 통합 DB 구조 설계 (MVP 1단계)

본 문서는 AI가 능동적으로 관계를 분석하고 경영판단을 지원할 수 있도록 고안된 **Firebase Firestore 기반의 데이터베이스 스키마**입니다. 기존의 단절된 DB가 아닌, 서로 유기적으로 연결되는 형태(식별자 참조 방식)로 설계되었습니다.

---

## 1. 직원 (Employees)
AI가 직원의 역량과 업무 부하를 판단하여 적절한 프로젝트에 배치(추천)할 수 있도록 설계합니다.

- **Collection:** `employees`
- **Fields:**
  - `employeeId` (String): 시스템 고유 ID
  - `name` (String): 직원명
  - `position` (String): 직급
  - `department` (String): 소속 부서
  - `contact` (String): 연락처 / 이메일
  - `joinedAt` (Timestamp): 입사일
  - `skills` (Array of Strings): 보유 기술 및 전문분야 (예: ["CAD", "현장관리", "회계"])
  - `projects` (Array of Strings): 현재 참여 중인 `projectId` 목록
  - `workload` (Number): 현재 업무량 비율 (0~100%) - AI가 분석/조정에 사용
  - `experience` (Array of Objects): 과거 프로젝트 경험 및 업무 성과 요약
  - `networkRefs` (Array of Strings): 이 직원이 전담하거나 친분이 있는 인맥(`contactId`) 목록

## 2. 거래처 CRM (Clients)
단순한 연락망이 아닌, 거래 연속성과 잠재적 가치(위험도/기회)를 AI가 분석할 수 있는 구조입니다.

- **Collection:** `clients`
- **Fields:**
  - `clientId` (String): 고유 ID
  - `companyName` (String): 거래처 회사명
  - `managerName` (String): 담당자명
  - `contactInfo` (Object): 연락처 정보 { phone, email }
  - `status` (String): 활성 / 휴면 / 잠재고객 등
  - `totalRevenue` (Number): 누적 매출액
  - `lastContactDate` (Timestamp): 최근 연락일 (미팅, 전화 등)
  - `needsAndIssues` (Array of Strings): 요구사항 및 불만 이력
  - `activeProjects` (Array of Strings): 진행 중인 `projectId` 목록
  - `opportunityScore` (Number): AI가 판단하는 재구매/추가수주 가능성 점수

## 3. 협력사 (Suppliers)
프로젝트 발생 시 AI가 1순위, 2순위로 협력사를 자동 추천할 수 있도록 평가 지표를 수집합니다.

- **Collection:** `suppliers`
- **Fields:**
  - `supplierId` (String): 고유 ID
  - `companyName` (String): 협력사명
  - `category` (String): 주요 업종/공급품목 (예: "가설재", "엘리베이터", "철근")
  - `evaluations` (Object): 평가 지표 
    - `price` (Number 1-5): 가격 경쟁력
    - `quality` (Number 1-5): 품질
    - `delivery` (Number 1-5): 납기 준수율
  - `reliabilityScore` (Number): 통합 만족도 (0~100%)
  - `issueHistory` (Array of Objects): 과거 납기 지연 등 문제 발생 이력
  - `ongoingProjects` (Array of Strings): 현재 투입 중인 `projectId` 목록

## 4. 인맥 (Contacts / Network)
본 플랫폼의 강력한 차별점입니다. 단순 주소록이 아닌 인맥 간의 연결 고리를 파악합니다.

- **Collection:** `contacts`
- **Fields:**
  - `contactId` (String): 고유 ID
  - `name` (String): 인물명
  - `company` (String): 소속 회사
  - `title` (String): 직책 및 분야
  - `introducedBy` (String): 소개자 (`contactId` 또는 `employeeId` 참조)
  - `metHistory` (Array of Objects): 미팅 내역 { date, location, context }
  - `relevance` (String): 과거 거래, 관심 분야 등
  - `influenceScore` (Number): 영향력 점수(1-10)

## 5. 프로젝트 (Projects)
모든 데이터가 모이는 중심 허브(Central Hub)입니다.

- **Collection:** `projects`
- **Fields:**
  - `projectId` (String): 고유 ID
  - `name` (String): 프로젝트 명
  - `clientId` (String): 연결된 `clients` ID
  - `status` (String): 사전준비 / 진행중 / 보류 / 완료
  - `financials` (Object): 재무 현황
    - `budget` (Number): 총 예산
    - `expectedRevenue` (Number): 예상 매출
    - `currentCost` (Number): 현재까지 집행 비용
  - `schedule` (Object): { startDate, endDate }
  - `involved` (Object):
    - `managerId` (String): 총괄 직원 ID
    - `employees` (Array of Strings): 참여 `employeeId`
    - `suppliers` (Array of Strings): 투입된 `supplierId`
  - `aiRisks` (Array of Objects): AI가 탐지한 위험 요소 (원가상승, 일정지연 등)

## 6. 현장관리 로그 (Site Logs & Issues)
음성, 텍스트, 문서 입력 등을 통해 수합되는 일일 현황이나 이슈 리포트입니다.

- **Collection:** `siteLogs`
- **Fields:**
  - `logId` (String): 고유 ID
  - `projectId` (String): 해당 `projectId`
  - `authorId` (String): 작성자 `employeeId`
  - `date` (Timestamp): 로그 작성일
  - `type` (String): 지연 / 자재부족 / 안전사고 / 일반보고 등
  - `content` (String): 자연어 입력 텍스트 ("오늘 자재가 늦게 들어와서...")
  - `media` (Array of Strings): 첨부 사진/음성 파일 URL
  - `aiParsedImpact` (Object): AI가 분석한 영향 
    - `requiresSupplierAction` (Boolean): 협력사 조치 필요 여부
    - `scheduleDelayDays` (Number): 예상 지연 일수

## 7. AI 경영 분석 보드 (AI Insights & Reports)
매일 아침 CEO 대시보드에 뿌려질 요약/브리핑 및 경고(Alert) 데이터를 저장합니다.

- **Collection:** `aiInsights`
- **Fields:**
  - `insightId` (String): 고유 ID
  - `date` (Timestamp): 생성일
  - `type` (String): DAILY_BRIEFING / RISK_ALERT / OPPORTUNITY
  - `title` (String): 요약 제목 ("A 프로젝트 원가 9% 상승")
  - `details` (String): AI 상세 분석 내용
  - `recommendedActions` (Array of Objects): AI가 추천하는 조치 { actionType, targetId, description }
  - `status` (String): 미결(PENDING) / 승인(APPROVED) / 보류(DISMISSED)

---

### 💡 (참고) AI Knowledge Graph 구동 원리
이 DB 구조가 적용되면, **`projects` 컬렉션**을 중심으로 `employees`(참여자), `suppliers`(하청), `siteLogs`(현장상황)의 ID가 모두 교차 참조(Cross-Reference) 형식으로 연결됩니다. 

따라서 AI에게 "A 프로젝트에 이슈 생기면 어떻게 돼?"라고 물어봤을 때 AI는:
`siteLogs(자재부족) -> projects(해당현장) -> suppliers(납품업체) -> employees(업무과중 여부)` 순서로 참조 데이터를 타고 들어가(RAG/Vector 검색과 병행하여) 종합적인 대응책을 도출하게 됩니다.
