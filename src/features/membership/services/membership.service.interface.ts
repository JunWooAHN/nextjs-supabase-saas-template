/**
 * 멤버십 서비스 인터페이스
 * DI를 위한 인터페이스 정의
 */

export interface InviteUserToEntityInput {
  email: string;
  entityId: string;
  entityType: number; // 1: ORGANIZATION, 2: CENTER
  permissions: bigint;
}

export interface UpdateUserPermissionsInput {
  userId: string;
  entityId: string;
  permissions: bigint;
}

export interface RemoveUserFromEntityInput {
  userId: string;
  entityId: string;
  entityType: number;
}

export interface IMembershipService {
  /**
   * 엔티티에 사용자 초대
   */
  inviteUserToEntity(input: InviteUserToEntityInput): Promise<void>;

  /**
   * 사용자 권한 업데이트
   */
  updateUserPermissions(input: UpdateUserPermissionsInput): Promise<void>;

  /**
   * 엔티티에서 사용자 제거
   */
  removeUserFromEntity(input: RemoveUserFromEntityInput): Promise<void>;

  /**
   * 엔티티의 멤버 목록 조회
   */
  getMembersForEntity(entityId: string, entityType: number): Promise<any[]>;
}

