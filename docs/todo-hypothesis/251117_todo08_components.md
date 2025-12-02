# Todo 08: 컴포넌트 (Components)

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

기본 템플릿 컴포넌트만 존재합니다.

## 작업 목표

prove-geo-web-app v5.1 아키텍처에 필요한 모든 핵심 컴포넌트를 구현합니다.

## 작업 항목

### 8.1. 핵심 컴포넌트 구현

- [ ] `EntitySwitcher` 컴포넌트 생성
  - 위치: `src/components/layout/entity-switcher.tsx` (공통 레이아웃 컴포넌트)
  - 기능: 여러 조직/센터에 속한 경우 엔티티(조직/센터)를 전환하는 드롭다운
  - 데이터: `getEntitiesForUser(userId)` 호출 (서버 컴포넌트 또는 tRPC Query)
  - UI: Radix UI DropdownMenu 사용

- [ ] `MemberInviteForm` 컴포넌트 생성
  - 위치: `features/membership/components/member-invite-form.tsx`
  - 기능: 범용 초대 폼 (조직/센터/역할 선택)
  - Tier 2: `trpc.membership.inviteUserToEntity.useMutation()` 사용
  - 입력: email, entityId, entityType, permissions
  - UI: 폼 컴포넌트 (shadcn/ui)

- [ ] `CreateProofButton` 컴포넌트 생성
  - 위치: `features/proof/components/create-proof-button.tsx`
  - 기능: 위치 증빙 생성 버튼
  - 위치: `(user)/dashboard`에 배치
  - Tier 1: 클라이언트 직접 접근 사용
  - 로직:
    - `navigator.geolocation.getCurrentPosition()` 호출
    - QR 코드 스캔 라이브러리 통합 (v4.1)
    - `entityId`와 `entityType` 획득
    - `supabase.from('location_proofs').insert(...)` 직접 호출
    - RLS INSERT 정책 (user_id = auth.uid())으로 보호됨

- [ ] `ProofsDataTable` 컴포넌트 생성
  - 위치: `features/proof/components/proofs-data-table.tsx`
  - 기능: entityId와 entityType에 따라 증빙 목록을 보여주는 범용 서버 컴포넌트
  - 데이터: 서버 컴포넌트에서 직접 조회 또는 tRPC Query
  - UI: 테이블 컴포넌트 (shadcn/ui)
  - 필터링: entityId, entityType 기반

- [ ] `PlanSelector` 컴포넌트 생성
  - 위치: `features/billing/components/plan-selector.tsx`
  - 기능: 플랜 선택 컴포넌트
  - 배치: 엔티티별 billing 페이지에 사용 (`(org-management)/[orgId]/billing`, `(center-management)/[centerId]/billing`)
  - Tier 2: tRPC Query/Mutation 사용
  - 데이터: `subscription_plans` 조회 (tRPC Query 또는 서버 컴포넌트)
  - 액션: '구독하기' 버튼 클릭 시 `trpc.billing.createCheckoutSession.useMutation()` 호출

- [ ] `ManageSubscriptionButton` 컴포넌트 생성
  - 위치: `features/billing/components/manage-subscription-button.tsx`
  - 기능: 결제 포털로 이동하는 버튼
  - 배치: 엔티티별 billing 페이지에 사용 (`(org-management)/[orgId]/billing`, `(center-management)/[centerId]/billing`)
  - Tier 2: `trpc.billing.createBillingPortalSession.useMutation()` 사용
  - 액션: Mutation 호출 후 리디렉션

- [ ] `SubscriptionStatusBanner` 컴포넌트 생성
  - 위치: `features/billing/components/subscription-status-banner.tsx`
  - 기능: 구독 상태가 비활성일 경우 안내 배너 표시
  - 배치: 엔티티별 billing 페이지에 사용
  - 데이터: 구독 상태 (ACTIVE, PAST_DUE, SUSPENDED, CANCELED 등)
  - UI: 경고/안내 배너 컴포넌트 (shadcn/ui)

- [ ] `ClientListTable` 컴포넌트 생성
  - 위치: `features/relationship/components/client-list-table.tsx` (또는 별도 피처)
  - 기능: 법정 대리인용 테이블 (담당 조직/센터 목록)
  - 위치: `(law_agency)/clients` 페이지에 배치
  - 데이터: 센터가 관리하는 조직 목록 조회
  - UI: 테이블 컴포넌트

- [ ] `AppManagerTable` 컴포넌트 생성
  - 위치: `features/auth/components/app-manager-table.tsx` (또는 별도 피처)
  - 기능: 앱 매니저용 테이블 (모든 사용자/조직/센터 표시)
  - 위치: `(app_manager)/dashboard` 페이지에 배치
  - 데이터: Tier 3 Server Actions 사용 (`getAllEntitiesForAppManager`)
  - UI: 테이블 컴포넌트 (필터링, 정렬 기능)

### 8.2. 기존 컴포넌트 수정

- [ ] `SidebarNav` 컴포넌트 수정
  - 위치: `src/components/layout/sidebar.tsx` (기존 파일 확인)
  - 기능: 사용자 권한에 따른 메뉴 표시
  - 로직:
    - 사용자 권한 조회 (memberships 테이블)
    - 권한에 따라 메뉴 항목 표시/숨김
    - 앱 매니저: 모든 메뉴 표시
    - 센터 관리자: 센터 관련 메뉴 표시
    - 조직 관리자: 조직 관련 메뉴 표시
    - 일반 사용자: 기본 메뉴만 표시

- [ ] `UserProfileButton` 컴포넌트 확인/수정
  - 위치: `src/components/layout/header.tsx` (기존 파일 확인)
  - 기능: 헤더에 표시될 사용자 프로필 아이콘 및 드롭다운
  - 확인 사항:
    - 로그아웃 기능 포함 여부
    - 프로필 정보 표시
    - 필요 시 수정

## 참고사항

- 모든 컴포넌트는 shadcn/ui를 사용합니다
- Tier 1 컴포넌트는 클라이언트 컴포넌트 (`'use client'`)로 구현합니다
- Tier 2 컴포넌트는 tRPC를 사용합니다
- Tier 3 컴포넌트는 Server Actions를 사용합니다
- 서버 컴포넌트는 가능한 한 사용하여 성능을 최적화합니다
- 모든 컴포넌트는 타입 안전성을 보장합니다 (TypeScript)
- **피처 기반 아키텍처**: 피처별 컴포넌트는 `features/{feature}/components/` 디렉토리에 위치합니다
- **공통 컴포넌트**: 레이아웃 관련 공통 컴포넌트는 `components/layout/`에 위치합니다
- **UI 컴포넌트**: shadcn/ui 컴포넌트는 `components/ui/`에 위치합니다

