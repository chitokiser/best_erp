# vision-crm × 매장 AI NVR 연동 (feature/nvr-integration)

`admin/vision-crm.html`이 매장 NVR(Frigate + NVR 미들웨어, 저장소 `best_ainvr`)의 실측 데이터를 표시하도록 연동했다.
NVR 쪽 상세 규격은 `best_ainvr/docs/erp-integration.md`를 참고한다.

> **배포 전 상태:** 이 브랜치는 로컬 커밋만 되어 있다. Netlify 배포, `firestore.rules` 배포, git push는 대표 승인 후 진행한다.

## 1. 동작 방식

- 페이지가 `nvr_status/{merchantId}`를 구독하고, 하트비트(`lastHeartbeat`)가 90초 이내이면 **NVR 연동 모드**로 자동 전환한다.
  - 헤더 배지 표시: `🛰️ NVR 연동 중 · 카메라 N대 · 최근 신호 HH:MM`
  - 하트비트가 끊기면 `NVR 오프라인`을 표시하고 기존 브라우저 모드로 돌아간다.
- NVR 연동 모드에서 바뀌는 것:

| 화면 | NVR 연동 모드 데이터 |
|---|---|
| KPI 방문객 수 | `merchant_traffic_logs/nvr_{merchantId}_{근무일}`의 `footfallCount`, 피크 시간 (출입구 실측) |
| KPI 2번째 카드 | "오늘 VIP 방문 (NVR 얼굴 인식)": 오늘 `nvr_vip_visits` 건수 (98.2% 고정값 대신) |
| KPI 직원 출근 | `nvr_attendance`(오늘) 근무중 / `store_employees` 직원 수 |
| KPI 방범 | 오늘 NVR 침입 건수 (`security_incident_logs`, `source:'nvr'`) |
| 직원 근태 탭 | 직원 목록 = `store_employees`, 출근·퇴근 = `nvr_attendance`, 통계·"오늘 실시간 출퇴근 인증 로그" |
| 방범/보안 탭 | 최근 7일 NVR 침입 이력. 새 침입 시 기존 사이렌·경보 배너·알림음 (토스트는 30초에 1번) |
| 고객 탭 | VIP 방문 시 토스트 + 알림음, 고객 카드에 `🛰️ NVR 등록됨` / `⭐ 오늘 방문 HH:MM` |

- 데이터가 없으면 0 / "기록 없음"으로 표시하며, 하드코딩 수치(152명, 98.2%, 4/5명)는 쓰지 않는다.
- NVR 연동 중에는 브라우저 face-api.js 얼굴 인식 루프와 수동 버튼(회원 검색, 출퇴근 체크, 24시간 무인 관제)을 실행하지 않고 안내 문구만 보인다. NVR이 오프라인이면 기존 기능이 그대로 동작한다.
- `?merchantId=...` URL 파라미터로 가맹점 ID를 지정할 수 있다 (입력란 변경 시 재구독).

## 2. NVR 얼굴 등록 (ERP → NVR)

- **직원:** 직원 근태 탭의 `🛰️ NVR 등록 ON/OFF` 버튼으로 `store_employees.nvrEnroll`을 바꾼다. 사진(`photoURL`)이 있어야 한다. 같은 `employeeId` 문서가 여러 개이면 대표 문서 1개만 켠다 (중복 얼굴 방지).
- **고객:** 고객 360° 프로필의 "매장 NVR VIP 얼굴 인식 등록" 패널을 쓴다.
  - 등록에 필요한 것: 동의 일자, 동의서 버전, "동의서 서명 확인" 체크.
  - 기록되는 필드: `nvrEnroll:true`, `consentGivenAt`(Timestamp), `consentVersion`, `consentWithdrawnAt:null`.
  - 해제(동의 철회) 시 기록: `nvrEnroll:false`, `consentWithdrawnAt`(서버 시각).
  - NVR은 해제를 받으면 얼굴 사진·인식 기록·VIP 경보를 지우고, Firestore의 `nvr_vip_visits`도 삭제한다.
- 등록 상태는 `nvr_status.enrollments`에 기록된다: `enrolled`, `pending`, `blocked`, `removed`, `error`. 이 값이 칩으로 표시된다.

## 3. Firestore 규칙 변경 (제안, 미배포)

`firestore.rules`에 다음 블록을 추가했다. 같은 변경을 `jumper_v10` 저장소(브랜치 `feature/nvr-rules`)에도 넣어 두 파일이 동일하다.

| 컬렉션 | 읽기 | 쓰기 |
|---|---|---|
| `nvr_status/{merchantId}` | `belongsToTenant(merchantId)` | 금지 (NVR Admin SDK만) |
| `nvr_attendance`, `nvr_vip_visits` | `belongsToTenant(resource.data.merchantId)` | 금지 |
| `security_incident_logs` | 소속 가맹점 조회 허용 (기존: superadmin만) | 변경 없음 |
| `store_employees` | 소속 가맹점 | 소속 가맹점 생성·수정·삭제 (`merchantId` 변경 금지) |

