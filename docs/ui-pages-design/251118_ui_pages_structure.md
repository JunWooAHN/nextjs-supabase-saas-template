# UI 및 페이지 구성 설계 문서

**작성일**: 2025-11-18  
**최종 업데이트**: 2025-11-18  
**버전**: 2.0 (v5.2 반영, 고객 여정 기반 재설계)  
**기준 문서**: 
- `docs/customer-journey/251118_user_journey_hypothesis.md`
- `reference-repos/commuting-react-supabase-app/`
- `docs/rules/5.1.md`
- `.cursor/rules/basic-architecture.mdc`
- `.cursor/rules/feature-based-architecture.mdc`

## 주요 업데이트 (v2.0)

- **v5.2 신규 기능 반영**: PostGIS 기반 위치 검증 및 근무지 관리 기능 반영
- **고객 여정 시나리오 완전 반영**: 모든 Tier 1 시나리오 (1-36) 지원
- **신규 페이지 추가**:
  - 근무지 관리 페이지 (`/(user)/org/[orgId]/work-locations`)
  - 근무 시간 통계 페이지 (`/(user)/statistics`)
  - 개인 위치 인증 페이지 (`/(user)/personal-proofs`)
- **기능 강화**:
  - 위치 검증 상세 정보 표시 (시나리오 36)
  - 근무지별 필터링 (시나리오 32)
  - 위치 증빙 내보내기 (시나리오 26)
  - 조직 기본 사업장 조회 (시나리오 33)
- **컴포넌트 구조 개선**: Feature-Based Architecture에 따른 모듈화

## 목차

