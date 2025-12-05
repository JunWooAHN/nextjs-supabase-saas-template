import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { JWTDebugClient } from './jwt-debug-client';

/**
 * JWT 디버깅 페이지 (테스트 서버 전용)
 * 
 * ⚠️ 프로덕션에서는 이 페이지를 제거하거나 보호해야 합니다.
 */
export default async function DebugJWTPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    redirect('/login');
  }

  // DB에서 profiles.permissions 조회 (비교용)
  let dbPermissions: string | null = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('permissions')
      .eq('id', session.user.id)
      .single();
    
    if (profile) {
      dbPermissions = profile.permissions?.toString() || '0';
    }
  } catch (error) {
    console.error('Failed to fetch profile permissions:', error);
  }

  // 서버 사이드에서도 로그 출력
  console.log('=== JWT Debug Info (Server Side) ===');
  console.log('Access Token:', session.access_token);
  console.log('Refresh Token:', session.refresh_token);
  console.log('User ID:', session.user.id);
  console.log('Email:', session.user.email);
  console.log('App Metadata:', JSON.stringify(session.user.app_metadata, null, 2));
  console.log('App Permissions (JWT):', session.user.app_metadata?.app_permissions);
  console.log('DB Permissions:', dbPermissions);
  console.log('Memberships:', JSON.stringify(session.user.app_metadata?.memberships, null, 2));
  console.log('=====================================');

  // JWT 디코딩 (간단한 방법)
  let decodedToken: any = null;
  try {
    const payload = session.access_token.split('.')[1];
    decodedToken = JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch (e) {
    console.error('Failed to decode JWT:', e);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">JWT Debug Info (테스트 서버 전용)</h1>
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800 font-semibold">
          ⚠️ 경고: 이 페이지는 테스트 서버 전용입니다. 프로덕션에서는 제거하거나 보호해야 합니다.
        </p>
        <p className="text-xs text-yellow-700 mt-2">
          브라우저 콘솔(Console)에서도 토큰 정보를 확인할 수 있습니다.
        </p>
      </div>

      <div className="space-y-6">
        {/* 사용자 정보 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">사용자 정보</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify({
              userId: session.user.id,
              email: session.user.email,
              app_metadata: session.user.app_metadata,
            }, null, 2)}
          </pre>
        </div>

        {/* App Permissions 비교 */}
        <div>
          <h2 className="text-lg font-semibold mb-2">App Permissions 비교</h2>
          <div className="bg-gray-100 p-4 rounded space-y-2">
            <div>
              <span className="font-medium text-sm">JWT의 app_permissions:</span>
              <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto">
                {session.user.app_metadata?.app_permissions || '(없음)'}
              </pre>
            </div>
            <div>
              <span className="font-medium text-sm">DB의 profiles.permissions:</span>
              <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto">
                {dbPermissions || '(조회 실패)'}
              </pre>
            </div>
            {session.user.app_metadata?.app_permissions && dbPermissions && (
              <div className={`mt-2 p-2 rounded text-sm ${
                session.user.app_metadata.app_permissions === dbPermissions 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {session.user.app_metadata.app_permissions === dbPermissions 
                  ? '✅ 일치함' 
                  : '❌ 불일치 - Hook이 실행되지 않았거나 업데이트되지 않았습니다'}
              </div>
            )}
          </div>
        </div>

        {/* Memberships */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Memberships</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(session.user.app_metadata?.memberships || {}, null, 2)}
          </pre>
        </div>

        {/* Access Token (전체) */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Access Token (전체)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs break-all">
            {session.access_token}
          </pre>
        </div>

        {/* Decoded Token */}
        {decodedToken && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Decoded Token (Payload)</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(decodedToken, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 클라이언트 컴포넌트로 브라우저 콘솔에도 출력 */}
      <JWTDebugClient session={session} />
    </div>
  );
}


