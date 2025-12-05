import { getCenterContext } from '@/lib/jwt-context/center-context';

interface CenterOrganizationsPageProps {
  params: Promise<{ centerId: string }>;
}

/**
 * 센터 연결 조직 관리 페이지
 * 
 * v6.0 Context-Driven Architecture 적용:
 * - MANAGER 이상 권한이 필요함
 * - Context 객체의 requireManager() 메서드로 접근 제어
 */
export default async function CenterOrganizationsPage({ params }: CenterOrganizationsPageProps) {
  const { centerId } = await params;
  
  // Context 객체 생성 (캐시 Hit)
  const ctx = await getCenterContext(centerId);

  // MANAGER 이상 권한 체크 (권한이 없으면 자동 리디렉션)
  ctx.requireManager();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">연결된 조직 관리</h1>
      <p className="text-muted-foreground mt-2">
        센터 ID: {ctx.centerId}
      </p>
      <p className="text-muted-foreground">
        역할: {ctx.roleName}
      </p>
      {/* TODO: 연결된 조직 목록 테이블 추가 */}
    </div>
  );
}

