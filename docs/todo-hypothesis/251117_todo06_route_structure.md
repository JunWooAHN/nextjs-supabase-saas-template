# Todo 06: 라우트 구조 (Route Structure)

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

`(marketing)`, `(protected)` 라우트 그룹만 존재합니다.

## 작업 목표

prove-geo-web-app v5.1 아키텍처에 필요한 모든 라우트 그룹과 API 라우트를 생성합니다.

## 작업 항목

### 6.1. 누락된 라우트 그룹 생성

- [ ] `(user)` 라우트 그룹 생성 (일반 사용자)
  - `(user)/dashboard/page.tsx` - 사용자 대시보드
  - `(user)/proofs/page.tsx` - 내 위치 증빙 목록
  - `layout.tsx` - 사용자 전용 레이아웃

- [ ] `(org_management)` 라우트 그룹 생성 (조직 관리)
  - `(org_management)/[orgId]/dashboard/page.tsx` - 조직 대시보드
  - `(org_management)/[orgId]/members/page.tsx` - 멤버 관리
  - `(org_management)/[orgId]/settings/page.tsx` - 조직 설정
  - `layout.tsx` - 조직 관리 전용 레이아웃

- [ ] `(center_management)` 라우트 그룹 생성 (센터 관리)
  - `(center_management)/[centerId]/dashboard/page.tsx` - 센터 대시보드
  - `(center_management)/[centerId]/organizations/page.tsx` - 관리 조직 목록
  - `(center_management)/[centerId]/settings/page.tsx` - 센터 설정
  - `layout.tsx` - 센터 관리 전용 레이아웃

- [ ] `(law_agency)` 라우트 그룹 생성 (법정 대리인)
  - `(law_agency)/dashboard/page.tsx` - 법정 대리인 대시보드
  - `(law_agency)/clients/page.tsx` - 담당 조직/센터 목록
  - `layout.tsx` - 법정 대리인 전용 레이아웃

- [ ] `(app_manager)` 라우트 그룹 생성 (앱 매니저)
  - `(app_manager)/dashboard/page.tsx` - 앱 매니저 대시보드
  - `(app_manager)/users/page.tsx` - 모든 사용자 관리
  - `(app_manager)/entities/page.tsx` - 모든 엔티티 관리
  - `(app_manager)/subscriptions/page.tsx` - 모든 구독 관리
  - `layout.tsx` - 앱 매니저 전용 레이아웃

- [ ] `(billing)` 라우트 그룹 생성 (결제)
  - `(billing)/plans/page.tsx` - 플랜 선택 페이지
  - `(billing)/manage/page.tsx` - 결제 포털 (Stripe Portal)
  - `(billing)/suspended/page.tsx` - 기능 정지 안내 페이지
  - `layout.tsx` - 결제 전용 레이아웃

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

- 라우트 그룹은 URL에 영향을 주지 않습니다 (괄호는 무시됨)
- 각 라우트 그룹의 `layout.tsx`에서 권한 기반 접근 제어를 수행합니다
- Middleware에서도 역할 기반 접근 제어를 수행합니다 (별도 Todo 07)
- API 라우트는 Next.js App Router의 표준 패턴을 따릅니다

