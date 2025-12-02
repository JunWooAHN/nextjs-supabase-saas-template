# Todo 06: 라우트 구조 (Route Structure)

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

`(marketing)`, `(user)` 라우트 그룹이 존재합니다.
- `(marketing)/login/page.tsx` ✅
- `(marketing)/signup/page.tsx` ✅
- `(user)/dashboard/page.tsx` ✅
- `(user)/settings/page.tsx` ✅
- `(user)/layout.tsx` ✅
- `app/auth/callback/route.ts` ✅
- `app/auth/signout/route.ts` ✅

**참고**: `(protected)` 라우트 그룹은 제거되었습니다. 역할별 라우트 그룹(`(user)`, `(org-management)`, `(center-management)` 등)이 각각 인증을 처리합니다.

## 작업 목표

prove-geo-web-app v5.1 아키텍처에 필요한 모든 라우트 그룹과 API 라우트를 생성합니다.

## 작업 항목

### 6.1. 누락된 라우트 그룹 생성

- [ ] `(user)` 라우트 그룹 생성 (일반 사용자)
  - `(user)/dashboard/page.tsx` - 사용자 대시보드
  - `(user)/proofs/page.tsx` - 내 위치 증빙 목록
  - `layout.tsx` - 사용자 전용 레이아웃

- [ ] `(org-management)` 라우트 그룹 생성 (조직 관리)
  - `(org-management)/[orgId]/dashboard/page.tsx` - 조직 대시보드
  - `(org-management)/[orgId]/members/page.tsx` - 멤버 관리
  - `(org-management)/[orgId]/settings/page.tsx` - 조직 설정
  - `(org-management)/[orgId]/billing/page.tsx` - 조직 빌링 관리 (플랜 선택, 결제 포털, 구독 상태 표시)
  - `layout.tsx` - 조직 관리 전용 레이아웃

- [ ] `(center-management)` 라우트 그룹 생성 (센터 관리)
  - `(center-management)/[centerId]/dashboard/page.tsx` - 센터 대시보드
  - `(center-management)/[centerId]/organizations/page.tsx` - 관리 조직 목록
  - `(center-management)/[centerId]/settings/page.tsx` - 센터 설정
  - `(center-management)/[centerId]/billing/page.tsx` - 센터 빌링 관리 (플랜 선택, 결제 포털, 구독 상태 표시)
  - `layout.tsx` - 센터 관리 전용 레이아웃

- [ ] `(law-agency)` 라우트 그룹 생성 (법정 대리인)
  - `(law-agency)/dashboard/page.tsx` - 법정 대리인 대시보드
  - `(law-agency)/clients/page.tsx` - 담당 조직/센터 목록
  - `layout.tsx` - 법정 대리인 전용 레이아웃

- [ ] `(app-manager)` 라우트 그룹 생성 (앱 매니저)
  - `(app-manager)/dashboard/page.tsx` - 앱 매니저 대시보드
  - `(app-manager)/users/page.tsx` - 모든 사용자 관리
  - `(app-manager)/entities/page.tsx` - 모든 엔티티 관리
  - `(app-manager)/subscriptions/page.tsx` - 모든 구독 관리
  - `layout.tsx` - 앱 매니저 전용 레이아웃

### 6.2. API 라우트 생성

- [ ] `app/api/trpc/[trpc]/route.ts` 생성
  - tRPC API 핸들러
  - GET, POST 핸들러 구현
  - (별도 Todo 04에서 상세 구현)

- [ ] `app/api/webhooks/payment/route.ts` 생성
  - Stripe/TossPayments 웹훅 이벤트 수신
  - POST 핸들러만 구현
  - 웹훅 시그니처 검증
  - SERVICE_ROLE_KEY 사용 (RLS 우회)
  - 이벤트 타입별 처리:
    - `invoice.payment_succeeded`
      - `entity_subscriptions` 업데이트 (status = ACTIVE, current_period_end 갱신)
      - `payment_logs`에 'Success' 기록
    - `invoice.payment_failed`
      - `entity_subscriptions` 업데이트 (status = PAST_DUE 또는 SUSPENDED)
      - `payment_logs`에 'Failed' 기록
    - `customer.subscription.deleted`
      - `entity_subscriptions` 업데이트 (status = CANCELED)

## 참고사항

