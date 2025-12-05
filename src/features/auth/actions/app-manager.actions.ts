/**
 * App Manager Server Actions
 * Tier 3 (앱 매니저) 작업 - RLS 우회를 통한 플랫폼 전체 관리
 * 
 * ⚠️ 보안 주의사항:
 * - 모든 함수는 현재 사용자가 appManager인지 먼저 검증합니다
 * - Admin Client (SERVICE_ROLE_KEY)를 사용하여 RLS를 우회합니다
 * - 프로덕션 배포 전에 보안 검토가 필요합니다
 */

'use server';

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { PERMISSIONS } from '@/lib/permissions';
import { PermissionsBitField } from '@/lib/permissions';

/**
 * 현재 사용자가 appManager인지 검증
 * @param userId - 검증할 사용자 ID
 * @returns appManager 권한이 있으면 true, 없으면 false
 */
async function verifyAppManager(userId: string): Promise<boolean> {
  const adminClient = createAdminSupabaseClient();
  
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('permissions')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return false;
  }

  const permissions = new PermissionsBitField(BigInt(profile.permissions || 0));
  return permissions.has(PERMISSIONS.IS_APP_MANAGER, false);
}

/**
 * 현재 사용자의 appManager 권한 검증 및 사용자 정보 반환
 * @returns 현재 사용자 정보 또는 null
 */
async function getCurrentUserForVerification() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('인증이 필요합니다. 로그인해주세요.');
  }

  const isAppManager = await verifyAppManager(user.id);
  if (!isAppManager) {
    throw new Error('앱 매니저 권한이 필요합니다.');
  }

  return user;
}

/**
 * 이메일로 사용자 프로필 조회
 * @param email - 조회할 사용자 이메일
 * @returns 사용자 프로필 정보
 */
export async function getUserByEmail(email: string) {
  // 현재 사용자가 appManager인지 검증
  await getCurrentUserForVerification();

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
}

/**
 * 사용자에게 appManager 권한 부여
 * @param email - 권한을 부여할 사용자 이메일
 * @returns 성공 메시지
 */
export async function grantAppManagerPermission(email: string) {
  // 현재 사용자가 appManager인지 검증
  await getCurrentUserForVerification();

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

  return { success: true, message: '앱 매니저 권한이 부여되었습니다.' };
}

/**
 * 사용자의 appManager 권한 제거
 * @param email - 권한을 제거할 사용자 이메일
 * @returns 성공 메시지
 */
export async function revokeAppManagerPermission(email: string) {
  // 현재 사용자가 appManager인지 검증
  await getCurrentUserForVerification();

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

  return { success: true, message: '앱 매니저 권한이 제거되었습니다.' };
}

/**
 * 현재 사용자가 appManager인지 검증 (외부에서 사용 가능)
 * @returns 현재 사용자가 appManager이면 true, 아니면 false
 */
export async function verifyCurrentUserIsAppManager(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }

    return await verifyAppManager(user.id);
  } catch {
    return false;
  }
}