1. [개요](#개요)
2. [라우팅 구조](#라우팅-구조)
3. [페이지 목록](#페이지-목록)
4. [컴포넌트 구조](#컴포넌트-구조)
5. [UI 디자인 시스템](#ui-디자인-시스템)
6. [페이지별 상세 설계](#페이지별-상세-설계)
7. [구현 우선순위](#구현-우선순위)

---

## 개요

### 설계 원칙

1. **사용자 중심 설계**: 고객 여정 시나리오 기반 페이지 구성
2. **역할 기반 접근**: Tier 1/2/3 아키텍처에 따른 접근 제어
3. **반응형 디자인**: 모바일 우선, 데스크톱 최적화
4. **일관된 UX**: 레퍼런스 프로젝트의 검증된 패턴 활용
5. **접근성**: WCAG 2.1 AA 수준 준수

### 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **UI 라이브러리**: shadcn/ui + Radix UI
- **스타일링**: Tailwind CSS
- **타입 안전성**: TypeScript
- **상태 관리**: React Server Components (기본), Client Components (필요시)

---

## 라우팅 구조

### 전체 라우트 구조

**⚠️ 중요: 프로젝트 룰 (5.1.md)에 따른 구조**

```
app/
├── (auth)/                  # 인증 관련 라우트 그룹
│   ├── login/              # 로그인
│   └── signup/             # 회원가입
│
├── (user)/                 # 일반 사용자 (Tier 1)
│   ├── dashboard/         # 개인 대시보드
│   │                       # - 모든 엔티티의 기록 통합 보기
│   │                       # - 엔티티 선택 (EntitySwitcher)
│   │                       # - 선택한 엔티티 컨텍스트로 이동
│   ├── settings/          # 프로필 설정, 기본 접속 엔티티 설정
│   ├── statistics/        # 근무 시간 통계 (모든 엔티티 통합)
│   │   └── page.tsx
│   ├── personal-proofs/   # 개인 위치 인증 (조직/센터 없이)
│   │   └── page.tsx
│   │
│   ├── org/[orgId]/       # 조직 컨텍스트 (일반 사용자 관점)
│   │   ├── page.tsx      # 통합 출퇴근/위치보고 메인 페이지
│   │   │                   # - 출근/퇴근 버튼 (통합, 위치 검증 포함)
│   │   │                   # - 위치보고 버튼 (통합)
│   │   │                   # - 현재 상태 표시 (위치 검증 상세 정보 포함)
│   │   │                   # - 최근 기록 미리보기
│   │   │                   # - 조직 기본 사업장 정보 (읽기 전용)
│   │   ├── history/      # 출퇴근 이력 (근무지별 필터링, 내보내기 포함)
│   │   │   └── page.tsx
│   │   ├── calendar/     # 출퇴근 캘린더
│   │   │   └── page.tsx
│   │   ├── work-locations/ # 근무지 관리 (v5.2 신규)
│   │   │   └── page.tsx
│   │   └── statistics/   # 근무 시간 통계 (조직별)
│   │       └── page.tsx
│   │
│   └── center/[centerId]/ # 센터 컨텍스트 (일반 사용자 관점)
│       ├── page.tsx      # 통합 출퇴근/위치보고 메인 페이지
│       │                   # - 출근/퇴근 버튼 (통합, 위치 검증 포함)
│       │                   # - 위치보고 버튼 (통합)
│       │                   # - 현재 상태 표시 (위치 검증 상세 정보 포함)
│       │                   # - 최근 기록 미리보기
│       ├── history/      # 출퇴근 이력 (근무지별 필터링, 내보내기 포함)
│       │   └── page.tsx
│       └── calendar/     # 출퇴근 캘린더
│           └── page.tsx
│
│
├── (org-management)/       # 조직 관리 (Tier 2)
│   └── manage/            # 관리자 경로 prefix (라우팅 충돌 방지)
│       └── org/  
│           └── [orgId]/   # 조직 ID 동적 라우트
│               ├── dashboard/     # 조직 대시보드 (실제 URL: /manage/org/[orgId]/dashboard)
│               ├── members/       # 멤버 관리 (실제 URL: /manage/org/[orgId]/members)
│               ├── settings/      # 조직 설정 (실제 URL: /manage/org/[orgId]/settings)
│               ├── attendance/    # 출퇴근 관리 (실제 URL: /manage/org/[orgId]/attendance)
│               └── billing/       # 조직 빌링 관리 (실제 URL: /manage/org/[orgId]/billing)
│
├── (center-management)/    # 센터 관리 (Tier 2)
│   └── manage/            # 관리자 경로 prefix (라우팅 충돌 방지)
│       └── center/  
│           └── [centerId]/ # 센터 ID 동적 라우트
│               ├── dashboard/     # 센터 대시보드 (실제 URL: /manage/center/[centerId]/dashboard)
│               ├── organizations/  # 연결된 조직 관리 (실제 URL: /manage/center/[centerId]/organizations)
│               ├── settings/      # 센터 설정 (실제 URL: /manage/center/[centerId]/settings)
│               ├── qr/            # QR 코드 생성 (실제 URL: /manage/center/[centerId]/qr)
│               └── billing/        # 센터 빌링 관리 (실제 URL: /manage/center/[centerId]/billing)
│
├── (law-agency)/          # 법정 대리인 라우트 그룹
│   └── ...                # 법정 대리인 전용 페이지
│
├── (app-manager)/         # 앱 관리자 (Tier 3)
│   └── admin/            # 시스템 관리
│       ├── users/        # 전체 사용자 관리
│       ├── organizations/ # 전체 조직 관리
│       ├── centers/      # 전체 센터 관리
│       └── settings/     # 시스템 설정
│
├── qr/                    # QR 코드 페이지 (비로그인 가능)
│   ├── center/[id]/       # 센터 QR
│   │   └── page.tsx
│   └── org/[id]/          # 조직 QR
│       └── page.tsx
│
├── api/                   # API 라우트
│   ├── trpc/             # tRPC 엔드포인트 (Tier 2)
│   │   └── [trpc]/
│   │       └── route.ts
│   └── webhooks/         # 웹훅
│       └── payment/
│           └── route.ts
│
├── auth/                  # 인증 콜백
│   ├── callback/         # OAuth 콜백
│   └── signout/          # 로그아웃
│
├── page.tsx              # 랜딩 페이지 (공개)
├── layout.tsx            # 루트 레이아웃
└── middleware.ts         # 미들웨어 (구독 상태 체크 포함)
```

---

## 페이지 목록

### 1. 공개 페이지 (Marketing)

#### 1.1 랜딩 페이지 (`/`)
- **목적**: 서비스 소개 및 가입 유도
- **주요 섹션**:
  - Hero Section (메인 헤드라인 + CTA)
  - Value Proposition (핵심 가치 제안)
  - Features (주요 기능 소개)
  - Process (도입 프로세스)
  - Testimonials (고객 후기)
  - Final CTA (최종 가입 유도)
- **컴포넌트**: `PublicBasePage`, `PublicHeader`, `PublicFooter`

#### 1.2 로그인 페이지 (`/login`)
- **목적**: 사용자 인증
- **기능**:
  - 이메일/비밀번호 로그인
  - 소셜 로그인 (Google, Apple)
  - 비밀번호 찾기
  - 회원가입 링크
- **컴포넌트**: `SignInForm`, `OAuthButtons`

#### 1.3 회원가입 페이지 (`/signup`)
- **목적**: 신규 사용자 가입
- **기능**:
  - 이메일/비밀번호 회원가입
  - 소셜 회원가입
  - 이용약관 동의
  - 이메일 인증 안내
- **컴포넌트**: `SignUpForm`, `TermsAgreement`

#### 1.4 요금제 페이지 (`/pricing`)
- **목적**: 요금제 소개 및 선택
- **기능**:
  - 요금제 비교 테이블
  - 플랜별 기능 설명
  - 가입 버튼
- **컴포넌트**: `PricingTable`, `PlanCard`

### 2. 일반 사용자 페이지 (Tier 1)

#### 2.1 개인 대시보드 (`/(user)/dashboard`)
- **목적**: 개인 출퇴근 현황 및 통계 (모든 엔티티 통합)
- **주요 섹션**:
  - 오늘의 출퇴근 상태 (모든 엔티티 통합)
  - 이번 주/월 근무 시간 (모든 엔티티 합계)
  - 최근 출퇴근 기록 (모든 엔티티)
  - **엔티티 선택 (EntitySwitcher)**
    - 소속 조직 목록
    - 소속 센터 목록
    - 선택한 엔티티로 컨텍스트 전환
  - 빠른 액션 버튼
    - "조직으로 가기" → `/(user)/org/[orgId]`
    - "센터로 가기" → `/(user)/center/[centerId]`
- **컴포넌트**: `DashboardStats`, `RecentAttendance`, `EntitySwitcher`, `QuickActions`
- **시나리오 지원**:
  - 시나리오 21: 대시보드 통합 보기
  - 시나리오 22: 조직/센터 전환
  - 센터 매니저가 센터 소속 조직 일원으로 출근 → 조직 선택 후 출근
  - 조직 오너가 조직 일원으로 출근 → 조직 선택 후 출근
  - 조직 오너가 다른 센터로 위치증빙 → 센터 선택 후 위치증빙

#### 2.2 조직 컨텍스트 통합 페이지 (`/(user)/org/[orgId]`)
- **목적**: 특정 조직 컨텍스트에서 출근/퇴근/위치보고 통합 인터페이스
- **설계 원칙**: MSA 관점에서 사용자가 "출근/퇴근/위치보고"를 하고 "잊어버리는" 단순한 UX
- **기능**:
  - **출근/퇴근 버튼** (상태 기반 단일 버튼):
    - 사용자 출근 상태에 따라 "출근" 또는 "퇴근" 표시
    - 위치 기반 검증 (v5.2 위치 검증 로직 적용)
      - 직원별 근무지 확인 (`member_work_locations`)
      - 조직 기본 사업장 확인 (`work_locations`)
      - 아무데서나 허용 확인 (`allow_anywhere`)
    - 위치 검증 성공 시 출퇴근 기록 (시나리오 34)
    - 위치 검증 실패 시 에러 처리 및 대안 제시 (시나리오 31)
    - 로딩 상태 처리
  - **위치보고 버튼** (별도 버튼):
    - GPS 기반 위치 획득
    - 짧은 메모 입력 기능 (선택적, 최대 200자)
    - 위치보고 모달 또는 인라인 입력
  - **현재 상태 표시**:
    - 현재 출근 상태 (해당 조직 기준)
    - 출근 시간 표시
    - 위치 정보
    - 위치 검증 상세 정보 (시나리오 36)
      - 검증된 근무지/사업장 이름
      - 검증 방법 (직원 근무지/조직 사업장/아무데서나 허용)
      - 현재 위치와 근무지까지의 거리
    - 조직별 설정 표시 (예: 자정 강제 퇴근 여부)
  - **최근 기록 미리보기**:
    - 오늘의 출퇴근 기록
    - 최근 위치보고 기록 (3-5개, 메모 포함)
    - 전체 기록 보기 링크
  - **조직 기본 사업장 정보** (읽기 전용, 시나리오 33):
    - 조직의 기본 사업장 목록 표시
    - 지도에서 사업장 위치 확인
    - 허용 반경 정보
- **컴포넌트**: 
  - `AttendanceClockButton` (출근/퇴근 상태 기반 단일 버튼)
  - `LocationReportButton` (위치보고 버튼, 메모 입력 포함)
  - `CurrentStatus` (현재 상태 표시)
  - `RecentRecords` (최근 기록 미리보기)
  - `LocationVerification` (위치 검증 컴포넌트, v5.2)
  - `LocationVerificationDetail` (위치 검증 상세 정보, 시나리오 36)
  - `OrganizationWorkLocations` (조직 기본 사업장 조회, 시나리오 33)
  - `EntityContextBanner` (엔티티 컨텍스트 표시)
- **엔티티 컨텍스트**: URL 파라미터 `[orgId]`로 조직 컨텍스트 전달
- **시나리오 지원**:
  - 시나리오 4: 웹사이트 내 위치보고
  - 시나리오 8: 웹사이트 내 퇴근
  - 시나리오 31: 위치 검증 실패 시 처리
  - 시나리오 33: 조직 기본 사업장 조회
  - 시나리오 34: 위치 검증 성공 시 출퇴근
  - 시나리오 36: 위치 검증 상세 정보 확인

#### 2.3 조직 컨텍스트 출퇴근 이력 (`/(user)/org/[orgId]/history`)
- **목적**: 특정 조직의 출퇴근 기록 상세 조회
- **기능**:
  - 날짜별 필터링
  - **근무지별 필터링** (시나리오 32, v5.2 신규):
    - 등록된 근무지 목록에서 선택
    - 선택한 근무지에서의 출퇴근 이력만 표시
    - 근무지별 통계 표시
  - 검색 기능
  - 승인 상태 표시
  - 상세 정보 모달
    - 위치 검증 상세 정보 포함 (시나리오 36)
    - 검증 과정 단계별 결과 표시
    - 지도에서 검증 정보 시각화
  - 위치보고 기록도 함께 표시 (필터링 가능)
  - **위치 증빙 내보내기** (시나리오 26):
    - PDF/CSV/Excel 형식으로 다운로드
    - 날짜 범위, 증빙 타입 선택 가능
- **컴포넌트**: 
  - `AttendanceHistory` (출퇴근 이력 목록)
  - `AttendanceTable` (이력 테이블)
  - `AttendanceDetailModal` (상세 정보 모달)
  - `ProofList` (위치보고 목록)
  - `WorkLocationFilter` (근무지 필터, 시나리오 32)
  - `LocationVerificationDetail` (위치 검증 상세 정보, 시나리오 36)
  - `ProofExportButton` (내보내기 버튼, 시나리오 26)
- **시나리오 지원**:
  - 시나리오 9: 출퇴근 이력 조회
  - 시나리오 25: 위치 증빙 상세 정보 확인
  - 시나리오 26: 위치 증빙 내보내기
  - 시나리오 32: 근무지별 출퇴근 이력 조회
  - 시나리오 36: 위치 검증 상세 정보 확인

#### 2.4 조직 컨텍스트 출퇴근 캘린더 (`/(user)/org/[orgId]/calendar`)
- **목적**: 특정 조직의 캘린더 형태로 출퇴근 기록 확인
- **기능**:
  - 월별 캘린더 뷰
  - 날짜별 출퇴근 시간 표시
  - 근무 시간 합계
  - 위치보고 기록도 표시 (선택적)
  - 날짜 클릭 시 상세 정보 모달
- **컴포넌트**: `AttendanceCalendar`, `CalendarDay`, `CalendarDetailModal`
- **시나리오 지원**:
  - 시나리오 24: 출퇴근 캘린더 보기

#### 2.5 센터 컨텍스트 통합 페이지 (`/(user)/center/[centerId]`)
- **목적**: 특정 센터 컨텍스트에서 출근/퇴근/위치보고 통합 인터페이스
- **설계 원칙**: MSA 관점에서 사용자가 "출근/퇴근/위치보고"를 하고 "잊어버리는" 단순한 UX
- **기능**:
  - **출근/퇴근 버튼** (상태 기반 단일 버튼):
    - 사용자 출근 상태에 따라 "출근" 또는 "퇴근" 표시
    - 위치 기반 검증 (v5.2 위치 검증 로직 적용)
      - 직원별 근무지 확인 (`member_work_locations`)
      - 센터 기본 사업장 확인 (`work_locations`)
      - 아무데서나 허용 확인 (`allow_anywhere`)
    - 위치 검증 성공 시 출퇴근 기록 (시나리오 34)
    - 위치 검증 실패 시 에러 처리 및 대안 제시 (시나리오 31)
    - 로딩 상태 처리
  - **위치보고 버튼** (별도 버튼):
    - GPS 기반 위치 획득
    - 짧은 메모 입력 기능 (선택적, 최대 200자)
    - 위치보고 모달 또는 인라인 입력
  - **현재 상태 표시**:
    - 현재 출근 상태 (해당 센터 기준)
    - 출근 시간 표시
    - 위치 정보
    - 위치 검증 상세 정보 (시나리오 36)
      - 검증된 근무지/사업장 이름
      - 검증 방법 (직원 근무지/센터 사업장/아무데서나 허용)
      - 현재 위치와 근무지까지의 거리
    - 센터별 설정 표시 (예: 자정 강제 퇴근 여부)
  - **최근 기록 미리보기**:
    - 오늘의 출퇴근 기록
    - 최근 위치보고 기록 (3-5개, 메모 포함)
    - 전체 기록 보기 링크
- **컴포넌트**: 
  - `AttendanceClockButton` (출근/퇴근 상태 기반 단일 버튼)
  - `LocationReportButton` (위치보고 버튼, 메모 입력 포함)
  - `CurrentStatus` (현재 상태 표시)
  - `RecentRecords` (최근 기록 미리보기)
  - `LocationVerification` (위치 검증 컴포넌트, v5.2)
  - `LocationVerificationDetail` (위치 검증 상세 정보, 시나리오 36)
  - `EntityContextBanner` (엔티티 컨텍스트 표시)
- **엔티티 컨텍스트**: URL 파라미터 `[centerId]`로 센터 컨텍스트 전달
- **시나리오 지원**:
  - 시나리오 4: 웹사이트 내 위치보고
  - 시나리오 8: 웹사이트 내 퇴근
  - 시나리오 20: QR로 퇴근
  - 시나리오 31: 위치 검증 실패 시 처리
  - 시나리오 34: 위치 검증 성공 시 출퇴근
  - 시나리오 36: 위치 검증 상세 정보 확인
  - 조직 오너가 다른 센터로 위치증빙

#### 2.6 센터 컨텍스트 출퇴근 이력 (`/(user)/center/[centerId]/history`)
- **목적**: 특정 센터의 출퇴근 기록 상세 조회
- **기능**: 조직 컨텍스트 출퇴근 이력과 동일 (2.3 참고)
- **시나리오 지원**: 시나리오 9, 25, 26, 32, 36

#### 2.7 센터 컨텍스트 출퇴근 캘린더 (`/(user)/center/[centerId]/calendar`)
- **목적**: 특정 센터의 캘린더 형태로 출퇴근 기록 확인
- **기능**: 조직 컨텍스트 출퇴근 캘린더와 동일 (2.4 참고)
- **시나리오 지원**: 시나리오 24

#### 2.8 근무지 관리 (`/(user)/org/[orgId]/work-locations`)
- **목적**: 조직별 직원 근무지 등록/수정/삭제 관리 (v5.2 신규)
- **기능**:
  - **근무지 목록 조회**:
    - 해당 조직의 모든 근무지 표시
    - 근무지별 이름, 주소, 허용 반경 표시
    - 기본 근무지 표시 (`is_primary`)
    - 지도에서 근무지 위치 시각화
  - **근무지 등록** (시나리오 29):
    - 근무지 이름 입력
    - 주소 검색 또는 지도에서 위치 선택
    - 현재 위치 사용 옵션
    - 허용 반경 설정 (기본값 1000m)
    - 기본 근무지로 설정 여부
    - PostGIS `geom` 필드에 위치 정보 저장
  - **근무지 수정/삭제** (시나리오 30):
    - 기존 근무지 정보 수정
    - 근무지 삭제 또는 비활성화
    - 기본 근무지 변경
  - **여러 근무지 관리** (시나리오 35):
    - 조직별로 근무지 분리 관리
    - 여러 조직에 속한 경우 조직 선택 후 해당 조직의 근무지 관리
- **컴포넌트**:
  - `WorkLocationList` (근무지 목록)
  - `WorkLocationForm` (근무지 등록/수정 폼)
  - `WorkLocationMap` (지도에서 위치 선택)
  - `WorkLocationCard` (근무지 카드)
- **시나리오 지원**:
  - 시나리오 29: 직원별 근무지 등록
  - 시나리오 30: 직원별 근무지 수정/삭제
  - 시나리오 35: 여러 근무지 관리
- **Tier**: Tier 1 (클라이언트 직접 접근, `member_work_locations` 테이블)

#### 2.9 근무 시간 통계 (`/(user)/org/[orgId]/statistics` 또는 `/(user)/statistics`)
- **목적**: 주간/월간 근무 시간 통계 확인 및 분석 (시나리오 28)
- **기능**:
  - **기간 선택**:
    - 이번 주/이번 달/지난 달/커스텀 기간
  - **엔티티 선택** (여러 조직/센터에 속한 경우):
    - 전체 또는 특정 엔티티 선택
  - **통계 데이터 표시**:
    - 총 근무 시간
    - 일평균 근무 시간
    - 주간 근무 시간 그래프
    - 출근 일수
    - 지각/조퇴 횟수 (조직 설정에 따라)
    - 근무 패턴 분석
  - **상세 통계 확인**:
    - 특정 통계 항목 클릭 시 상세 정보
    - 관련 출퇴근 기록
    - 비교 통계 (이전 기간 대비)
  - **통계 내보내기**:
    - PDF/이미지 형식으로 다운로드
- **컴포넌트**:
  - `WorkTimeStats` (근무 시간 통계)
  - `StatsChart` (통계 차트)
  - `StatsComparison` (비교 통계)
  - `StatsExportButton` (내보내기 버튼)
- **시나리오 지원**:
  - 시나리오 28: 근무 시간 통계 보기
- **Tier**: Tier 1 (클라이언트 직접 접근)

#### 2.10 개인 위치 인증 (`/(user)/personal-proofs`)
- **목적**: 조직/센터 소속 없이 개인적으로 위치 인증 기록 (시나리오 7)
- **기능**:
  - **위치 인증 생성**:
    - GPS 기반 위치 획득
    - 수동 위치 입력 옵션
    - 제목 입력 (예: "서울 여행", "출장 기록")
    - 메모 입력 (선택적)
    - 사진 첨부 (선택적)
    - 태그 입력 (선택적)
  - **위치 인증 목록**:
    - 개인 위치 인증 기록 목록
    - 날짜별 필터링
    - 지도에서 위치 인증 내역 확인
    - 위치 인증 경로 시각화
  - **위치 인증 상세 정보**:
    - 인증 시간, 위치, 정확도
    - 지도에서 위치 표시
    - 첨부 사진 확인
  - **위치 인증 내보내기**:
    - PDF/CSV 형식으로 다운로드
- **컴포넌트**:
  - `PersonalProofForm` (위치 인증 생성 폼)
  - `PersonalProofList` (위치 인증 목록)
  - `PersonalProofDetail` (위치 인증 상세 정보)
  - `PersonalProofMap` (지도에서 위치 인증 내역 확인)
- **시나리오 지원**:
  - 시나리오 7: 개인 유저 - 조직 없이 위치 인증
- **Tier**: Tier 1 (클라이언트 직접 접근, `entity_id`와 `entity_type`이 NULL인 경우)
- **데이터 구조**: `location_proofs` 테이블에서 `entity_id`와 `entity_type`이 NULL인 데이터

#### 2.11 프로필 설정 (`/(user)/settings`)
- **목적**: 개인 정보 및 설정 관리
- **기능**:
  - 프로필 정보 수정 (시나리오 23)
  - 비밀번호 변경
  - 알림 설정
  - 계정 삭제
- **컴포넌트**: `ProfileSettings`, `PasswordChangeForm`, `NotificationSettings`
- **시나리오 지원**:
  - 시나리오 23: 프로필 설정 수정

### 3. 조직 관리 페이지 (Tier 2)

#### 3.1 조직 대시보드 (`/(org-management)/manage/org/[orgId]/dashboard`)
- **목적**: 조직 대시보드
- **주요 섹션**:
  - 조직 정보 요약
  - 멤버 현황
  - 출퇴근 통계
  - 최근 활동
- **컴포넌트**: `OrganizationDashboard`, `MemberStats`, `AttendanceStats`
- **참고**: 조직 목록은 EntitySwitcher 컴포넌트로 처리 (헤더/사이드바)

#### 3.3 조직 설정 (`/(org-management)/manage/org/[orgId]/settings`)
- **목적**: 조직 설정 관리
- **기능**:
  - 기본 정보 수정
  - 근무 시간 설정
  - 자정 강제 퇴근 설정 (`force_clockout_at_midnight`)
  - 타임존 설정
- **컴포넌트**: `OrganizationSettingsForm`, `WorkTimeSettings`
- **참고**: 구독 관리는 `/billing` 페이지에서 처리

#### 3.6 조직 빌링 (`/(org-management)/manage/org/[orgId]/billing`)
- **목적**: 조직 구독 및 결제 관리
- **기능**:
  - 요금제 선택
  - 결제 포털 접근
  - 구독 상태 확인
  - 구독 정지 안내
- **컴포넌트**: `PlanSelector`, `ManageSubscriptionButton`, `SubscriptionStatusBanner`

#### 3.4 멤버 관리 (`/(org-management)/manage/org/[orgId]/members`)
- **목적**: 조직 멤버 관리
- **기능**:
  - 멤버 목록 조회
  - 멤버 초대 (Tier 2: tRPC)
  - 권한 수정 (Tier 2: tRPC)
  - 멤버 제거 (Tier 2: tRPC)
- **컴포넌트**: `MemberList`, `MemberInviteForm`, `MemberPermissionEditor`

#### 3.5 출퇴근 관리 (`/(org-management)/manage/org/[orgId]/attendance`)
- **목적**: 조직 전체 출퇴근 관리
- **기능**:
  - 멤버별 출퇴근 현황
  - 승인/거부 처리
  - 통계 및 리포트
- **컴포넌트**: `OrganizationAttendanceTable`, `ApprovalActions`, `AttendanceReports`

### 4. 센터 관리 페이지 (Tier 2)

#### 4.1 센터 대시보드 (`/(center-management)/manage/center/[centerId]/dashboard`)
- **목적**: 센터 대시보드
- **주요 섹션**:
  - 센터 정보 요약
  - 연결된 조직 목록
  - QR 코드 생성
- **컴포넌트**: `CenterDashboard`, `LinkedOrganizations`, `QRCodeGenerator`
- **참고**: 센터 목록은 EntitySwitcher 컴포넌트로 처리 (헤더/사이드바)

#### 4.2 센터 설정 (`/(center-management)/manage/center/[centerId]/settings`)
- **목적**: 센터 설정 관리
- **기능**:
  - 기본 정보 수정
  - 근무 시간 설정
  - 자정 강제 퇴근 설정 (`force_clockout_at_midnight`)
  - 타임존 설정
- **컴포넌트**: `CenterSettingsForm`, `WorkTimeSettings`

#### 4.3 연결된 조직 관리 (`/(center-management)/manage/center/[centerId]/organizations`)
- **목적**: 센터가 관리하는 조직 목록 및 연결 관리
- **기능**:
  - 연결된 조직 목록 조회
  - 조직 연결 (Tier 2: tRPC)
  - 조직 연결 해제 (Tier 2: tRPC)
- **컴포넌트**: `LinkedOrganizations`, `LinkCenterOrgForm`

#### 4.4 QR 코드 생성 (`/(center-management)/manage/center/[centerId]/qr`)
- **목적**: 센터 QR 코드 생성 및 관리
- **기능**:
  - QR 코드 생성 (출근용, 위치증빙용)
  - QR 코드 다운로드
  - QR 코드 공유
- **컴포넌트**: `QRCodeGenerator`, `QRCodeDisplay`, `QRCodeActions`

#### 4.5 센터 빌링 (`/(center-management)/manage/center/[centerId]/billing`)
- **목적**: 센터 구독 및 결제 관리
- **기능**:
  - 요금제 선택
  - 결제 포털 접근
  - 구독 상태 확인
  - 구독 정지 안내
- **컴포넌트**: `PlanSelector`, `ManageSubscriptionButton`, `SubscriptionStatusBanner`

### 5. QR 코드 페이지 (비로그인 가능)

#### 5.1 센터 QR (`/qr/center/[id]`)
- **목적**: QR 코드 스캔 후 접근 페이지
- **기능**:
  - 센터 정보 표시
  - 액션 선택 (출근, 위치증빙)
  - 간단한 인증 (비로그인 사용자)
  - 위치 기반 증빙 생성
- **컴포넌트**: `QRScanPage`, `QuickAuthForm`, `LocationProofForm`

#### 5.2 조직 QR (`/qr/org/[id]`)
- **목적**: 조직 QR 코드 스캔 후 접근 페이지
- **기능**:
  - 조직 정보 표시
  - 멤버십 확인
  - 출근 기록
  - 위치 검증
- **컴포넌트**: `QRScanPage`, `MembershipCheck`, `AttendanceForm`

### 6. 법정 대리인 페이지

#### 6.1 법정 대리인 대시보드 (`/(law-agency)/dashboard`)
- **목적**: 법정 대리인 전용 대시보드
- **기능**:
  - 담당 조직/센터 목록
  - 법정 대리인 전용 기능
- **컴포넌트**: `LawAgencyDashboard`, `ClientListTable`

### 7. 앱 관리자 페이지 (Tier 3)

#### 7.1 시스템 관리 (`/(app-manager)/admin`)
- **목적**: 전체 시스템 관리
- **기능**:
  - 전체 사용자 관리 (Tier 3: Server Actions)
  - 전체 조직/센터 관리 (Tier 3: Server Actions)
  - 시스템 설정 (Tier 3: Server Actions)
  - 통계 및 모니터링
- **컴포넌트**: `AdminDashboard`, `UserManagement`, `SystemSettings`

---

## 컴포넌트 구조

### 컴포넌트 계층 구조

**⚠️ 중요: Feature-Based Architecture에 따른 구조**

```
src/
├── components/              # 공통 UI 컴포넌트만
│   ├── ui/                 # shadcn/ui 기본 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   └── layout/            # 레이아웃 컴포넌트
│       ├── header.tsx      # 공통 헤더 (EntitySwitcher 포함)
│       ├── sidebar.tsx     # 사이드바 (역할별)
│       └── footer.tsx      # 푸터
│
└── features/               # Feature-Based 모듈 (핵심)
    ├── auth/              # 인증 기능 모듈
    │   └── components/
    │       ├── sign-in-form.tsx
    │       ├── sign-up-form.tsx
    │       └── oauth-buttons.tsx
    │
    ├── attendance/        # 출퇴근/위치보고 통합 기능 모듈
    │   └── components/
    │       ├── attendance-clock-button.tsx   # 출근/퇴근 버튼 (상태 기반 단일 버튼)
    │       ├── location-report-button.tsx    # 위치보고 버튼 (메모 입력 포함)
    │       ├── location-report-modal.tsx     # 위치보고 모달 (메모 입력 폼)
    │       ├── current-status.tsx            # 현재 상태 표시
    │       ├── recent-records.tsx            # 최근 기록 미리보기
    │       ├── attendance-history.tsx        # 출퇴근 이력
    │       ├── attendance-calendar.tsx       # 출퇴근 캘린더
    │       ├── location-verification.tsx      # 위치 검증 컴포넌트 (v5.2)
    │       ├── location-verification-detail.tsx # 위치 검증 상세 정보 (시나리오 36)
    │       ├── proof-list.tsx                 # 위치보고 목록
    │       ├── proof-card.tsx                 # 위치보고 카드 (메모 표시)
    │       ├── proof-detail-modal.tsx         # 위치보고 상세 모달
    │       ├── proof-export-button.tsx        # 위치 증빙 내보내기 버튼 (시나리오 26)
    │       └── work-location-filter.tsx       # 근무지별 필터 (시나리오 32)
    │
    ├── work-location/     # 근무지 관리 기능 모듈 (v5.2 신규)
    │   └── components/
    │       ├── work-location-list.tsx        # 근무지 목록
    │       ├── work-location-form.tsx        # 근무지 등록/수정 폼
    │       ├── work-location-map.tsx          # 지도에서 위치 선택
    │       ├── work-location-card.tsx         # 근무지 카드
    │       └── organization-work-locations.tsx # 조직 기본 사업장 조회 (시나리오 33)
    │
    ├── statistics/        # 통계 기능 모듈
    │   └── components/
    │       ├── work-time-stats.tsx           # 근무 시간 통계
    │       ├── stats-chart.tsx               # 통계 차트
    │       ├── stats-comparison.tsx          # 비교 통계
    │       └── stats-export-button.tsx       # 통계 내보내기 버튼
    │
    ├── personal-proof/   # 개인 위치 인증 기능 모듈
    │   └── components/
    │       ├── personal-proof-form.tsx       # 위치 인증 생성 폼
    │       ├── personal-proof-list.tsx       # 위치 인증 목록
    │       ├── personal-proof-detail.tsx      # 위치 인증 상세 정보
    │       └── personal-proof-map.tsx        # 지도에서 위치 인증 내역 확인
    │
    ├── organization/      # 조직 관리 기능 모듈
    │   └── components/
    │       ├── organization-settings-form.tsx
    │       ├── member-list.tsx
    │       └── member-invite-form.tsx
    │
    ├── center/            # 센터 관리 기능 모듈
    │   └── components/
    │       ├── center-settings-form.tsx
    │       ├── qr-code-generator.tsx
    │       └── link-center-org-form.tsx
    │
    ├── membership/        # 멤버십 관리 기능 모듈
    │   └── components/
    │       ├── member-invite-form.tsx
    │       └── member-list-table.tsx
    │
    ├── billing/           # 결제/구독 기능 모듈
    │   └── components/
    │       ├── plan-selector.tsx
    │       ├── manage-subscription-button.tsx
    │       └── subscription-status-banner.tsx
    │
    ├── dashboard/         # 대시보드 기능 모듈
    │   └── components/
    │       ├── dashboard-stats.tsx
    │       ├── recent-attendance.tsx
    │       ├── quick-actions.tsx
    │       └── attendance-chart.tsx
    │
    └── user/              # 사용자 기능 모듈
        └── components/
            ├── profile-settings.tsx
            ├── password-change-form.tsx
            ├── entity-switcher.tsx      # 엔티티 선택 컴포넌트
            └── entity-context-banner.tsx # 엔티티 컨텍스트 표시 배너
```

### Base 페이지 패턴

Base 페이지 컴포넌트는 `components/base/` 또는 각 feature 모듈 내에 위치할 수 있습니다:

```typescript
// 예시: UserBasePage (components/base/ 또는 features/user/components/)
<UserBasePage title="대시보드">
  <DashboardContent />
</UserBasePage>

// 예시: OrgBasePage
<OrgBasePage organizationId={orgId} title="조직 설정">
  <OrganizationSettings />
</OrgBasePage>
```

### EntitySwitcher 컴포넌트

조직/센터 전환은 헤더, 사이드바, 또는 대시보드에 위치한 공통 컴포넌트로 처리:

```typescript
// components/layout/header.tsx 또는 features/user/components/entity-switcher.tsx
<EntitySwitcher 
  organizations={userOrganizations}  // 사용자가 속한 조직 목록
  centers={userCenters}              // 사용자가 속한 센터 목록
  currentEntityId={currentEntityId}
  currentEntityType={currentEntityType} // 1: ORGANIZATION, 2: CENTER
  onEntityChange={(entityId, entityType) => {
    // 엔티티 변경 시 해당 컨텍스트로 라우팅
    if (entityType === ENTITY_TYPES.ORGANIZATION) {
      router.push(`/(user)/org/${entityId}/attendance`);
    } else {
      router.push(`/(user)/center/${entityId}/attendance`);
    }
  }}
/>
```

**EntitySwitcher 기능**:
- 사용자가 속한 모든 조직/센터 목록 표시
- 현재 선택된 엔티티 하이라이트
- 엔티티 선택 시 해당 컨텍스트로 라우팅
- 엔티티별 권한 표시 (예: "조직 오너", "센터 매니저")
- 멤버십이 없는 엔티티는 표시하지 않음

**사용 위치**:
1. **대시보드**: `/(user)/dashboard` - 엔티티 선택 및 컨텍스트 전환
2. **헤더/사이드바**: 현재 컨텍스트 표시 및 빠른 전환
3. **출퇴근/위치증빙 페이지**: 현재 엔티티 컨텍스트 표시

---

## UI 디자인 시스템

### 색상 팔레트

- **Primary**: Blue (#2563EB) - 주요 액션, 링크
- **Secondary**: Purple (#9333EA) - 보조 액션
- **Success**: Green (#10B981) - 성공 상태
- **Warning**: Yellow (#F59E0B) - 경고 상태
- **Error**: Red (#EF4444) - 에러 상태
- **Neutral**: Gray (#6B7280) - 텍스트, 배경

### 타이포그래피

- **Heading 1**: text-5xl md:text-7xl font-black
- **Heading 2**: text-4xl md:text-5xl font-black
- **Heading 3**: text-2xl font-bold
- **Body**: text-base text-gray-600
- **Small**: text-sm text-muted-foreground

### 컴포넌트 스타일

- **Card**: rounded-2xl shadow-lg hover:shadow-xl transition-all
- **Button**: rounded-xl font-bold
- **Input**: rounded-lg border-2
- **Badge**: rounded-full

### 반응형 브레이크포인트

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

---

## 페이지별 상세 설계

### 1. 랜딩 페이지 (`/`)

#### Hero Section
```tsx
<section className="pt-20 pb-16 px-4">
  <h1 className="text-5xl md:text-7xl font-black">
    <span className="text-blue-600">위치 기반</span>
    <span className="block text-gray-900">출퇴근 관리</span>
  </h1>
  <p className="text-xl md:text-2xl text-gray-600">
    GPS 기반 정확한 출퇴근 추적
  </p>
  <div className="flex gap-4">
    <Button size="lg">무료 체험 시작하기</Button>
    <Button variant="outline" size="lg">서비스 살펴보기</Button>
  </div>
</section>
```

#### Value Proposition Cards
- 3개 카드 그리드 레이아웃
- 아이콘 + 제목 + 설명
- 호버 효과

### 2. 개인 대시보드 (`/(user)/dashboard`)

#### EntitySwitcher 섹션
- 소속 조직 목록 (카드 형태)
- 소속 센터 목록 (카드 형태)
- 각 엔티티별 권한 표시
- 엔티티 선택 시 해당 컨텍스트로 이동

#### Stats Cards (4개)
- 출근 시간 (모든 엔티티 통합 또는 선택한 엔티티)
- 이번 주 근무 시간 (모든 엔티티 합계)
- 출근율 (모든 엔티티 평균)
- 프로필 정보

#### Recent Attendance
- 최근 5개 출퇴근 기록 (모든 엔티티 또는 필터링)
- 날짜, 시간, 상태, 엔티티 표시
- 전체 기록 보기 링크

#### Quick Actions
- "조직으로 가기" 버튼 (조직 선택 모달) → `/(user)/org/[orgId]`
- "센터로 가기" 버튼 (센터 선택 모달) → `/(user)/center/[centerId]`
- **참고**: 통합 페이지에서 출근/퇴근/위치보고 모두 수행 가능

### 3. 조직 컨텍스트 통합 페이지 (`/(user)/org/[orgId]`)

#### Entity Context Banner
- 현재 조직 이름 표시
- 조직 변경 버튼 (EntitySwitcher 열기)
- 조직 권한 표시 (예: "조직 오너", "일반 멤버")

#### Attendance Clock Button (출근/퇴근 버튼)
- **단일 버튼** (상태 기반):
  - 사용자 출근 상태에 따라 "출근" 또는 "퇴근" 텍스트 표시
  - 출근 상태가 아닐 때: 큰 원형 버튼 (초록색) - "출근" 표시
  - 출근 상태일 때: 큰 원형 버튼 (빨간색) - "퇴근" 표시
  - 위치 검증 포함 (해당 조직의 허용 반경 기준)
  - 로딩 상태 처리
  - 버튼 클릭 시 현재 상태에 따라 출근 또는 퇴근 처리

#### Location Report Button (위치보고 버튼)
- **별도 버튼**:
  - 중간 크기 버튼 (파란색)
  - GPS 기반 위치 획득
  - 위치보고 모달 또는 인라인 입력 폼
  - **짧은 메모 입력 기능**:
    - 텍스트 입력 필드 (최대 200자)
    - 문자 수 표시 (예: "150/200")
    - 선택적 입력 (메모 없이도 위치보고 가능)
  - 항상 표시 (출근 상태와 무관)

#### Current Status (현재 상태)
- 현재 출근 상태 배지 (해당 조직 기준)
- 출근 시간 표시
- 위치 정보
- 조직별 설정 표시 (예: 자정 강제 퇴근 여부)

#### Recent Records (최근 기록 미리보기)
- 오늘의 출퇴근 기록 카드
- 최근 위치보고 기록 (3-5개, 카드 형태)
- 각 기록에 상세 보기 링크
- "전체 기록 보기" 버튼 → `/history` 페이지로 이동

### 4. 센터 컨텍스트 통합 페이지 (`/(user)/center/[centerId]`)

#### Entity Context Banner
- 현재 센터 이름 표시
- 센터 변경 버튼 (EntitySwitcher 열기)
- 센터 권한 표시 (예: "센터 매니저", "일반 스태프")

#### Attendance Clock Button (출근/퇴근 버튼)
- **단일 버튼** (상태 기반):
  - 사용자 출근 상태에 따라 "출근" 또는 "퇴근" 텍스트 표시
  - 출근 상태가 아닐 때: 큰 원형 버튼 (초록색) - "출근" 표시
  - 출근 상태일 때: 큰 원형 버튼 (빨간색) - "퇴근" 표시
  - 위치 검증 포함 (해당 센터의 허용 반경 기준)
  - 로딩 상태 처리
  - 버튼 클릭 시 현재 상태에 따라 출근 또는 퇴근 처리

#### Location Report Button (위치보고 버튼)
- **별도 버튼**:
  - 중간 크기 버튼 (파란색)
  - GPS 기반 위치 획득
  - 위치보고 모달 또는 인라인 입력 폼
  - **짧은 메모 입력 기능**:
    - 텍스트 입력 필드 (최대 200자)
    - 문자 수 표시 (예: "150/200")
    - 선택적 입력 (메모 없이도 위치보고 가능)
  - 항상 표시 (출근 상태와 무관)

#### Current Status (현재 상태)
- 현재 출근 상태 배지 (해당 센터 기준)
- 출근 시간 표시
- 위치 정보
- 센터별 설정 표시 (예: 자정 강제 퇴근 여부)

#### Recent Records (최근 기록 미리보기)
- 오늘의 출퇴근 기록 카드
- 최근 위치보고 기록 (3-5개, 카드 형태)
- 각 기록에 상세 보기 링크
- "전체 기록 보기" 버튼 → `/history` 페이지로 이동

### 5. 조직 설정 (`/(org-management)/manage/org/[orgId]/settings`)

#### Work Time Settings
- 출근 시간 선택 (Time Picker)
- 퇴근 시간 선택 (Time Picker)
- 타임존 선택 (Select)
- **자정 강제 퇴근 토글** (Switch)
  - `force_clockout_at_midnight` 설정
  - 설명 텍스트: "자정(23:59:59)을 넘기면 자동으로 퇴근 처리됩니다"
- **접근 방식**: Tier 2 (tRPC) - 조직 관리자만 수정 가능

---

## 구현 우선순위

### Phase 1: 핵심 인프라 (1주)
1. ✅ Base 페이지 컴포넌트 (`base/`)
2. ✅ 레이아웃 컴포넌트 (`layout/`)
3. ✅ 인증 컴포넌트 (`auth/`)
4. ✅ 공개 페이지 레이아웃

### Phase 2: 공개 페이지 (1주)
1. 랜딩 페이지 (`/`)
2. 로그인 페이지 (`/login`)
3. 회원가입 페이지 (`/signup`)
4. 요금제 페이지 (`/pricing`)

### Phase 3: 일반 사용자 페이지 (3주)

#### Phase 3.1: 핵심 기능 (1주)
1. 개인 대시보드 (`/(user)/dashboard`)
   - EntitySwitcher 컴포넌트 포함
   - 시나리오 21, 22 지원
2. **조직 컨텍스트 통합 페이지** (`/(user)/org/[orgId]`)
   - 출근/퇴근/위치보고 통합 인터페이스
   - AttendanceClockButton 컴포넌트 (상태 기반 단일 버튼)
   - LocationReportButton 컴포넌트 (메모 입력 포함)
   - LocationVerification 컴포넌트 (v5.2 위치 검증)
   - LocationVerificationDetail 컴포넌트 (시나리오 36)
   - OrganizationWorkLocations 컴포넌트 (시나리오 33)
   - 시나리오 4, 8, 31, 33, 34, 36 지원
3. **센터 컨텍스트 통합 페이지** (`/(user)/center/[centerId]`)
   - 출근/퇴근/위치보고 통합 인터페이스
   - 동일한 컴포넌트 구조
   - 시나리오 4, 8, 20, 31, 34, 36 지원

#### Phase 3.2: 이력 및 캘린더 (1주)
4. 조직 컨텍스트 출퇴근 이력 (`/(user)/org/[orgId]/history`)
   - WorkLocationFilter 컴포넌트 (시나리오 32)
   - ProofExportButton 컴포넌트 (시나리오 26)
   - LocationVerificationDetail 컴포넌트 (시나리오 36)
   - 시나리오 9, 25, 26, 32, 36 지원
5. 조직 컨텍스트 출퇴근 캘린더 (`/(user)/org/[orgId]/calendar`)
   - 시나리오 24 지원
6. 센터 컨텍스트 출퇴근 이력 (`/(user)/center/[centerId]/history`)
   - 동일한 기능
7. 센터 컨텍스트 출퇴근 캘린더 (`/(user)/center/[centerId]/calendar`)
   - 시나리오 24 지원

#### Phase 3.3: 근무지 관리 및 통계 (1주)
8. **근무지 관리** (`/(user)/org/[orgId]/work-locations`) (v5.2 신규)
   - WorkLocationList 컴포넌트
   - WorkLocationForm 컴포넌트
   - WorkLocationMap 컴포넌트
   - 시나리오 29, 30, 35 지원
9. **근무 시간 통계** (`/(user)/statistics` 또는 `/(user)/org/[orgId]/statistics`)
   - WorkTimeStats 컴포넌트
   - StatsChart 컴포넌트
   - StatsComparison 컴포넌트
   - 시나리오 28 지원
10. **개인 위치 인증** (`/(user)/personal-proofs`)
    - PersonalProofForm 컴포넌트
    - PersonalProofList 컴포넌트
    - PersonalProofMap 컴포넌트
    - 시나리오 7 지원
11. 프로필 설정 (`/(user)/settings`)
    - 시나리오 23 지원

### Phase 4: 조직 관리 페이지 (2주)
1. 조직 대시보드 (`/(org-management)/manage/org/[orgId]/dashboard`)
2. 조직 설정 (`/(org-management)/manage/org/[orgId]/settings`)
   - **자정 강제 퇴근 설정 포함**
3. 멤버 관리 (`/(org-management)/manage/org/[orgId]/members`)
4. 출퇴근 관리 (`/(org-management)/manage/org/[orgId]/attendance`)
5. 조직 빌링 (`/(org-management)/manage/org/[orgId]/billing`)

### Phase 5: 센터 관리 페이지 (1주)
1. 센터 대시보드 (`/(center-management)/manage/center/[centerId]/dashboard`)
2. 센터 설정 (`/(center-management)/manage/center/[centerId]/settings`)
   - **자정 강제 퇴근 설정 포함**
3. 연결된 조직 관리 (`/(center-management)/manage/center/[centerId]/organizations`)
4. QR 코드 생성 (`/(center-management)/manage/center/[centerId]/qr`)
5. 센터 빌링 (`/(center-management)/manage/center/[centerId]/billing`)

### Phase 6: 법정 대리인 페이지 (1주)
1. 법정 대리인 대시보드 (`/(law-agency)/dashboard`)

### Phase 7: QR 코드 페이지 (1주)
1. 센터 QR (`/qr/center/[id]`)
2. 조직 QR (`/qr/org/[id]`)

### Phase 8: 앱 관리자 페이지 (1주)
1. 시스템 관리 (`/(app-manager)/admin`)

---

## 참고사항

### 프로젝트 룰 준수

**⚠️ 헌법 파일 기준**: `.cursor/rules/basic-architecture.mdc`, `.cursor/rules/feature-based-architecture.mdc`

- **3-Tier Architecture**: Tier 1(클라이언트 직접 접근), Tier 2(tRPC), Tier 3(Server Actions) 구분
- **Feature-Based Architecture**: 컴포넌트는 `features/{feature-name}/components/`에 위치
- **라우팅 구조**: 헌법(`feature-based-architecture.mdc`)에 명시된 구조 준수
  - `(user)/`: 일반 사용자 (Tier 1) - `dashboard/`, `settings/`, `org/[orgId]/`, `center/[centerId]/`
    - 실제 URL: `/dashboard`, `/settings`, `/org/[orgId]`, `/center/[centerId]`
  - `(org-management)/`: 조직 관리 (Tier 2) - `manage/org/[orgId]/dashboard/`, `manage/org/[orgId]/members/`, `manage/org/[orgId]/settings/`, `manage/org/[orgId]/attendance/`, `manage/org/[orgId]/billing/`
    - 실제 URL: `/manage/org/[orgId]/dashboard`, `/manage/org/[orgId]/members`, `/manage/org/[orgId]/settings`, `/manage/org/[orgId]/attendance`, `/manage/org/[orgId]/billing`
    - ⚠️ **라우팅 충돌 방지**: `manage/` prefix로 Tier 1 경로와 구분
  - `(center-management)/`: 센터 관리 (Tier 2) - `manage/center/[centerId]/dashboard/`, `manage/center/[centerId]/organizations/`, `manage/center/[centerId]/settings/`, `manage/center/[centerId]/qr/`, `manage/center/[centerId]/billing/`
    - 실제 URL: `/manage/center/[centerId]/dashboard`, `/manage/center/[centerId]/organizations`, `/manage/center/[centerId]/settings`, `/manage/center/[centerId]/qr`, `/manage/center/[centerId]/billing`
    - ⚠️ **라우팅 충돌 방지**: `manage/` prefix로 Tier 1 경로와 구분
  - `(law-agency)/`: 법정 대리인 - `dashboard/`
  - `(app-manager)/`: 앱 관리자 (Tier 3) - `admin/users/`, `admin/organizations/`, `admin/centers/`, `admin/settings/`
- **빌링 라우트**: 엔티티별 라우트에 포함 (`/manage/org/[orgId]/billing`, `/manage/center/[centerId]/billing`)
- **엔티티 컨텍스트**: URL 파라미터로 엔티티 컨텍스트 전달 (`/(user)/org/[orgId]/`, `/(user)/center/[centerId]/`)

### 엔티티 컨텍스트 시나리오 지원

#### 시나리오 1: 센터 매니저가 센터 소속 조직 일원으로 출근
1. `/(user)/dashboard`에서 EntitySwitcher로 조직 선택
2. 선택한 조직으로 `/(user)/org/[orgId]` 이동
3. 통합 페이지에서 출근 버튼 클릭
4. 위치 검증 수행 (직원 근무지 → 조직 사업장 → 아무데서나 허용)
5. 위치 검증 성공 시 출근 기록 완료

#### 시나리오 2: 조직 오너가 조직 일원으로 출근
1. `/(user)/dashboard`에서 EntitySwitcher로 자신의 조직 선택
2. 선택한 조직으로 `/(user)/org/[orgId]` 이동
3. 통합 페이지에서 출근 버튼 클릭
4. 위치 검증 수행
5. 위치 검증 성공 시 출근 기록 완료

#### 시나리오 3: 조직 오너가 다른 센터로 위치증빙
1. `/(user)/dashboard`에서 EntitySwitcher로 다른 센터 선택
2. 선택한 센터로 `/(user)/center/[centerId]` 이동
3. 통합 페이지에서 위치보고 버튼 클릭 → 위치 증빙 생성 완료

#### 시나리오 4: 위치 검증 실패 시 처리 (v5.2 신규)
1. 출퇴근 버튼 클릭
2. 위치 검증 실패 (허용 반경 밖)
3. 에러 메시지 표시 및 대안 제시:
   - 위치 재확인 버튼
   - 근무지 확인 버튼 → `/(user)/org/[orgId]/work-locations`로 이동
   - 관리자에게 문의 버튼

#### 시나리오 5: 근무지 관리 (v5.2 신규)
1. `/(user)/org/[orgId]/work-locations` 접근
2. 근무지 추가 버튼 클릭
3. 주소 검색 또는 지도에서 위치 선택
4. 허용 반경 설정
5. 저장 → 근무지 등록 완료

**핵심 원칙**:
- **통합 접근**: 출근/퇴근/위치보고를 하나의 페이지에서 수행
- **MSA 관점**: 사용자가 액션을 수행하고 "잊어버리는" 단순한 UX
- **위치 검증**: v5.2 위치 검증 로직 적용 (직원 근무지 → 조직/센터 사업장 → 아무데서나 허용)
- 엔티티 컨텍스트는 URL 파라미터로 명시적으로 전달
- EntitySwitcher로 엔티티 선택 및 컨텍스트 전환
- 각 엔티티 컨텍스트에서 해당 엔티티의 설정 적용 (예: 자정 강제 퇴근)
- 위치 검증 실패 시 명확한 에러 메시지 및 해결 방법 제시

### 레퍼런스 프로젝트 활용

- **Base 페이지 패턴**: `reference-repos/commuting-react-supabase-app/components/base/`
- **출퇴근 컴포넌트**: `reference-repos/commuting-react-supabase-app/components/attendance/`
- **레이아웃 컴포넌트**: `reference-repos/commuting-react-supabase-app/components/layout/`

### 고객 여정 반영

- 모든 페이지는 `docs/customer-journey/251118_user_journey_hypothesis.md`의 시나리오를 반영
- QR 코드 페이지는 비로그인 사용자도 접근 가능하도록 설계
- 위치 기반 검증은 모든 출퇴근/증빙 기능에 포함

### 접근성 고려사항

- 모든 버튼에 명확한 라벨
- 키보드 네비게이션 지원
- 스크린 리더 지원
- 색상 대비 비율 준수

### 미들웨어 고려사항

- 구독 상태 체크: `(user)`, `(org-management)`, `(center-management)` 라우트 그룹에 적용
- 비활성 구독 시 해당 엔티티의 `/billing` 페이지로 리디렉션
- 역할 기반 접근 제어: 비트 연산으로 권한 확인

---

**다음 단계**: Phase 1부터 순차적으로 구현 시작

