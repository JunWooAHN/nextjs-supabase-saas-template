import { getCenterContext } from '@/lib/jwt-context/center-context';
import { getUserMemberships } from '@/lib/user/memberships';
import { ENTITY_TYPES } from '@/lib/constants';
import { EntityContextBanner } from '@/features/user/components/entity-context-banner';
import { EntitySwitcher } from '@/features/user/components/entity-switcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CenterPageProps {
  params: Promise<{ centerId: string }>;
}

/**
 * 센터 컨텍스트 통합 페이지
 * 
 * 특정 센터 컨텍스트에서 출근/퇴근/위치보고를 수행하는 통합 인터페이스
 * 
 * v6.0 Context-Driven Architecture 적용:
 * - Context 객체를 통해 권한과 구독 상태 관리
 * - JWT에서 멤버십 정보 파싱 (권한/구독 체크는 DB 조회 없음)
 * - EntitySwitcher를 위한 엔티티 이름은 별도 조회 (UserMembership)
 * 
 * @see docs/ui-pages-design/251118_ui_pages_structure.md - 2.5 센터 컨텍스트 통합 페이지
 * @see docs/customer-journey/251118_user_journey_hypothesis.md - 시나리오 4, 8, 20, 31, 34, 36
 */
export default async function CenterPage({ params }: CenterPageProps) {
  const { centerId } = await params;
  
  // Context 객체 생성 (캐시 Hit - Layout에서 이미 생성됨)
  const ctx = await getCenterContext(centerId);

  // EntitySwitcher를 위한 멤버십 목록 (엔티티 이름 포함)
  // TODO: 나중에 JWT에 엔티티 이름도 포함하도록 개선 가능
  const memberships = await getUserMemberships(ctx.user.id);
  const organizations = memberships.filter(m => m.entity_type === ENTITY_TYPES.ORGANIZATION);
  const centers = memberships.filter(m => m.entity_type === ENTITY_TYPES.CENTER);

  // 현재 센터 정보 (EntitySwitcher에서 사용)
  const currentCenter = centers.find(center => center.entity_id === centerId);

  return (
    <div className="space-y-6">
      {/* Entity Context Banner */}
      <EntityContextBanner
        entityName={currentCenter?.entity_name || centerId}
        entityType={ENTITY_TYPES.CENTER}
        isOwner={ctx.isOwner}
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

