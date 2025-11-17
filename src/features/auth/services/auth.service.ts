/**
 * 인증 서비스 구현체
 * DI를 통해 Supabase 클라이언트를 주입받아 사용
 */

import { injectable, inject } from 'inversify';
import { IAuthService, SignInOptions, SignUpOptions, AuthResult } from './auth.service.interface';
import { SUPABASE_CLIENT } from '@/lib/di/symbols';
import type { SupabaseClient } from '@supabase/supabase-js';

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(SUPABASE_CLIENT) private supabase: SupabaseClient
  ) {}

  async signIn(options: SignInOptions): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: options.email,
      password: options.password,
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  async signUp(options: SignUpOptions): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email: options.email,
      password: options.password,
      options: {
        data: options.metadata,
      },
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) {
      return null;
    }
    return user;
  }

  async refreshSession() {
    const { data: { session }, error } = await this.supabase.auth.refreshSession();
    if (error) {
      return null;
    }
    return session;
  }
}

