'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Tier 1: 프로필 설정 컴포넌트
 * 
 * 클라이언트에서 직접 Supabase에 접근하여 프로필을 조회/수정합니다.
 * RLS 정책 (id = auth.uid())으로 보호됩니다.
 */
export function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const supabase = createBrowserSupabaseClient();

  // 프로필 조회 (Tier 1: 클라이언트 직접 접근)
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);

      try {
        // 현재 사용자 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          toast.error('인증이 필요합니다. 다시 로그인해주세요.');
          setIsLoading(false);
          return;
        }

        // 프로필 조회 (Tier 1: 클라이언트 직접 접근)
        // RLS SELECT 정책: id = auth.uid()로 보호됨
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('프로필 조회 실패:', error);
          toast.error('프로필을 불러오는데 실패했습니다: ' + error.message);
          return;
        }

        setProfile(data);
        setFullName(data.full_name || '');
      } catch (err) {
        console.error('프로필 조회 중 오류:', err);
        toast.error('프로필을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [supabase]);

  // 프로필 수정 (Tier 1: 클라이언트 직접 접근)
  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);

    try {
      // 현재 사용자 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('인증이 필요합니다. 다시 로그인해주세요.');
        return;
      }

      // 프로필 수정 (Tier 1: 클라이언트 직접 접근)
      // RLS UPDATE 정책: id = auth.uid()로 보호됨
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('프로필 수정 실패:', error);
        toast.error('프로필 수정에 실패했습니다: ' + error.message);
        return;
      }

      setProfile(data);
      toast.success('프로필이 수정되었습니다.');
    } catch (err) {
      console.error('프로필 수정 중 오류:', err);
      toast.error('프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  function getInitials(name?: string | null, email?: string): string {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-20 rounded-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-80 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">프로필을 불러올 수 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  const initials = getInitials(profile.full_name, profile.email);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Update your profile picture. This will be displayed throughout the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || profile.email} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm" disabled>
                Upload Photo
              </Button>
              <p className="text-xs text-muted-foreground">
                Coming soon: Upload a new profile picture
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information. This information will be visible to you only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed at this time
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

