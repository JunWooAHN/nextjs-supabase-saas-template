/**
 * 멤버십 기능 DI 바인딩
 * 
 * ⚠️ 중요: 요청별 컨테이너 패턴
 * 이 함수는 요청마다 호출되어 새로운 컨테이너에 서비스를 등록합니다.
 */

import { Container } from 'inversify';
import { MEMBERSHIP_SERVICE } from '@/lib/di/symbols';
import { MembershipService } from '../services/membership.service';
import type { IMembershipService } from '../services/membership.service.interface';

/**
 * 멤버십 서비스를 컨테이너에 바인딩
 * @param container - 바인딩할 컨테이너 인스턴스
 */
export function bindMembershipServices(container: Container): void {
  container.bind<IMembershipService>(MEMBERSHIP_SERVICE).to(MembershipService);
}