### 라우트 그룹 명명 규칙

- ✅ **하이픈(-) 사용**: 라우트 그룹 이름은 하이픈을 사용합니다 (`org-management`, `center-management`)
- ❌ 언더스코어(_) 사용 금지: `org_management` (잘못된 형식)
- 라우트 그룹은 URL에 영향을 주지 않습니다 (괄호는 무시됨)
- 예: `(org-management)/[orgId]/dashboard` → 실제 URL: `/org-management/[orgId]/dashboard`

### 권한 기반 접근 제어

- 각 라우트 그룹의 `layout.tsx`에서 권한 기반 접근 제어를 수행합니다
- Middleware에서도 역할 기반 접근 제어를 수행합니다 (별도 Todo 07)
- 권한 검증은 `lib/permissions.ts`의 `PermissionsBitField` 클래스를 사용합니다

### API 라우트

- API 라우트는 Next.js App Router의 표준 패턴을 따릅니다
- tRPC API: `app/api/trpc/[trpc]/route.ts` (Tier 2)
- 웹훅: `app/api/webhooks/payment/route.ts` (Tier 3, SERVICE_ROLE_KEY 사용)

### 피처 기반 아키텍처와의 관계

- 라우트 그룹은 URL 구조를 정의합니다
- 각 라우트의 페이지 컴포넌트는 피처의 컴포넌트를 사용합니다
- 예: `(org-management)/[orgId]/members/page.tsx` → `features/membership/components/member-list-table.tsx` 사용

### 빌링 라우트 구조 설계 결정

**원칙:**
- 빌링 컴포넌트는 `features/billing/`에 독립적으로 유지 (코드 재사용성)
- 빌링 라우트는 엔티티별로 구성 (사용자 경험 및 권한 관리)
- **별도의 `(billing)` 라우트 그룹은 불필요함**

**엔티티별 빌링 라우트 구조:**

1. **조직 빌링**
   - `(org-management)/[orgId]/billing/page.tsx` - 조직 빌링 관리
   - 플랜 선택, 결제 포털, 구독 상태 표시 모두 포함
   - 구독 상태가 비활성일 경우 동일 페이지에서 안내 표시

2. **센터 빌링**
   - `(center-management)/[centerId]/billing/page.tsx` - 센터 빌링 관리
   - 플랜 선택, 결제 포털, 구독 상태 표시 모두 포함
   - 구독 상태가 비활성일 경우 동일 페이지에서 안내 표시

**구현 패턴:**
```typescript
// (org-management)/[orgId]/billing/page.tsx
import { PlanSelector } from '@/features/billing/components/plan-selector';
import { ManageSubscriptionButton } from '@/features/billing/components/manage-subscription-button';
import { SubscriptionStatusBanner } from '@/features/billing/components/subscription-status-banner';

export default async function OrgBillingPage({ params }: { params: { orgId: string } }) {
  // 구독 상태 조회
  const subscription = await getEntitySubscription(params.orgId, ENTITY_TYPES.ORGANIZATION);
  
  // 구독 상태가 비활성일 경우 배너 표시
  if (subscription?.status !== SUBSCRIPTION_STATUS.ACTIVE) {
    return <SubscriptionStatusBanner subscription={subscription} />;
  }
  
  // 활성 상태일 경우 정상 빌링 관리 UI 표시
  return (
    <>
      <PlanSelector entityId={params.orgId} entityType={ENTITY_TYPES.ORGANIZATION} />
      <ManageSubscriptionButton entityId={params.orgId} entityType={ENTITY_TYPES.ORGANIZATION} />
    </>
  );
}
```

**Middleware 구독 상태 체크:**
- Middleware에서 구독 상태가 비활성일 경우 해당 엔티티의 billing 페이지로 리디렉션
- 예: `/org-management/[orgId]/dashboard` → `/org-management/[orgId]/billing` (구독 비활성 시)

**결론:**
- ✅ 빌링 피처(`features/billing/`)는 독립적으로 유지
- ✅ 라우트는 엔티티별로 구성 (`(org-management)/[orgId]/billing`, `(center-management)/[centerId]/billing`)
- ✅ 별도의 `(billing)` 라우트 그룹 불필요
- ✅ 구독 상태 안내는 각 엔티티의 billing 페이지에서 처리

