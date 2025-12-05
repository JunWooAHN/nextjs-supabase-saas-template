import { getCenterContext } from '@/lib/jwt-context/center-context';

interface CenterDashboardPageProps {
  params: Promise<{ centerId: string }>;
}

/**
 * 센터 관리 대시보드 페이지
 * 
 * v6.0 Context-Driven Architecture 적용:
 * - Context 객체를 통해 권한과 구독 상태 관리
 * - react.cache를 통한 성능 최적화 (JWT 파싱 1회만 실행)
 */
export default async function CenterDashboardPage({ params }: CenterDashboardPageProps) {
  const { centerId } = await params;
  
  // Context 객체 생성 (캐시 Hit - Layout에서 이미 생성됨)
  const ctx = await getCenterContext(centerId);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">
        {ctx.roleName} 대시보드
      </h1>
      
      {/* 구독 상태 배너 */}
      {!ctx.isBillingActive && (
        <div className="mt-4 rounded-lg border border-yellow-500 bg-yellow-50 p-4 text-yellow-800">
          구독이 만료되었습니다. 기능을 사용할 수 없습니다.
        </div>
      )}

      {/* 권한별 UI 렌더링 */}
      {ctx.isOwner && (
        <div className="mt-4">
          <p className="text-muted-foreground">Owner 전용 기능</p>
        </div>
      )}

      {/* 법정 대리인 전용 UI */}
      {ctx.isLawAgency && (
        <div className="mt-4">
          <p className="text-muted-foreground">법정 대리인 전용 기능</p>
        </div>
      )}
    </div>
  );
}

