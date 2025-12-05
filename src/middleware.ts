import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isDevAdminEnabled } from '@/lib/utils/dev-mode';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ============================================
  // v6.0 Context-Driven Architecture
  // ============================================
  // 
  // 미들웨어의 역할: 인증(Authentication)만 담당
  // - 권한(Authorization)과 구독 체크는 Layout에서 처리
  // - 각 Layout의 getOrgContext() / getCenterContext()에서 권한/구독 체크 수행
  //
  // 이렇게 분리하는 이유:
  // 1. 미들웨어는 모든 요청에 실행되므로 최소한의 로직만 수행
  // 2. 권한/구독 체크는 Context 객체를 통해 선언적으로 처리
  // 3. react.cache를 통한 성능 최적화 (JWT 파싱 1회만 실행)

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 테스트 서버용: 디버그 페이지에서만 토큰 로그 출력
  if (request.nextUrl.pathname === '/debug/jwt' && user) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('=== Middleware JWT Debug ===');
      console.log('Access Token:', session.access_token);
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      console.log('Memberships:', user.app_metadata?.memberships);
      console.log('===========================');
    }
  }

  // Define protected routes (인증이 필요한 라우트)
  // Note: 권한/구독 체크는 각 Layout의 Context 객체에서 처리됩니다
  const protectedRoutes = [
    '/dashboard',      // (user)/dashboard
    '/settings',       // (user)/settings
    '/org/',          // (user)/org/[orgId]/*
    '/center/',       // (user)/center/[centerId]/*
    '/statistics',    // (user)/statistics
    '/personal-proofs', // (user)/personal-proofs
    '/org-management/', // (org-management)/[orgId]/*
    '/center-management/', // (center-management)/[centerId]/*
    '/app-manager/',  // (app-manager)/app-manager/* (임시 어드민 페이지)
  ];
  const authRoutes = ['/login', '/signup'];
  
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // ============================================
  // 개발 환경 전용 페이지 체크
  // ============================================
  // 
  // 개발 환경 전용 임시 어드민 페이지는 개발 환경에서만 접근 가능
  if (request.nextUrl.pathname.startsWith('/app-manager/temp-admin')) {
    if (!isDevAdminEnabled()) {
      // 프로덕션에서는 접근 차단
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'dev_admin_not_available');
      return NextResponse.redirect(url);
    }
    // 개발 환경이면 인증만 체크 (appManager 권한 불필요)
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    // 개발 환경이고 인증되어 있으면 통과
    return supabaseResponse;
  }

  // 인증되지 않은 사용자를 로그인 페이지로 리디렉션
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 이미 인증된 사용자를 대시보드로 리디렉션 (로그인/회원가입 페이지 접근 시)
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - auth (authentication routes like callback)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
