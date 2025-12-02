import { requireAuth } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/user/memberships';
import { ENTITY_TYPES } from '@/lib/constants';
import { EntityContextBanner } from '@/features/user/components/entity-context-banner';
import { EntitySwitcher } from '@/features/user/components/entity-switcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { notFound } from 'next/navigation';

interface CenterPageProps {
  params: Promise<{ centerId: string }>;
}

/**
 * 센터 컨텍스트 통합 페이지
 * 
 * 특정 센터 컨텍스트에서 출근/퇴근/위치보고를 수행하는 통합 인터페이스
 * 
 * @see docs/ui-pages-design/251118_ui_pages_structure.md - 2.5 센터 컨텍스트 통합 페이지
 * @see docs/customer-journey/251118_user_journey_hypothesis.md - 시나리오 4, 8, 20, 31, 34, 36
 */
export default async function CenterPage({ params }: CenterPageProps) {
  const { centerId } = await params;
  const user = await requireAuth();
  const memberships = await getUserMemberships(user.id);

  // 해당 센터의 멤버십 확인
  const centerMembership = memberships.find(
    m => m.entity_id === centerId && m.entity_type === ENTITY_TYPES.CENTER
  );

  if (!centerMembership) {
    notFound();
  }

  const organizations = memberships.filter(m => m.entity_type === ENTITY_TYPES.ORGANIZATION);
  const centers = memberships.filter(m => m.entity_type === ENTITY_TYPES.CENTER);

  return (
    <div className="space-y-6">
      {/* Entity Context Banner */}
      <EntityContextBanner
        entityName={centerMembership.entity_name}
        entityType={ENTITY_TYPES.CENTER}
        isOwner={centerMembership.is_owner}
      />

      {/* Entity Switcher (모바일용) */}
      <div className="md:hidden">
        <EntitySwitcher
          organizations={organizations}
          centers={centers}
          currentEntityId={centerId}
          currentEntityType={ENTITY_TYPES.CENTER}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 출근/퇴근 버튼 영역 */}
        <Card>
          <CardHeader>
            <CardTitle>출퇴근</CardTitle>
            <CardDescription>
              현재 위치를 확인하고 출퇴근을 기록하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground">
              출퇴근 버튼 컴포넌트 구현 예정
            </div>
            {/* TODO: AttendanceClockButton 컴포넌트 추가 */}
          </CardContent>
        </Card>

        {/* 위치보고 버튼 영역 */}
        <Card>
          <CardHeader>
            <CardTitle>위치보고</CardTitle>
            <CardDescription>
              현재 위치를 보고하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground">
              위치보고 버튼 컴포넌트 구현 예정
            </div>
            {/* TODO: LocationReportButton 컴포넌트 추가 */}
          </CardContent>
        </Card>
      </div>

      {/* 현재 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>현재 상태</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            현재 상태 컴포넌트 구현 예정
          </div>
          {/* TODO: CurrentStatus 컴포넌트 추가 */}
        </CardContent>
      </Card>

      {/* 최근 기록 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 기록</CardTitle>
          <CardDescription>
            오늘의 출퇴근 및 위치보고 기록
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            최근 기록 컴포넌트 구현 예정
          </div>
          {/* TODO: RecentRecords 컴포넌트 추가 */}
        </CardContent>
      </Card>
    </div>
  );
}

