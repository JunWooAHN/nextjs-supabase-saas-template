import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ENTITY_TYPES } from '@/lib/constants';

/**
 * 사용자 멤버십 정보 타입
 */
export interface UserMembership {
  entity_id: string;
  entity_type: typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];
  entity_name: string;
  permissions: bigint;
  is_owner: boolean;
}

/**
 * 사용자가 속한 모든 엔티티(조직/센터) 목록 조회
 * Tier 1: Server Component에서 사용
 * 
 * @param userId - 사용자 ID
 * @returns 사용자가 속한 조직 및 센터 목록
 */
export async function getUserMemberships(userId: string): Promise<UserMembership[]> {
  const supabase = await createServerSupabaseClient();

  // 멤버십 조회 (조직과 센터 모두)
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(`
      entity_id,
      entity_type,
      permissions
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user memberships:', error);
    return [];
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  // 엔티티 ID 수집
  const orgIds = memberships
    .filter(m => m.entity_type === ENTITY_TYPES.ORGANIZATION)
    .map(m => m.entity_id);
  const centerIds = memberships
    .filter(m => m.entity_type === ENTITY_TYPES.CENTER)
    .map(m => m.entity_id);

  // 조직 정보 조회
  const { data: organizations } = orgIds.length > 0
    ? await supabase
        .from('organizations')
        .select('id, name')
        .in('id', orgIds)
    : { data: [] };

  // 센터 정보 조회
  const { data: centers } = centerIds.length > 0
    ? await supabase
        .from('centers')
        .select('id, name')
        .in('id', centerIds)
    : { data: [] };

  // 조직/센터 맵 생성
  const orgMap = new Map((organizations || []).map(org => [org.id, org.name]));
  const centerMap = new Map((centers || []).map(center => [center.id, center.name]));

  // 결과 변환
  return memberships.map((m) => {
    const entityType = m.entity_type as typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];
    const permissions = BigInt(m.permissions || 0);
    
    // OWNER 권한 체크
    const isOwner = entityType === ENTITY_TYPES.ORGANIZATION
      ? (permissions & 32n) !== 0n // ORG_OWNER = 32
      : (permissions & 16384n) !== 0n; // CENTER_OWNER = 16384

    return {
      entity_id: m.entity_id,
      entity_type: entityType,
      entity_name: entityType === ENTITY_TYPES.ORGANIZATION
        ? orgMap.get(m.entity_id) || 'Unknown Organization'
        : centerMap.get(m.entity_id) || 'Unknown Center',
      permissions,
      is_owner: isOwner,
    };
  });
}

/**
 * 사용자가 속한 조직 목록만 조회
 */
export async function getUserOrganizations(userId: string): Promise<UserMembership[]> {
  const memberships = await getUserMemberships(userId);
  return memberships.filter(m => m.entity_type === ENTITY_TYPES.ORGANIZATION);
}

/**
 * 사용자가 속한 센터 목록만 조회
 */
export async function getUserCenters(userId: string): Promise<UserMembership[]> {
  const memberships = await getUserMemberships(userId);
  return memberships.filter(m => m.entity_type === ENTITY_TYPES.CENTER);
}

