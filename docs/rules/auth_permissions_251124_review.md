# JWT 기반 권한/구독 처리 방식 검토 결과

**작성일**: 2025-01-24  
**검토 문서**: `docs/rules/auth_permissions_251124.md`  
**기준 문서**: `docs/rules/5.1.md`, `docs/rules/251117_feature_based_architecture.md`

## 1. 검토 개요

새로운 룰(`auth_permissions_251124.md`)은 JWT의 `app_metadata`에 memberships 정보(구독 상태 + 권한)를 저장하여 미들웨어에서 DB 조회 없이 권한/구독 체크를 수행하는 방식을 제안합니다.

## 2. 기존 룰과의 비교

### 2.1. 미들웨어 권한 체크 방식

| 항목 | 기존 룰 (5.1.md) | 새 룰 (v5.6) |
|------|------------------|--------------|
| **권한 체크 위치** | 미들웨어에서 DB 조회 | 미들웨어에서 JWT 파싱 |
| **DB 쿼리** | `memberships` 테이블 SELECT | 없음 (JWT에서 읽기) |
| **성능** | 매 요청마다 DB 조회 (지연 발생) | Zero DB Latency |
| **구현 위치** | `middleware.ts`에서 Supabase 클라이언트 사용 | `middleware.ts`에서 `user.app_metadata` 사용 |

**상충 여부**: ⚠️ **부분적 상충** - 구현 방식은 다르지만 목적은 동일 (권한 체크)

### 2.2. 구독 상태 체크 방식

| 항목 | 기존 룰 (5.1.md) | 새 룰 (v5.6) |
|------|------------------|--------------|
| **구독 체크 위치** | 미들웨어에서 DB 조회 | 미들웨어에서 JWT 파싱 |
| **DB 쿼리** | `entity_subscriptions` 테이블 SELECT | 없음 (JWT에서 읽기) |
| **성능** | 매 요청마다 DB 조회 (지연 발생) | Zero DB Latency |
| **구현 위치** | `middleware.ts`에서 Supabase 클라이언트 사용 | `middleware.ts`에서 `user.app_metadata` 사용 |

**상충 여부**: ⚠️ **부분적 상충** - 구현 방식은 다르지만 목적은 동일 (구독 상태 체크)

### 2.3. DB Hook 사용

| 항목 | 기존 룰 | 새 룰 (v5.6) |
|------|---------|--------------|
| **DB Hook** | 언급 없음 | `custom_access_token_hook` 사용 |
| **JWT 주입** | 없음 | `app_metadata.memberships`에 주입 |
| **데이터 구조** | - | `{ "EntityUUID": [Status, PermHex] }` |

**상충 여부**: ✅ **상충 없음** - 새로운 기능 추가

### 2.4. 권한 저장 형식

| 항목 | 기존 룰 | 새 룰 (v5.6) |
|------|---------|--------------|
| **DB 저장** | `bigint` (memberships.permissions) | `bigint` (동일) |
| **JWT 저장** | 없음 | Hex String (16진수 문자열) |
| **이유** | - | BigInt 정밀도 보장 + 용량 절약 |

**상충 여부**: ✅ **상충 없음** - JWT 저장 형식만 추가

### 2.5. 3-Tier 아키텍처

| Tier | 기존 룰 | 새 룰 (v5.6) |
|------|---------|--------------|
| **Tier 1** | 클라이언트 직접 접근 (RLS) | 동일 (변경 없음) |
| **Tier 2** | tRPC (서버 클라이언트) | 동일 (변경 없음) |
| **Tier 3** | Server Actions (SERVICE_ROLE_KEY) | 동일 (변경 없음) |
| **미들웨어** | DB 조회로 권한/구독 체크 | JWT 파싱으로 권한/구독 체크 |

**상충 여부**: ✅ **상충 없음** - 3-Tier 아키텍처는 유지, 미들웨어 구현만 최적화

## 3. 주요 상충 포인트 및 해결 방안

### 3.1. ⚠️ 미들웨어 구현 방식 변경

**상충 내용**:
- 기존 룰: 미들웨어에서 DB 조회 (`memberships`, `entity_subscriptions` 테이블)
- 새 룰: 미들웨어에서 JWT 파싱 (`user.app_metadata.memberships`)

