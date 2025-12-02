'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PROOF_CATEGORIES, PROOF_METHODS } from '@/lib/constants';

interface LocationProof {
  id: string;
  user_id: string;
  entity_id: string;
  entity_type: number;
  proof_category: number;
  proof_method: number;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  created_at: string;
}

interface ProofsListProps {
  entityId?: string;
  entityType?: number;
  limit?: number;
}

/**
 * Tier 1: 내 위치 증빙 목록 조회 컴포넌트
 * 
 * 클라이언트에서 직접 Supabase에 접근하여 위치 증빙을 조회합니다.
 * RLS SELECT 정책으로 보호됩니다 (본인 증빙만 조회 가능).
 */
export function ProofsList({
  entityId,
  entityType,
  limit = 10,
}: ProofsListProps) {
  const [proofs, setProofs] = useState<LocationProof[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const loadProofs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 현재 사용자 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setError('인증이 필요합니다.');
          setIsLoading(false);
          return;
        }

        // 위치 증빙 조회 (Tier 1: 클라이언트 직접 접근)
        // RLS SELECT 정책: 본인 증빙만 조회 가능
        let query = supabase
          .from('location_proofs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        // 필터 옵션
        if (entityId) {
          query = query.eq('entity_id', entityId);
        }
        if (entityType) {
          query = query.eq('entity_type', entityType);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          console.error('위치 증빙 조회 실패:', queryError);
          setError('위치 증빙을 불러오는데 실패했습니다: ' + queryError.message);
          return;
        }

        setProofs(data || []);
      } catch (err) {
        console.error('위치 증빙 조회 중 오류:', err);
        setError('위치 증빙을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProofs();
  }, [entityId, entityType, limit, supabase]);

  const getCategoryLabel = (category: number): string => {
    switch (category) {
      case PROOF_CATEGORIES.CHECK_IN:
        return '출근';
      case PROOF_CATEGORIES.CHECK_OUT:
        return '퇴근';
      case PROOF_CATEGORIES.GENERAL:
        return '일반';
      default:
        return '알 수 없음';
    }
  };

  const getMethodLabel = (method: number): string => {
    switch (method) {
      case PROOF_METHODS.GPS:
        return 'GPS';
      case PROOF_METHODS.QR:
        return 'QR';
      case PROOF_METHODS.INSTANT_QR:
        return '즉시 QR';
      case PROOF_METHODS.SYSTEM:
        return '시스템';
      default:
        return '알 수 없음';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (proofs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">위치 증빙이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {proofs.map((proof) => (
        <Card key={proof.id}>
          <CardHeader>
            <CardTitle className="text-sm">
              {getCategoryLabel(proof.proof_category)} - {getMethodLabel(proof.proof_method)}
            </CardTitle>
            <CardDescription>
              {new Date(proof.created_at).toLocaleString('ko-KR')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">위도:</span> {proof.location.latitude.toFixed(6)}
              </div>
              <div>
                <span className="font-medium">경도:</span> {proof.location.longitude.toFixed(6)}
              </div>
              {proof.location.accuracy && (
                <div>
                  <span className="font-medium">정확도:</span> {proof.location.accuracy.toFixed(1)}m
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

