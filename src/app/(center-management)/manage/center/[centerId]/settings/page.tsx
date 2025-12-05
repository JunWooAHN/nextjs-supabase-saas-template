import { getCenterContext } from '@/lib/jwt-context/center-context';

interface CenterSettingsPageProps {
  params: Promise<{ centerId: string }>;
}

/**
 * 센터 설정 페이지
 * 
 * v6.0 Context-Driven Architecture 적용:
 * - OWNER 권한이 필요함
 * - Context 객체의 requireOwner() 메서드로 접근 제어
 */
export default async function CenterSettingsPage({ params }: CenterSettingsPageProps) {
  const { centerId } = await params;
  
  // Context 객체 생성 (캐시 Hit)
  const ctx = await getCenterContext(centerId);

  // OWNER 권한 체크 (권한이 없으면 자동 리디렉션)
  ctx.requireOwner();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">센터 설정</h1>
      <p className="text-muted-foreground mt-2">
        센터 ID: {ctx.centerId}
      </p>
      <p className="text-muted-foreground">
        역할: {ctx.roleName}
      </p>
    </div>
  );
}

