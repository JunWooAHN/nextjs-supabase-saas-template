import { getCenterContext } from '@/lib/jwt-context/center-context';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ centerId: string }>;
}

/**
 * 보호된 Layout (구독 상태 체크)
 * 
 * 구독이 비활성 상태인 경우 빌링 페이지로 리디렉션합니다.
 * 빌링 페이지는 이 Layout을 사용하지 않아야 합니다 (무한 루프 방지).
 * 
 * 사용 예시:
 * - dashboard, organizations, settings 등 핵심 기능 페이지
 * - billing 페이지는 제외
 */
export default async function ProtectedLayout({
  children,
  params,
}: ProtectedLayoutProps) {
  const { centerId } = await params;
  
  // Context 객체 재사용 (캐시 Hit)
  const ctx = await getCenterContext(centerId);

  // 구독 상태 강제 (비활성이면 /billing으로 리디렉션)
  ctx.requireBilling();

  return <>{children}</>;
}

