-- Migration: Improved Hook function with proper permissions and schema awareness
-- Date: 2025-12-03
-- 
-- 이 마이그레이션은 실제 데이터베이스 스키마를 고려하여 Hook 함수를 작성합니다.
-- 
-- 스키마 정보:
-- - memberships: user_id, entity_id, entity_type, permissions, created_at, updated_at
--   (status 컬럼 없음 - 소프트 삭제 미구현)
-- - profiles: id, email, full_name, avatar_url, permissions, created_at, updated_at
-- - entity_subscriptions: (선택적, 아직 생성되지 않았을 수 있음)
--   entity_id, entity_type, plan_id, status (SMALLINT: 1=Active, 2=PastDue, 3=Suspended, 4=Canceled)
--
-- RLS 정책:
-- - memberships: user_id = auth.uid() 기반 정책
-- - profiles: id = auth.uid() 기반 정책
-- - SECURITY DEFINER + 함수 소유자(postgres)로 RLS 우회

CREATE OR REPLACE FUNCTION public.custom_access_token_hook_test(event jsonb)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  membership_map jsonb;
  app_permissions_hex text;
  error_message text;
  error_detail text;
  error_hint text;
BEGIN
  RAISE NOTICE '=== [Hook Start] User ID: % ===', event->>'user_id';
  
  -- 에러 발생 시 원본 event를 그대로 반환 (인증 실패 방지)
  BEGIN
    -- 1. 사용자 ID 추출
    user_id := (event->>'user_id')::uuid;
    
    IF user_id IS NULL THEN
      RAISE NOTICE '[Hook Debug] User ID is NULL, returning original event';
      -- 빈 memberships와 app_permissions 설정
      claims := COALESCE(event->'claims', '{}'::jsonb);
      IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
        claims := jsonb_set(claims, '{app_metadata}', '{}');
      END IF;
      claims := jsonb_set(claims, '{app_metadata,memberships}', '{}'::jsonb);
      claims := jsonb_set(claims, '{app_metadata,app_permissions}', '"0"'::jsonb);
      event := jsonb_set(event, '{claims}', claims);
      RETURN event;
    END IF;

    -- 2. 멤버십 조회
    -- SECURITY DEFINER + 함수 소유자(postgres)로 RLS 우회
    -- memberships 테이블에는 status 컬럼이 없으므로 WHERE 절에서 제외
    -- entity_subscriptions는 선택적이므로 LEFT JOIN 사용
    SELECT COALESCE(
      jsonb_object_agg(
        m.entity_id::text,
        json_build_array(
          COALESCE(es.status, 1),  -- Index 0: 구독 상태 (기본값: 1=Active)
          to_hex(m.permissions)    -- Index 1: 권한 (Hex String)
        )
      ),
      '{}'::jsonb  -- NULL이면 빈 객체 반환
    )
    INTO membership_map
    FROM public.memberships m
    LEFT JOIN public.entity_subscriptions es
      ON m.entity_id = es.entity_id 
      AND m.entity_type = es.entity_type
    WHERE m.user_id = user_id;
    
    RAISE NOTICE '[Hook Debug] Memberships found: %', 
      CASE 
        WHEN membership_map IS NULL THEN 'NULL'
        WHEN membership_map = '{}'::jsonb THEN 'EMPTY'
        ELSE (SELECT COUNT(*) FROM jsonb_object_keys(membership_map))::text || ' items'
      END;
    
    -- NULL 처리
    membership_map := COALESCE(membership_map, '{}'::jsonb);

    -- 3. 프로필 권한 조회 (앱 매니저 권한 포함)
    SELECT to_hex(COALESCE(p.permissions, 0))
    INTO app_permissions_hex
    FROM public.profiles p
    WHERE p.id = user_id;
    
    app_permissions_hex := COALESCE(app_permissions_hex, '0');
    RAISE NOTICE '[Hook Debug] App Permissions: %', app_permissions_hex;

    -- 4. Claims 구성
    claims := COALESCE(event->'claims', '{}'::jsonb);
    
    -- app_metadata 초기화 (없으면 생성)
    IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    -- memberships 주입
    claims := jsonb_set(
      claims, 
      '{app_metadata,memberships}', 
      membership_map
    );
    
    -- app_permissions 주입
    claims := jsonb_set(
      claims, 
      '{app_metadata,app_permissions}', 
      to_jsonb(app_permissions_hex)
    );

    -- 5. Event 업데이트
    event := jsonb_set(event, '{claims}', claims);
    
    RAISE NOTICE '=== [Hook Success] Claims Updated ===';
    RAISE NOTICE '[Hook Debug] Final memberships count: %', 
      CASE 
        WHEN membership_map = '{}'::jsonb THEN '0'
        ELSE (SELECT COUNT(*) FROM jsonb_object_keys(membership_map))::text
      END;
    
    RETURN event;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- 에러 상세 정보 추출
      GET STACKED DIAGNOSTICS 
        error_message = MESSAGE_TEXT,
        error_detail = PG_EXCEPTION_DETAIL,
        error_hint = PG_EXCEPTION_HINT;
      
      -- 에러 로깅
      RAISE NOTICE '=== [Hook Error] ===';
      RAISE NOTICE '[Hook Debug] Error Message: %', error_message;
      RAISE NOTICE '[Hook Debug] Error Detail: %', error_detail;
      RAISE NOTICE '[Hook Debug] Error Hint: %', error_hint;
      RAISE NOTICE '[Hook Debug] SQLSTATE: %', SQLSTATE;
      RAISE NOTICE '[Hook Debug] SQLERRM: %', SQLERRM;
      
      -- 프로덕션에서는 원본 event 반환하여 인증 실패 방지
      -- 디버깅 중에는 아래 주석을 해제하여 에러를 다시 던질 수 있음
      -- RAISE;
      
      RETURN event;
  END;
END;
$$;

-- 함수 소유자를 postgres로 설정 (RLS 우회 보장)
ALTER FUNCTION public.custom_access_token_hook_test(jsonb) OWNER TO postgres;

-- 권한 부여 (필수!)
-- supabase_auth_admin이 Hook 함수를 실행할 수 있도록 권한 부여
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook_test(jsonb) TO supabase_auth_admin;

-- 함수 내부에서 접근하는 테이블들에 대한 조회 권한 부여
-- SECURITY DEFINER를 사용하더라도 명시적으로 권한을 부여하는 것이 안전함
GRANT SELECT ON TABLE public.memberships TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- entity_subscriptions는 선택적이므로 테이블이 존재하는 경우에만 권한 부여
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'entity_subscriptions'
  ) THEN
    EXECUTE 'GRANT SELECT ON TABLE public.entity_subscriptions TO supabase_auth_admin';
    RAISE NOTICE '[Hook Debug] Granted SELECT permission on entity_subscriptions';
  ELSE
    RAISE NOTICE '[Hook Debug] entity_subscriptions table does not exist, skipping GRANT';
  END IF;
END $$;

-- 함수 설명 추가
COMMENT ON FUNCTION public.custom_access_token_hook_test IS 
'테스트용 Hook 함수 (디버깅 로그 포함). JWT 생성 시 memberships 정보(구독 상태 + 권한)와 profiles.permissions(앱 매니저 권한 포함)를 app_metadata에 주입합니다. SECURITY DEFINER + postgres 소유자로 RLS 우회. 프로덕션에서는 custom_access_token_hook 사용.';