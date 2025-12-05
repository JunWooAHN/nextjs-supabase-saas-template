'use client';

import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';

interface JWTDebugClientProps {
  session: Session;
}

/**
 * 클라이언트 사이드 JWT 디버깅 컴포넌트
 * 브라우저 콘솔에 토큰 정보를 출력합니다.
 */
export function JWTDebugClient({ session }: JWTDebugClientProps) {
  useEffect(() => {
    console.log('=== JWT Debug Info (Client Side / Browser Console) ===');
    console.log('Access Token:', session.access_token);
    console.log('Refresh Token:', session.refresh_token);
    console.log('User ID:', session.user.id);
    console.log('Email:', session.user.email);
    console.log('App Metadata:', session.user.app_metadata);
    console.log('App Permissions (JWT):', session.user.app_metadata?.app_permissions);
    console.log('Memberships:', session.user.app_metadata?.memberships);
    
    // JWT 디코딩
    try {
      const payload = session.access_token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      console.log('Decoded Token (Payload):', decoded);
    } catch (e) {
      console.error('Failed to decode JWT:', e);
    }
    
    console.log('======================================================');
  }, [session]);

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
      <p className="text-sm text-blue-800">
        💡 브라우저 개발자 도구의 Console 탭에서도 토큰 정보를 확인할 수 있습니다.
      </p>
    </div>
  );
}


