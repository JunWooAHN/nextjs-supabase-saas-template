-- Migration: Add test version of custom_access_token_hook with debugging
-- 테스트용 Hook 함수 생성 (디버깅 로그 포함)
-- 프로덕션에서는 custom_access_token_hook (로그 없음) 사용

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
  current_auth_uid uuid;
BEGIN
  -- 디버깅: Hook 실행 시작 로그
  RAISE NOTICE '=== [Hook Debug] custom_access_token_hook_test 실행 시작 ===';
  RAISE NOTICE '[Hook Debug] Event 전체: %', event::text;
  
  -- 에러 발생 시 원본 event를 그대로 반환 (인증 실패 방지)
  BEGIN
    -- 0. auth.uid() 확인 (RLS 정책 체크용)
    SELECT auth.uid() INTO current_auth_uid;
    RAISE NOTICE '[Hook Debug] 현재 auth.uid(): %', current_auth_uid;
    
    -- 1. 사용자 ID 추출
    RAISE NOTICE '[Hook Debug] 1단계: 사용자 ID 추출 시작';
    user_id := (event->>'user_id')::uuid;
    RAISE NOTICE '[Hook Debug] 추출된 User ID: %', user_id;
    
    -- user_id가 없으면 빈 memberships 반환
    IF user_id IS NULL THEN
      RAISE NOTICE '[Hook Debug] User ID가 NULL입니다. 빈 memberships 반환';
      claims := COALESCE(event->'claims', '{}'::jsonb);
      IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
        claims := jsonb_set(claims, '{app_metadata}', '{}');
      END IF;
      claims := jsonb_set(claims, '{app_metadata,memberships}', '{}'::jsonb);
      claims := jsonb_set(claims, '{app_metadata,app_permissions}', '"0"'::jsonb);
      event := jsonb_set(event, '{claims}', claims);
      RAISE NOTICE '[Hook Debug] User ID NULL 처리 완료, Event 반환';
      RETURN event;
    END IF;

    -- 2. 전체 멤버십 조회
    -- 중요: SECURITY DEFINER로 실행되지만 RLS는 여전히 적용됨
    -- auth.uid()가 user_id와 일치해야 RLS 정책을 통과할 수 있음
    RAISE NOTICE '[Hook Debug] 2단계: 멤버십 조회 시작 (user_id: %, auth.uid(): %)', user_id, current_auth_uid;
    
    -- jsonb_object_agg NULL 처리 개선: COALESCE를 SELECT 내부로 이동
    SELECT COALESCE(
      jsonb_object_agg(
        m.entity_id::text,
        json_build_array(
          COALESCE(es.status, 1),       -- Index 0: Status (기본값: ACTIVE)
          to_hex(m.permissions)         -- Index 1: Permissions (Hex String)
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
    
    RAISE NOTICE '[Hook Debug] 멤버십 조회 결과: %', membership_map::text;
    membership_map := COALESCE(membership_map, '{}'::jsonb);
    RAISE NOTICE '[Hook Debug] 멤버십 맵 최종값: %', membership_map::text;
    
    -- 멤버십이 비어있는 경우 추가 디버깅
    IF membership_map = '{}'::jsonb THEN
      RAISE NOTICE '[Hook Debug] ⚠️ 멤버십이 비어있습니다. RLS 정책 확인 필요.';
      RAISE NOTICE '[Hook Debug] 직접 조회 테스트: SELECT COUNT(*) FROM memberships WHERE user_id = %', user_id;
    END IF;

    -- 3. profiles 테이블에서 앱 매니저 권한 조회
    RAISE NOTICE '[Hook Debug] 3단계: profiles.permissions 조회 시작 (user_id: %)', user_id;
    SELECT to_hex(COALESCE(p.permissions, 0))
    INTO app_permissions_hex
    FROM public.profiles p
    WHERE p.id = user_id;
    
    RAISE NOTICE '[Hook Debug] profiles.permissions 조회 결과: %', app_permissions_hex;
    app_permissions_hex := COALESCE(app_permissions_hex, '0');
    RAISE NOTICE '[Hook Debug] app_permissions_hex 최종값: %', app_permissions_hex;

    -- 4. JWT Claims 가져오기
    RAISE NOTICE '[Hook Debug] 4단계: JWT Claims 가져오기';
    claims := COALESCE(event->'claims', '{}'::jsonb);
    RAISE NOTICE '[Hook Debug] 기존 Claims: %', claims::text;
    
    -- 5. app_metadata 초기화 (없으면 생성)
    RAISE NOTICE '[Hook Debug] 5단계: app_metadata 초기화';
    IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
      RAISE NOTICE '[Hook Debug] app_metadata가 NULL이므로 생성';
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    ELSE
      RAISE NOTICE '[Hook Debug] app_metadata가 이미 존재함';
    END IF;

    -- 6. 'memberships' 필드에 주입
    RAISE NOTICE '[Hook Debug] 6단계: memberships 필드 주입';
    claims := jsonb_set(
      claims, 
      '{app_metadata,memberships}', 
      membership_map
    );
    RAISE NOTICE '[Hook Debug] memberships 주입 후 Claims: %', claims::text;

    -- 7. 'app_permissions' 필드에 주입 (앱 매니저 권한 포함)
    RAISE NOTICE '[Hook Debug] 7단계: app_permissions 필드 주입';
    claims := jsonb_set(
      claims, 
      '{app_metadata,app_permissions}', 
      to_jsonb(app_permissions_hex)
    );
    RAISE NOTICE '[Hook Debug] app_permissions 주입 후 Claims: %', claims::text;

    -- 8. 업데이트된 claims를 event에 설정
    RAISE NOTICE '[Hook Debug] 8단계: Event에 Claims 설정';
    event := jsonb_set(event, '{claims}', claims);
    
    RAISE NOTICE '[Hook Debug] 최종 Event: %', event::text;
    RAISE NOTICE '=== [Hook Debug] custom_access_token_hook_test 실행 완료 (성공) ===';
    
    RETURN event;
  EXCEPTION
    WHEN OTHERS THEN
      -- 에러 상세 정보 추출
      GET STACKED DIAGNOSTICS 
        error_message = MESSAGE_TEXT,
        error_detail = PG_EXCEPTION_DETAIL,
        error_hint = PG_EXCEPTION_HINT;
      
      -- 에러 상세 정보 로깅
      RAISE NOTICE '=== [Hook Debug] Hook 에러 발생 ===';
      RAISE NOTICE '[Hook Debug] 에러 메시지: %', error_message;
      RAISE NOTICE '[Hook Debug] 에러 상세: %', error_detail;
      RAISE NOTICE '[Hook Debug] 에러 힌트: %', error_hint;
      RAISE NOTICE '[Hook Debug] SQLSTATE: %', SQLSTATE;
      RAISE NOTICE '[Hook Debug] SQLERRM: %', SQLERRM;
      RAISE NOTICE '[Hook Debug] 원본 Event 반환 (인증 실패 방지)';
      RAISE NOTICE '[Hook Debug] 원본 Event: %', event::text;
      
      -- 에러 발생 시 원본 event를 그대로 반환하여 인증이 실패하지 않도록 함
      -- (Hook 에러로 인해 OAuth 로그인이 실패하는 것을 방지)
      RETURN event;
  END;
END;
$$;

-- 함수 설명 추가
COMMENT ON FUNCTION public.custom_access_token_hook_test IS 
'테스트용 Hook 함수 (디버깅 로그 포함). JWT 생성 시 memberships 정보(구독 상태 + 권한)와 profiles.permissions(앱 매니저 권한 포함)를 app_metadata에 주입합니다. 프로덕션에서는 custom_access_token_hook 사용.';

