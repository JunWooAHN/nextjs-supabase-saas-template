# address_cache 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/todo-hypothesis/251118_commuting_app_features.md`

## 개요

주소 캐시 테이블. GPS 좌표를 주소로 변환한 결과를 캐싱하여 지오코딩 API 호출 비용을 절감합니다.

## 테이블 정의

```sql
CREATE TABLE address_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address_full TEXT NOT NULL, -- 전체 주소
  address_short TEXT, -- 짧은 주소
  address_district TEXT, -- 구/군 단위
  api_provider VARCHAR NOT NULL, -- 지오코딩 API 제공자 (예: "kakao", "naver")
  confidence_score NUMERIC DEFAULT 1.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  hit_count INTEGER DEFAULT 1, -- 캐시 히트 횟수
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(latitude, longitude, api_provider)
);
```

## 컬럼 설명

- **id**: UUID (Primary Key) - 캐시 항목 고유 ID
- **latitude**: REAL (NOT NULL) - 위도
- **longitude**: REAL (NOT NULL) - 경도
- **address_full**: TEXT (NOT NULL) - 전체 주소
- **address_short**: TEXT - 짧은 주소
- **address_district**: TEXT - 구/군 단위 주소
- **api_provider**: VARCHAR (NOT NULL) - 지오코딩 API 제공자 (예: "kakao", "naver")
- **confidence_score**: NUMERIC (기본값 1.00) - 신뢰도 점수 (0.0 ~ 1.0)
- **hit_count**: INTEGER (기본값 1) - 캐시 히트 횟수
- **last_used_at**: TIMESTAMP WITH TIME ZONE - 마지막 사용 시간
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_address_cache_coordinates ON address_cache(latitude, longitude);
CREATE INDEX idx_address_cache_last_used ON address_cache(last_used_at DESC);
CREATE INDEX idx_address_cache_provider ON address_cache(api_provider);
```

## RLS 정책

```sql
ALTER TABLE address_cache ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증된 사용자는 조회 가능 (공개 읽기)
CREATE POLICY "address_cache_select" ON address_cache
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT/UPDATE: 서버 사이드에서만 수행 (RLS 정책 없음, service_role 사용)
-- (app/api/geocoding/reverse/route.ts에서 처리)
```

## 참고사항

- 공개 읽기 (모든 인증된 사용자 조회 가능)
- INSERT/UPDATE는 서버 사이드에서만 수행 (service_role 키 사용)
- 캐시 만료 정책: 오래된 캐시는 주기적으로 정리 필요
- 좌표와 API 제공자 조합으로 UNIQUE 제약

