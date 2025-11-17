/**
 * 멤버십 서비스 구현체
 * Tier 2 (SaaS 관리자) 작업을 위한 서비스 계층
 */

import { injectable, inject } from 'inversify';
import {
  IMembershipService,
  InviteUserToEntityInput,
  UpdateUserPermissionsInput,
  RemoveUserFromEntityInput,
} from './membership.service.interface';
import { SUPABASE_CLIENT } from '@/lib/di/symbols';
import type { SupabaseClient } from '@supabase/supabase-js';

@injectable()
export class MembershipService implements IMembershipService {
  constructor(
    @inject(SUPABASE_CLIENT) private supabase: SupabaseClient
  ) {}

  async inviteUserToEntity(input: InviteUserToEntityInput): Promise<void> {
    // 1. 사용자 조회 (email로)
    const { data: user } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('email', input.email)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    // 2. 멤버십 생성
    const { error } = await this.supabase
      .from('memberships')
      .insert({
        user_id: user.id,
        entity_id: input.entityId,
        entity_type: input.entityType,
        permissions: input.permissions,
      });

    if (error) {
      throw error;
    }
  }

  async updateUserPermissions(input: UpdateUserPermissionsInput): Promise<void> {
    const { error } = await this.supabase
      .from('memberships')
      .update({ permissions: input.permissions })
      .eq('user_id', input.userId)
      .eq('entity_id', input.entityId);

    if (error) {
      throw error;
    }
  }

  async removeUserFromEntity(input: RemoveUserFromEntityInput): Promise<void> {
    const { error } = await this.supabase
      .from('memberships')
      .delete()
      .eq('user_id', input.userId)
      .eq('entity_id', input.entityId)
      .eq('entity_type', input.entityType);

    if (error) {
      throw error;
    }
  }

  async getMembersForEntity(entityId: string, entityType: number): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('memberships')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('entity_id', entityId)
      .eq('entity_type', entityType);

    if (error) {
      throw error;
    }

    return data || [];
  }
}

