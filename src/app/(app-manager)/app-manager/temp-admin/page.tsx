/**
 * 개발 환경 전용 임시 어드민 페이지
 * 
 * ⚠️ 개발 환경에서만 사용 가능합니다
 * ⚠️ 프로덕션에서는 접근 불가능하도록 보호됩니다
 * 
 * 목적: 개발 초기 단계에서 첫 번째 앱 매니저를 생성하기 위한 임시 기능
 * 
 * 기능:
 * - 개발 환경 체크
 * - 현재 사용자 인증 확인 (appManager 권한 불필요)
 * - 이메일로 사용자 검색
 * - appManager 권한 부여/제거
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  checkDevAdminEnabled,
  verifyCurrentUserAuthenticatedDev,
  getUserByEmailDev,
  grantAppManagerPermissionDev,
  revokeAppManagerPermissionDev,
} from '@/features/auth/actions/dev-admin.actions';
import { Shield, Search, UserCheck, UserX, Loader2, AlertTriangle } from 'lucide-react';
import { PERMISSIONS } from '@/lib/permissions';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useUserSync } from '@/hooks/use-user-sync';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  permissions: string;
  is_app_manager: boolean;
  created_at: string;
}

export default function TempAdminPage() {
  const [isDevMode, setIsDevMode] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const { refreshContext, isRefreshing } = useUserSync();

  // 개발 환경 및 인증 상태 체크
  useEffect(() => {
    const checkDevModeAndAuth = async () => {
      try {
        // 개발 환경 체크
        const devEnabled = await checkDevAdminEnabled();
        setIsDevMode(devEnabled);

        if (!devEnabled) {
          setIsChecking(false);
          return;
        }

        // 개발 환경이면 인증만 체크 (appManager 권한 불필요)
        const authenticated = await verifyCurrentUserAuthenticatedDev();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('체크 실패:', error);
        setIsDevMode(false);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkDevModeAndAuth();
  }, []);

  // 사용자 검색
  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    setIsSearching(true);
    try {
      const user = await getUserByEmailDev(searchEmail.trim());
      setSearchedUser(user);
      toast.success('사용자를 찾았습니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '사용자 검색 실패';
      toast.error(message);
      setSearchedUser(null);
    } finally {
      setIsSearching(false);
    }
  };

  // 권한 부여
  const handleGrant = async () => {
    if (!searchEmail.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    setIsGranting(true);
    try {
      const result = await grantAppManagerPermissionDev(searchEmail.trim());
      toast.success(result.message);
      
      // 현재 로그인한 사용자에게 권한을 부여한 경우 세션 갱신
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.email === searchEmail.trim()) {
        // 현재 사용자에게 권한을 부여한 경우, 세션 강제 갱신
        // ⚠️ 중요: refreshSession()은 토큰이 만료되었을 때만 새 토큰을 발급합니다.
        // 토큰이 아직 유효하면 Hook이 실행되지 않으므로, 
        // 강제로 세션을 갱신하기 위해 로그아웃 후 다시 로그인해야 합니다.
        try {
          // 1. 현재 세션 확인
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // 2. refreshSession 시도 (토큰이 만료되었으면 새 토큰 발급)
            const { error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              // refreshSession이 실패하면 토큰이 아직 유효한 상태
              // 이 경우 Hook이 실행되지 않으므로, 사용자에게 로그아웃 후 재로그인 안내
              console.warn('토큰이 아직 유효하여 refreshSession이 실행되지 않았습니다:', refreshError);
              toast.warning(
                '권한은 부여되었습니다. JWT가 갱신되려면 로그아웃 후 다시 로그인해주세요. ' +
                '또는 잠시 후 자동으로 갱신됩니다.'
              );
              
              // Context는 갱신하지 않음 (토큰이 변경되지 않았으므로)
              return;
            }
            
            // 3. refreshSession 성공 시 Context 갱신
            await refreshContext();
            toast.success('권한이 적용되었습니다. 세션을 갱신했습니다.');
          }
        } catch (error) {
          console.error('세션 갱신 실패:', error);
          toast.warning('권한은 부여되었지만 세션 갱신에 실패했습니다. 로그아웃 후 다시 로그인해주세요.');
        }
      }
      
      // 검색된 사용자 정보 새로고침 (세션 갱신 후)
      if (searchedUser) {
        const updatedUser = await getUserByEmailDev(searchEmail.trim());
        setSearchedUser(updatedUser);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '권한 부여 실패';
      toast.error(message);
    } finally {
      setIsGranting(false);
    }
  };

  // 권한 제거
  const handleRevoke = async () => {
    if (!searchEmail.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    setIsRevoking(true);
    try {
      const result = await revokeAppManagerPermissionDev(searchEmail.trim());
      toast.success(result.message);
      
      // 현재 로그인한 사용자의 권한을 제거한 경우 세션 갱신
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.email === searchEmail.trim()) {
        // 현재 사용자의 권한을 제거한 경우, 세션 강제 갱신
        // ⚠️ 중요: refreshSession()은 토큰이 만료되었을 때만 새 토큰을 발급합니다.
        // 토큰이 아직 유효하면 Hook이 실행되지 않으므로, 
        // 강제로 세션을 갱신하기 위해 로그아웃 후 다시 로그인해야 합니다.
        try {
          // 1. 현재 세션 확인
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // 2. refreshSession 시도 (토큰이 만료되었으면 새 토큰 발급)
            const { error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              // refreshSession이 실패하면 토큰이 아직 유효한 상태
              // 이 경우 Hook이 실행되지 않으므로, 사용자에게 로그아웃 후 재로그인 안내
              console.warn('토큰이 아직 유효하여 refreshSession이 실행되지 않았습니다:', refreshError);
              toast.warning(
                '권한은 제거되었습니다. JWT가 갱신되려면 로그아웃 후 다시 로그인해주세요. ' +
                '또는 잠시 후 자동으로 갱신됩니다.'
              );
              
              // Context는 갱신하지 않음 (토큰이 변경되지 않았으므로)
              return;
            }
            
            // 3. refreshSession 성공 시 Context 갱신
            await refreshContext();
            toast.success('권한이 제거되었습니다. 세션을 갱신했습니다.');
          }
        } catch (error) {
          console.error('세션 갱신 실패:', error);
          toast.warning('권한은 제거되었지만 세션 갱신에 실패했습니다. 로그아웃 후 다시 로그인해주세요.');
        }
      }
      
      // 검색된 사용자 정보 새로고침 (세션 갱신 후)
      if (searchedUser) {
        const updatedUser = await getUserByEmailDev(searchEmail.trim());
        setSearchedUser(updatedUser);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '권한 제거 실패';
      toast.error(message);
    } finally {
      setIsRevoking(false);
    }
  };

  // 로딩 중
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">확인 중...</p>
        </div>
      </div>
    );
  }

  // 개발 환경이 아닌 경우
  if (!isDevMode) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              개발 환경 전용
            </CardTitle>
            <CardDescription>
              이 페이지는 개발 환경에서만 사용할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              프로덕션 환경에서는 접근할 수 없습니다.
              개발 서버에서만 이 페이지를 사용할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              인증 필요
            </CardTitle>
            <CardDescription>
              로그인이 필요합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              개발 환경에서는 로그인만 하면 이 페이지를 사용할 수 있습니다.
              앱 매니저 권한은 필요하지 않습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-4xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          개발 환경 전용 어드민 페이지
        </h1>
        <Card className="mt-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-5 w-5" />
              개발 환경 전용
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              이 페이지는 개발 환경에서만 사용할 수 있습니다. 
              첫 번째 앱 매니저를 생성하기 위한 임시 기능입니다.
              프로덕션에서는 접근할 수 없습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* 현재 사용자 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>현재 사용자 상태</CardTitle>
          <CardDescription>현재 로그인한 사용자의 상태</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="font-medium">인증됨 (개발 환경)</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            개발 환경에서는 앱 매니저 권한 없이도 이 페이지를 사용할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {/* 사용자 검색 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            사용자 검색
          </CardTitle>
          <CardDescription>
            이메일로 사용자를 검색하고 앱 매니저 권한을 관리하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="사용자 이메일 입력"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSearching) {
                  handleSearch();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchEmail.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  검색 중...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </>
              )}
            </Button>
          </div>

          {/* 검색된 사용자 정보 */}
          {searchedUser && (
            <div className="border rounded-lg p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">사용자 정보</h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">이메일:</span>{' '}
                    <span className="font-medium">{searchedUser.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">이름:</span>{' '}
                    <span className="font-medium">
                      {searchedUser.full_name || '없음'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">사용자 ID:</span>{' '}
                    <span className="font-mono text-xs">{searchedUser.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">권한 비트:</span>{' '}
                    <span className="font-mono text-xs">
                      {searchedUser.permissions}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">앱 매니저:</span>{' '}
                    <span
                      className={`font-medium ${
                        searchedUser.is_app_manager
                          ? 'text-green-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {searchedUser.is_app_manager ? '예' : '아니오'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">가입일:</span>{' '}
                    <span className="font-medium">
                      {new Date(searchedUser.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 권한 관리 버튼 */}
              <div className="flex gap-2 pt-2 border-t">
                {searchedUser.is_app_manager ? (
                  <Button
                    variant="destructive"
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="flex-1"
                  >
                    {isRevoking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        제거 중...
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        앱 매니저 권한 제거
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleGrant}
                    disabled={isGranting}
                    className="flex-1"
                  >
                    {isGranting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        부여 중...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" />
                        앱 매니저 권한 부여
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 권한 테스트 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>권한 테스트 정보</CardTitle>
          <CardDescription>
            권한 시스템 테스트를 위한 정보
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">IS_APP_MANAGER 비트:</span>{' '}
            <span className="font-mono">1n &lt;&lt; 60n</span>
          </div>
          <div>
            <span className="text-muted-foreground">SQL 값:</span>{' '}
            <span className="font-mono">
              {Number(PERMISSIONS.IS_APP_MANAGER).toLocaleString()}
            </span>
          </div>
          <div className="pt-2 border-t">
            <p className="text-muted-foreground">
              <strong>⚠️ 중요:</strong> 권한 변경 후 JWT의 app_metadata가 즉시 업데이트되지 않을 수 있습니다.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>현재 로그인한 사용자에게 권한을 부여/제거한 경우:</strong>
            </p>
            <ul className="text-muted-foreground mt-1 ml-4 list-disc space-y-1">
              <li>토큰이 만료되었으면 자동으로 세션이 갱신됩니다.</li>
              <li>토큰이 아직 유효하면 로그아웃 후 다시 로그인해야 JWT가 갱신됩니다.</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              <strong>다른 사용자에게 권한을 부여한 경우:</strong> 해당 사용자가 로그아웃 후 다시 로그인해야 권한이 적용됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

