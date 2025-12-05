import { getCenterContext } from '@/lib/jwt-context/center-context';
import { PERMISSIONS } from '@/lib/permissions';

interface CenterManagementLayoutProps {
  children: React.ReactNode;
  params: Promise<{ centerId: string }>;
}

/**
 * 센터 관리 라우트 그룹 최상위 Layout
 * 
 * v6.0 Context-Driven Architecture 적용:
 * - Context 객체를 통해 권한과 구독 상태 관리
 * - react.cache를 통한 성능 최적화 (JWT 파싱 1회만 실행)
 * 
 * 역할:
 * 1. Context 초기화 (getCenterContext)
 * 2. 기본 권한 체크 (CENTER_VIEW)
 * 3. 하위 컴포넌트에 Context 전달
 */
export default async function CenterManagementLayout({
  children,
  params,
}: CenterManagementLayoutProps) {
  const { centerId } = await params;
  
  // 1. Context 로드 (최초 실행, 이후 캐시 Hit)
  const ctx = await getCenterContext(centerId);

  // 2. 최소 권한 체크 (멤버인가?)
  ctx.require(PERMISSIONS.CENTER_VIEW);

  return (
    <div className="flex h-screen">
      {/* TODO: Sidebar 컴포넌트 추가 (Context 전달) */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

