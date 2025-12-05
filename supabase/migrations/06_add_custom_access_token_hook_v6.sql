-- Migration: v6.0 Custom Access Token Hook
-- JWT에 memberships 정보(구독 상태 + 권한)를 주입하는 Hook 함수
-- 
-- 참고: 이 함수는 Supabase Dashboard > Authentication > Hooks에서 등록해야 합니다.
-- Hook Type: Access Token Hook
-- Hook Function: custom_access_token_hook

/**
 * [Hook] 통합 멤버십 정보 주입
 * 
 * JWT 생성 시 memberships 정보와 앱 매니저 권한을 app_metadata에 주입합니다.
 * 
 * 구조:
 * {
 *   "app_metadata": {
 *     "memberships": {
 *       "org-uuid-1": [1, "1f"],       // [Status, Permissions(Hex)]
 *       "center-uuid-A": [2, "400"],   // [Status, Permissions(Hex)]
 *     },
 *     "app_permissions": "1000000000000000000000000000000000000000000000000000000000000"  // Hex String
 *   }
 * }
 * 
 * Index 0: 구독 상태 (1: Active, 2: Past Due, 3: Suspended, 4: Canceled)
 * Index 1: 권한 비트필드 (16진수 문자열)
 * app_permissions: profiles 테이블의 permissions (앱 매니저 권한 포함)
 */
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  membership_map jsonb;
  app_permissions_hex text;
BEGIN
  -- 에러 발생 시 원본 event를 그대로 반환 (인증 실패 방지)
  BEGIN
    -- 1. 사용자 ID 추출
    user_id := (event->>'user_id')::uuid;
    
    -- user_id가 없으면 빈 memberships 반환
    IF user_id IS NULL THEN
      claims := COALESCE(event->'claims', '{}'::jsonb);
      IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
        claims := jsonb_set(claims, '{app_metadata}', '{}');
      END IF;
      claims := jsonb_set(claims, '{app_metadata,memberships}', '{}'::jsonb);
      claims := jsonb_set(claims, '{app_metadata,app_permissions}', '""'::jsonb);
      event := jsonb_set(event, '{claims}', claims);
      RETURN event;
    END IF;

    -- 2. 전체 멤버십 조회 (50개 제한 보장됨)
    -- 권한(bigint)를 to_hex()로 변환하여 용량 절약 및 정밀도 보장
    SELECT jsonb_object_agg(
      m.entity_id::text,
      json_build_array(
        COALESCE(es.status, 1),       -- Index 0: Status (기본값: ACTIVE)
        to_hex(m.permissions)         -- Index 1: Permissions (Hex String)
      )
    )
    INTO membership_map
    FROM public.memberships m
    LEFT JOIN public.entity_subscriptions es
      ON m.entity_id = es.entity_id 
      AND m.entity_type = es.entity_type
    WHERE m.user_id = user_id;

    -- membership_map이 NULL이면 빈 객체로 설정
    membership_map := COALESCE(membership_map, '{}'::jsonb);

    -- 3. profiles 테이블에서 앱 매니저 권한 조회
    -- permissions(bigint)를 to_hex()로 변환하여 Hex String으로 저장
    SELECT to_hex(COALESCE(p.permissions, 0))
    INTO app_permissions_hex
    FROM public.profiles p
    WHERE p.id = user_id;

    -- app_permissions_hex가 NULL이면 "0"으로 설정
    app_permissions_hex := COALESCE(app_permissions_hex, '0');

    -- 4. JWT Claims 가져오기
    claims := COALESCE(event->'claims', '{}'::jsonb);
    
    -- 5. app_metadata 초기화 (없으면 생성)
    IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    -- 6. 'memberships' 필드에 주입
    claims := jsonb_set(
      claims, 
      '{app_metadata,memberships}', 
      membership_map
    );

    -- 7. 'app_permissions' 필드에 주입 (앱 매니저 권한 포함)
    claims := jsonb_set(
      claims, 
      '{app_metadata,app_permissions}', 
      to_jsonb(app_permissions_hex)
    );

    -- 8. 업데이트된 claims를 event에 설정
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
  EXCEPTION
    WHEN OTHERS THEN
      -- 에러 발생 시 원본 event를 그대로 반환하여 인증이 실패하지 않도록 함
      -- (Hook 에러로 인해 OAuth 로그인이 실패하는 것을 방지)
      RETURN event;
  END;
END;
$$;

-- 함수 설명 추가
COMMENT ON FUNCTION public.custom_access_token_hook IS 
'JWT 생성 시 memberships 정보(구독 상태 + 권한)와 profiles.permissions(앱 매니저 권한 포함)를 app_metadata에 주입하는 Hook 함수. Supabase Dashboard > Authentication > Hooks에서 등록 필요.';

