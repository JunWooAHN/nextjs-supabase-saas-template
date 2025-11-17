/**
 * DI 컨테이너 설정
 * InversifyJS를 사용한 의존성 주입 컨테이너
 * 
 * ⚠️ 중요: 요청별(Request-Scoped) 컨테이너 패턴
 * 
 * 싱글톤 컨테이너를 사용하면 모든 사용자가 같은 Supabase 클라이언트를 공유하게 되어
 * 보안 문제가 발생할 수 있습니다. 따라서 요청마다 새로운 컨테이너를 생성합니다.
 * 
 * 사용 시점: 서비스 계층이나 외부 의존성이 있는 복잡한 비즈니스 로직
 * 목적: 코드의 결합도를 낮추고, 테스트(Mocking) 용이성 극대화
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { SUPABASE_CLIENT } from './symbols';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bindAuthServices } from '@/features/auth/bindings/auth.bindings';
import { bindMembershipServices } from '@/features/membership/bindings/membership.bindings';

/**
 * 서비스 바인딩 함수
 * 컨테이너에 서비스들을 바인딩합니다.
 * 이 함수는 요청마다 호출되어 새로운 컨테이너에 서비스를 등록합니다.
 */
function bindServices(container: Container): void {
  // 서비스 바인딩 등록
  // 각 feature의 bindings 함수를 직접 호출하여 바인딩
  // 동기 import를 사용하여 성능 최적화 (순환 참조가 없는 경우)
  
  bindAuthServices(container);
  bindMembershipServices(container);
  
  // TODO: 다른 feature 바인딩 추가
}

/**
 * 요청별 DI 컨테이너 생성 팩토리 함수
 * 
 * ⚠️ 중요: 이 함수는 요청마다 호출되어야 합니다.
 * tRPC Context에서 호출하여 요청별로 독립적인 컨테이너를 생성합니다.
 * 
 * @param supabase - 요청별 Supabase 클라이언트 (쿠키 기반 세션 포함)
 * @returns 새로운 DI 컨테이너 인스턴스
 */
export function createContainer(supabase: SupabaseClient): Container {
  const container = new Container();

  // 요청별 Supabase 클라이언트 바인딩
  // 이 클라이언트는 해당 요청의 쿠키를 포함하므로 사용자별 세션이 보장됩니다.
  container.bind<SupabaseClient>(SUPABASE_CLIENT).toConstantValue(supabase);

  // 서비스 바인딩 등록
  bindServices(container);

  return container;
}

/**
 * 서비스 바인딩만 수행하는 헬퍼 함수
 * 테스트 환경에서 사용할 수 있습니다.
 */
export function bindServicesToContainer(container: Container): void {
  bindServices(container);
}