**해결 방안**:
1. **기존 룰 업데이트**: `docs/rules/5.1.md`의 미들웨어 섹션을 v5.6 방식으로 업데이트
2. **마이그레이션 가이드 작성**: 기존 DB 조회 방식에서 JWT 기반 방식으로 전환하는 가이드 제공
3. **하위 호환성 고려**: DB Hook이 없거나 실패하는 경우를 위한 fallback 로직 추가

### 3.2. ⚠️ 구독 상태 체크 타이밍

**상충 내용**:
- 기존 룰: 매 요청마다 `entity_subscriptions` 테이블 조회
- 새 룰: JWT에 캐시된 구독 상태 사용 (JWT 갱신 시점에만 DB 조회)

**해결 방안**:
1. **JWT 갱신 전략**: 구독 상태 변경 시 JWT 갱신 트리거 필요
2. **Webhook 연동**: 결제 웹훅에서 구독 상태 변경 시 사용자 세션 갱신
3. **캐시 무효화**: 구독 상태 변경 시 관련 사용자들의 JWT 갱신

### 3.3. ✅ DB Hook 구현 필요

**상충 내용**:
- 기존 룰: DB Hook에 대한 언급 없음
- 새 룰: `custom_access_token_hook` 함수 필요

**해결 방안**:
1. **마이그레이션 파일 생성**: DB Hook 함수를 마이그레이션으로 추가
2. **테스트**: Hook이 정상 작동하는지 확인
3. **문서화**: Hook 동작 방식과 주의사항 문서화

## 4. 권장 사항

### 4.1. 즉시 적용 가능한 부분

✅ **JWT 구조 설계**: `app_metadata.memberships` 구조는 즉시 적용 가능
✅ **Hex String 변환**: `PermissionsBitField.fromHex()` 메서드 추가
✅ **미들웨어 로직**: JWT 파싱 로직 구현

### 4.2. 단계적 적용 필요 부분

⚠️ **DB Hook 구현**: 
- Supabase 프로젝트에 Hook 설정 필요
- 테스트 환경에서 검증 후 프로덕션 적용

⚠️ **기존 코드 마이그레이션**:
- 기존 DB 조회 방식 코드를 JWT 기반으로 전환
- Fallback 로직 추가 (Hook 실패 시 DB 조회)

### 4.3. 주의사항

1. **JWT 크기 제한**: JWT는 4KB 제한이 있으므로, memberships가 50개를 초과하지 않도록 제한 필요
2. **데이터 일관성**: JWT는 캐시된 데이터이므로, 권한/구독 변경 시 즉시 반영되지 않을 수 있음
3. **보안**: JWT는 클라이언트에서도 접근 가능하므로, 민감한 정보는 포함하지 않도록 주의

## 5. 결론

### 5.1. 상충 요약

| 항목 | 상충 여부 | 심각도 |
|------|-----------|--------|
| 미들웨어 권한 체크 방식 | ⚠️ 부분적 상충 | 낮음 (최적화) |
| 구독 상태 체크 방식 | ⚠️ 부분적 상충 | 낮음 (최적화) |
| DB Hook 사용 | ✅ 상충 없음 | 없음 (신규 기능) |
| 권한 저장 형식 | ✅ 상충 없음 | 없음 (호환) |
| 3-Tier 아키텍처 | ✅ 상충 없음 | 없음 (유지) |

### 5.2. 최종 권장사항

**✅ 적용 권장**: 새로운 룰은 기존 아키텍처와 충돌하지 않으며, 성능 최적화를 제공합니다.

**필수 작업**:
1. `docs/rules/5.1.md` 업데이트 (미들웨어 섹션을 v5.6 방식으로 변경)
2. DB Hook 마이그레이션 파일 생성
3. 미들웨어 코드 업데이트 (JWT 파싱 로직 추가)
4. `PermissionsBitField.fromHex()` 메서드 추가
5. Webhook에서 구독 상태 변경 시 JWT 갱신 로직 추가

**선택 작업**:
- 기존 DB 조회 방식 코드를 JWT 기반으로 전환 (점진적 마이그레이션)
- Fallback 로직 추가 (Hook 실패 시 DB 조회)

## 6. 참고 문서

- [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [기존 룰: 5.1.md](./5.1.md)
- [Feature-Based 아키텍처](./251117_feature_based_architecture.md)

