import { requireAuth } from '@/lib/auth/session';
import { getUserMemberships } from '@/lib/user/memberships';
import { EntitySwitcher } from '@/features/user/components/entity-switcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

/**
 * 개인 대시보드 페이지
 * 
 * 모든 엔티티의 출퇴근 현황 및 통계를 통합하여 보여주는 페이지
 * 
 * @see docs/ui-pages-design/251118_ui_pages_structure.md - 2.1 개인 대시보드
 * @see docs/customer-journey/251118_user_journey_hypothesis.md - 시나리오 21, 22
 */
export default async function DashboardPage() {
  const user = await requireAuth();
  const memberships = await getUserMemberships(user.id);

  const organizations = memberships.filter(m => m.entity_type === 1);
  const centers = memberships.filter(m => m.entity_type === 2);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          안녕하세요, {user.full_name || user.email.split('@')[0]}님
        </h1>
        <p className="text-muted-foreground mt-2">
          오늘의 출퇴근 현황을 확인하세요
        </p>
      </div>

      {/* Entity Switcher */}
      <Card>
        <CardHeader>
          <CardTitle>엔티티 선택</CardTitle>
          <CardDescription>
            출퇴근할 조직 또는 센터를 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EntitySwitcher
            organizations={organizations}
            centers={centers}
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 출근</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              모든 엔티티 통합
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 주 근무 시간</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              모든 엔티티 합계
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">소속 조직</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length}</div>
            <p className="text-xs text-muted-foreground">
              조직 수
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">소속 센터</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centers.length}</div>
            <p className="text-xs text-muted-foreground">
              센터 수
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {memberships.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {organizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>조직으로 가기</CardTitle>
                <CardDescription>
                  조직 컨텍스트에서 출퇴근 및 위치보고를 수행하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {organizations.slice(0, 3).map((org) => (
                    <Link
                      key={org.entity_id}
                      href={`/(user)/org/${org.entity_id}`}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <Building2 className="h-4 w-4 mr-2" />
                        {org.entity_name}
                        {org.is_owner && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (소유자)
                          </span>
                        )}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {centers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>센터로 가기</CardTitle>
                <CardDescription>
                  센터 컨텍스트에서 출퇴근 및 위치보고를 수행하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {centers.slice(0, 3).map((center) => (
                    <Link
                      key={center.entity_id}
                      href={`/(user)/center/${center.entity_id}`}
                    >
                      <Button variant="outline" className="w-full justify-start">
                        <MapPin className="h-4 w-4 mr-2" />
                        {center.entity_name}
                        {center.is_owner && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (소유자)
                          </span>
                        )}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {memberships.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>아직 소속된 조직이나 센터가 없습니다</CardTitle>
            <CardDescription>
              조직 관리자에게 초대를 요청하거나, 새 조직을 생성하세요
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

