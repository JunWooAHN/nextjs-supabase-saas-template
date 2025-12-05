import { getOrgContext } from '@/lib/jwt-context/org-context';

interface OrgBillingPageProps {
  params: Promise<{ orgId: string }>;
}

/**
 * 조직 빌링 관리 페이지
 * 
 * v6.0 Context-Driven Architecture 적용:
 * - 구독 상태 체크는 제외 (billing 페이지는 항상 접근 가능)
 * - Context 객체를 통해 구독 상태 정보 제공
 */
export default async function OrgBillingPage({ params }: OrgBillingPageProps) {
  const { orgId } = await params;
  
  // Context 객체 생성 (캐시 Hit)
  const ctx = await getOrgContext(orgId);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">빌링 관리</h1>
      
      {/* 구독 상태 표시 */}
      <div className="mt-4">
        <p className="text-muted-foreground">
          구독 상태: {ctx.isBillingActive ? '활성' : '비활성'}
        </p>
        {!ctx.isBillingActive && (
          <p className="mt-2 text-sm text-yellow-600">
            구독을 갱신하여 모든 기능을 사용하세요.
          </p>
        )}
      </div>

      {/* TODO: 플랜 선택, 결제 포털 버튼 등 추가 */}
    </div>
  );
}

