import { requireAuth } from '@/lib/auth/session';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { MainContent } from '@/components/layout/main-content';

/**
 * Tier 1 (일반 사용자) 라우트 그룹 레이아웃
 * 
 * 모든 Tier 1 페이지는 이 레이아웃을 사용합니다.
 * 인증이 필요하며, 인증되지 않은 사용자는 로그인 페이지로 리디렉션됩니다.
 */
export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 인증 확인 및 리디렉션
  const user = await requireAuth();

  return (
    <SidebarProvider>
      <div className="relative min-h-screen bg-background">
        <Sidebar />
        
        <MainContent>
          <Header user={user} />
          
          <main className="p-6 pb-20 md:pb-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </MainContent>
      </div>
    </SidebarProvider>
  );
}

