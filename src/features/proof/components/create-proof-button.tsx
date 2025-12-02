'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PROOF_CATEGORIES, PROOF_METHODS, ENTITY_TYPES } from '@/lib/constants';

interface CreateProofButtonProps {
  entityId: string;
  entityType: typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];
  proofCategory?: typeof PROOF_CATEGORIES[keyof typeof PROOF_CATEGORIES];
  onSuccess?: () => void;
}

/**
 * Tier 1: 위치 증빙 생성 버튼 컴포넌트
 * 
 * 클라이언트에서 직접 Supabase에 접근하여 위치 증빙을 생성합니다.
 * RLS INSERT 정책 (user_id = auth.uid())으로 보호됩니다.
 */
export function CreateProofButton({
  entityId,
  entityType,
  proofCategory = PROOF_CATEGORIES.GENERAL,
  onSuccess,
}: CreateProofButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const handleCreateProof = async () => {
    setIsLoading(true);

    try {
      // 1. 현재 사용자 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('인증이 필요합니다. 다시 로그인해주세요.');
        return;
      }

      // 2. 위치 정보 획득
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

      // 3. 위치 증빙 생성 (Tier 1: 클라이언트 직접 접근)
      // RLS INSERT 정책: user_id = auth.uid()로 보호됨
      const { data, error } = await supabase
        .from('location_proofs')
        .insert({
          user_id: user.id,
          entity_id: entityId,
          entity_type: entityType,
          proof_category: proofCategory,
          proof_method: PROOF_METHODS.GPS,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
        })
        .select()
        .single();

      if (error) {
        console.error('위치 증빙 생성 실패:', error);
        toast.error('위치 증빙 생성에 실패했습니다: ' + error.message);
        return;
      }

      toast.success('위치 증빙이 생성되었습니다.');
      onSuccess?.();
    } catch (error) {
      console.error('위치 증빙 생성 중 오류:', error);
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('위치 정보를 가져올 수 없습니다.');
            break;
          case error.TIMEOUT:
            toast.error('위치 정보 요청 시간이 초과되었습니다.');
            break;
          default:
            toast.error('위치 정보를 가져오는 중 오류가 발생했습니다.');
        }
      } else {
        toast.error('위치 증빙 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCreateProof}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? '위치 증빙 생성 중...' : '위치 증빙 생성'}
    </Button>
  );
}

