# 데이터 스키마 문서

**작성일**: 2025-11-18  
**기준 문서**: 
- `docs/rules/5.1.md`
- `docs/customer-journey/251118_user_journey_hypothesis.md`
- `docs/todo-hypothesis/251118_commuting_app_features.md`

## 개요

고객 여정을 지원하기 위한 데이터베이스 스키마를 테이블별로 관리합니다. 각 테이블 파일에는 테이블 정의, 인덱스, RLS 정책이 포함되어 있습니다.

## 테이블 목록

### 핵심 엔티티 테이블
- [profiles.md](./tables/profiles.md) - 사용자 프로필
- [organizations.md](./tables/organizations.md) - 조직/테넌트
- [centers.md](./tables/centers.md) - 센터

### 멤버십 및 관계 테이블
- [memberships.md](./tables/memberships.md) - 멤버십 (핵심)
- [center_org_relationships.md](./tables/center_org_relationships.md) - 센터-조직 관계

### 위치 증빙 테이블
- [location_proofs.md](./tables/location_proofs.md) - 위치 증빙 (기존)
- [attendance_events.md](./tables/attendance_events.md) - 출퇴근 이벤트 (신규)
- [work_locations.md](./tables/work_locations.md) - 근무지 위치 (신규)
- [address_cache.md](./tables/address_cache.md) - 주소 캐시 (신규)

### 구독 및 결제 테이블
- [subscription_plans.md](./tables/subscription_plans.md) - 구독 플랜
- [entity_subscriptions.md](./tables/entity_subscriptions.md) - 엔티티별 구독 상태
- [payment_logs.md](./tables/payment_logs.md) - 결제 로그

### QR 코드 테이블 (신규)
- [qr_codes.md](./tables/qr_codes.md) - QR 코드 정보

## 마이그레이션 전략

각 테이블 파일은 다음을 포함합니다:
1. **테이블 정의**: CREATE TABLE 문
2. **인덱스**: 성능 최적화를 위한 인덱스
3. **RLS 정책**: Row Level Security 정책
4. **제약 조건**: 외래키, 체크 제약 등
5. **관련 상수**: constants.ts와의 동기화 정보

실제 마이그레이션 파일은 `supabase/migrations/` 디렉토리에 생성되며, 이 문서는 참고용입니다.

## 참고사항

- 모든 테이블은 RLS를 활성화해야 합니다
- 소프트 삭제 패턴을 사용합니다 (물리적 DELETE 금지)
- 권한 상수는 `lib/permissions.ts`와 동기화되어야 합니다
- 엔티티 타입 상수는 `lib/constants.ts`와 동기화되어야 합니다

