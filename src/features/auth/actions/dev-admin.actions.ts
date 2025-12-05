/**
 * 개발 환경 전용 Admin Server Actions
 * 
 * ⚠️ 개발 환경에서만 사용 가능합니다
 * ⚠️ 프로덕션에서는 접근 불가능하도록 보호됩니다
 * 
 * 목적: 개발 초기 단계에서 첫 번째 앱 매니저를 생성하기 위한 임시 기능
 * 
 * 보안 주의사항:
 * - 개발 환경이 아니면 모든 함수가 에러 발생
 * - appManager 권한 검증 없이 동작 (개발 환경에서만)
 * - Admin Client (SERVICE_ROLE_KEY)를 사용하여 RLS를 우회합니다
 */

'use server';

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { PERMISSIONS } from '@/lib/permissions';
import { PermissionsBitField } from '@/lib/permissions';
import { isDevAdminEnabled, devOnly } from '@/lib/utils/dev-mode';

/**
 * 개발 환경 체크 및 에러 발생
 */
function ensureDevMode() {
  if (!isDevAdminEnabled()) {
    throw new Error('이 기능은 개발 환경에서만 사용할 수 있습니다.');
  }
}

/**
 * 개발 환경에서 이메일로 사용자 프로필 조회
 * appManager 권한 검증 없이 동작
 * 
 * @param email - 조회할 사용자 이메일
 * @returns 사용자 프로필 정보
 */
export async function getUserByEmailDev(email: string) {
  return devOnly(async () => {
    ensureDevMode();

    const adminClient = createAdminSupabaseClient();

    // 이메일로 사용자 검색
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('id, email, full_name, permissions, created_at')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('사용자를 찾을 수 없습니다.');
      }
      throw new Error(`사용자 조회 실패: ${error.message}`);
    }

    const permissions = new PermissionsBitField(BigInt(profile.permissions || 0));
    const isAppManager = permissions.has(PERMISSIONS.IS_APP_MANAGER, false);

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      permissions: profile.permissions,
      is_app_manager: isAppManager,
      created_at: profile.created_at,
    };
  }, '이 기능은 개발 환경에서만 사용할 수 있습니다.');
}

/**
 * 개발 환경에서 사용자에게 appManager 권한 부여
 * appManager 권한 검증 없이 동작
 * 
 * @param email - 권한을 부여할 사용자 이메일
 * @returns 성공 메시지
 */
export async function grantAppManagerPermissionDev(email: string) {
  return devOnly(async () => {
    ensureDevMode();

    // 현재 사용자 인증만 체크 (appManager 권한은 체크하지 않음)
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('인증이 필요합니다. 로그인해주세요.');
    }

    const adminClient = createAdminSupabaseClient();

    // 사용자 프로필 조회
    const { data: profile, error: fetchError } = await adminClient
      .from('profiles')
      .select('id, permissions')
      .eq('email', email)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('사용자를 찾을 수 없습니다.');
      }
      throw new Error(`사용자 조회 실패: ${fetchError.message}`);
    }

    // 현재 권한 확인
    const currentPermissions = new PermissionsBitField(BigInt(profile.permissions || 0));
    if (currentPermissions.has(PERMISSIONS.IS_APP_MANAGER, false)) {
      throw new Error('이미 앱 매니저 권한이 있습니다.');
    }

    // 권한 추가
    const newPermissions = currentPermissions.add(PERMISSIONS.IS_APP_MANAGER);

    // 권한 업데이트
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ permissions: newPermissions.valueOf().toString() })
      .eq('id', profile.id);

    if (updateError) {
      throw new Error(`권한 부여 실패: ${updateError.message}`);
    }

    // 개발 환경에서 권한 부여 로그
    console.log(`[DEV ADMIN] 앱 매니저 권한 부여: ${email} (${profile.id}) by ${user.email}`);

    return { success: true, message: '앱 매니저 권한이 부여되었습니다.' };
  }, '이 기능은 개발 환경에서만 사용할 수 있습니다.');
}

/**
 * 개발 환경에서 사용자의 appManager 권한 제거
 * appManager 권한 검증 없이 동작
 * 
 * @param email - 권한을 제거할 사용자 이메일
 * @returns 성공 메시지
 */
export async function revokeAppManagerPermissionDev(email: string) {
  return devOnly(async () => {
    ensureDevMode();

    // 현재 사용자 인증만 체크 (appManager 권한은 체크하지 않음)
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('인증이 필요합니다. 로그인해주세요.');
    }

    const adminClient = createAdminSupabaseClient();

    // 사용자 프로필 조회
    const { data: profile, error: fetchError } = await adminClient
      .from('profiles')
      .select('id, permissions')
      .eq('email', email)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('사용자를 찾을 수 없습니다.');
      }
      throw new Error(`사용자 조회 실패: ${fetchError.message}`);
    }

    // 현재 권한 확인
    const currentPermissions = new PermissionsBitField(BigInt(profile.permissions || 0));
    if (!currentPermissions.has(PERMISSIONS.IS_APP_MANAGER, false)) {
      throw new Error('앱 매니저 권한이 없습니다.');
    }

    // 권한 제거
    const newPermissions = currentPermissions.remove(PERMISSIONS.IS_APP_MANAGER);

    // 권한 업데이트
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ permissions: newPermissions.valueOf().toString() })
      .eq('id', profile.id);

    if (updateError) {
      throw new Error(`권한 제거 실패: ${updateError.message}`);
    }

    // 개발 환경에서 권한 제거 로그
    console.log(`[DEV ADMIN] 앱 매니저 권한 제거: ${email} (${profile.id}) by ${user.email}`);

    return { success: true, message: '앱 매니저 권한이 제거되었습니다.' };
  }, '이 기능은 개발 환경에서만 사용할 수 있습니다.');
}

/**
 * 개발 환경에서 현재 사용자 인증 상태 확인
 * appManager 권한은 체크하지 않음
 * 
 * @returns 현재 사용자가 인증되어 있으면 true, 아니면 false
 */
export async function verifyCurrentUserAuthenticatedDev(): Promise<boolean> {
  return devOnly(async () => {
    ensureDevMode();

    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      return !error && !!user;
    } catch {
      return false;
    }
  }, '이 기능은 개발 환경에서만 사용할 수 있습니다.');
}

/**
 * 개발 환경 활성화 여부 확인
 * 클라이언트에서 호출 가능 (서버 사이드에서만 실제 체크)
 * 
 * @returns 개발 환경이 활성화되어 있으면 true, 아니면 false
 */
export async function checkDevAdminEnabled(): Promise<boolean> {
  // 서버 사이드에서만 체크
  if (typeof process === 'undefined') {
    return false;
  }
  
  return isDevAdminEnabled();
}

