/**
 * 인증 서비스 인터페이스
 * DI를 위한 인터페이스 정의
 */

import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export interface SignUpOptions {
  email: string;
  password: string;
  metadata?: Record<string, any>;
}

export interface SignInOptions {
  email: string;
  password: string;
}

export interface IAuthService {
  /**
   * 이메일/비밀번호로 로그인
   */
  signIn(options: SignInOptions): Promise<AuthResult>;

  /**
   * 이메일/비밀번호로 회원가입
   */
  signUp(options: SignUpOptions): Promise<AuthResult>;

  /**
   * 로그아웃
   */
  signOut(): Promise<void>;

  /**
   * 현재 사용자 조회
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * 세션 갱신
   */
  refreshSession(): Promise<Session | null>;
}