`store_employees`와 `security_incident_logs`는 지금까지 규칙이 없어 superadmin만 접근할 수 있었다. 그래서 점주 계정에서는 페이지의 직원 저장(`addDoc`)이 실패하고 있었다.

## 4. ⚠️ 보안 위험: `store_customers` 공개 (수정 제안, 아직 변경 안 함)

현재 규칙:

```
match /store_customers/{document=**} { allow read, write: if true; }
```

### 위험

- 로그인 없이 누구나 **모든 가맹점의 고객 문서를 조회·수정·삭제**할 수 있다. 웹앱 설정의 API 키는 공개값이다.
- 문서에 들어 있는 것:
  - 이름, 이메일, 성별·국적
  - 얼굴 사진 URL
  - **face-api.js 128차원 얼굴 벡터(`descriptor`)**: 생체정보
- 베트남 개인정보보호법(Law 91/2025/QH15)과 한국 개인정보보호법의 민감정보 보호 의무에 어긋날 소지가 크다.
- 고객 문서의 동의 필드(`consentGivenAt`, `nvrEnroll`)도 누구나 바꿀 수 있다. 그러면 **동의 없는 얼굴 등록 요청**이 가능해진다.
  - NVR이 사진을 내려받아 등록하는 구조라서 이 위험이 직접 연결된다.
  - 따라서 이 규칙을 고치기 전에는 실매장에서 고객 NVR 등록을 켜지 않는 것을 권장한다.
- `store_visits`, `merchant_traffic_logs`, `user_coupons`도 `read, write: if true`다.
- 같은 페이지의 `initMerchantAndCustomersSync()`가 `users` 컬렉션 전체를 클라이언트에서 읽는 것도 범위를 좁혀야 한다.

### 수정 제안

```
match /store_customers/{docId} {
  // 테이블 QR(비로그인 고객)의 자발적 등록만 허용: 필드 화이트리스트, 얼굴 벡터·NVR 플래그 금지
  allow create: if request.resource.data.keys().hasOnly(
                    ['customerId','merchantId','name','tableNo','tier','visitCount','preferences',
                     'createdAt','zaloLinked','awardedBt','btTicketCode','gender','nationality'])
                && exists(/databases/$(database)/documents/merchants/$(request.resource.data.merchantId));
  allow read, delete: if belongsToTenant(resource.data.merchantId);
  allow update: if belongsToTenant(resource.data.merchantId)
                && request.resource.data.merchantId == resource.data.merchantId;
}
```

- `table-qr.html`이 실제로 쓰는 필드 목록을 확인한 뒤 `hasOnly` 목록을 확정한다.
- `descriptor`(얼굴 벡터)는 Firestore에 두지 않는다. NVR을 쓰는 매장은 NVR이 얼굴을 관리하므로 필요 없다.
- 기존 문서의 `descriptor` 필드 삭제(마이그레이션)를 함께 계획한다.
- `store_visits`, `merchant_traffic_logs`도 같은 방식(공개 create 제한 + 소속 가맹점 read)으로 좁힌다.

## 5. 로컬 테스트 (에뮬레이터)

운영 데이터를 건드리지 않도록 Firebase 에뮬레이터(`demo-nvr` 프로젝트)로 확인했다.

```bash
# best_ainvr/deploy: 에뮬레이터 + 미들웨어(에뮬레이터 연결)
ERP_RULES=<BEST_ERP>/firestore.rules docker compose -f docker-compose.yml -f docker-compose.emulator.yml up -d --build
# BEST_ERP: 에뮬레이터에 연결된 개발 서버 (운영 빌드에는 영향 없음)
VITE_FIREBASE_EMULATOR=127.0.0.1 npx vite --port 5179
```

- `assets/js/firebase-config.js`는 개발 모드에서 `VITE_FIREBASE_EMULATOR`가 있을 때만 에뮬레이터에 연결한다.
- 운영 빌드에서는 `import.meta.env.DEV`가 false라서 이 코드가 동작하지 않는다.

## 6. 그 밖에 발견한 사항

- `vite.config.js`에 Gemini API 키 기본값이 하드코딩되어 git에 들어 있다. 키를 재발급하고 환경 변수로만 쓰도록 바꾸는 것을 권장한다 (이 브랜치에서는 변경하지 않음).
- `ERP .env`의 `FIREBASE_PROJECT_ID`(서비스 계정)는 `aim119` 프로젝트다. 페이지가 쓰는 Firebase 프로젝트는 `jumper-b15aa`다. 따라서 NVR 미들웨어용 서비스 계정은 **`jumper-b15aa`** 프로젝트에서 새로 발급해야 한다 (Firestore 쓰기 권한만, 매장별 1개 권장).
