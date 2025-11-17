상태

버전

최종 수정일

✅ 제정

v1.2.0

2025-11-17

1. 개요 (Overview)

이 문서는 prove-geo-web-app 프로젝트의 기술적 방향성을 결정하는 최상위 원칙을 정의합니다. 모든 코드는 이 원칙을 기반으로 작성되어야 하며, 여기에 명시된 내용과 다른 접근 방식이 필요할 경우 반드시 팀의 기술 리더와 합의를 거쳐야 합니다.

이 원칙들은 Next.js의 서버 중심 패러다임과 Supabase의 강력한 BaaS(Backend-as-a-Service) 기능을 결합하여, 안정적이고 확장 가능하며 예측 가능한 애플리케이션을 구축하는 것을 목표로 합니다.

2. 핵심 원칙 (Core Principles)

원칙 1: Supabase는 데이터베이스, Next.js는 서버 (Supabase for Database, Next.js for Server)

Supabase의 역할: 우리 아키텍처에서 Supabase는 주로 데이터 영속성 계층(Persistence Layer), 즉 데이터베이스(Postgres), 인증(Authentication), 스토리지(Storage) 서비스의 역할을 수행합니다.

Next.js의 역할: Next.js는 단순히 프론트엔드를 렌더링하는 도구를 넘어, 애플리케이션의 유일한 서버(Application Server) 역할을 담당합니다. 모든 비즈니스 로직, 유효성 검사, 외부 API 연동 등은 Next.js의 서버 환경(서버 컴포넌트, 서버 액션, API 라우트) 내에서 처리됩니다.

🚫 Supabase Edge Functions 금지: 프로젝트의 복잡성을 낮추고 코드의 응집도를 높이기 위해, 별도의 백엔드 로직을 위한 Supabase Edge Functions는 절대 사용하지 않습니다. 모든 로직은 Next.js 서버에서 처리합니다.

1.1. Supabase Storage 사용 원칙

파일 업로드: 클라이언트에서 RLS 정책으로 보호된 스토리지 버킷으로 직접 업로드하는 것을 허용합니다. (예: auth.uid() = owner_id)

파일 다운로드: 민감한 파일은 Next.js 서버 액션을 통해 다운로드 URL을 생성(createSignedUrl)하여 클라이언트에 전달합니다.

파일 삭제: Next.js 서버 액션을 통해서만 처리합니다. (삭제 권한 등에 대한 추가 검증 필요)

원칙 2: 데이터 처리는 RLS로 보호된 범위 내에서 허용 (RLS-Protected Data Handling)

2.1. 데이터 조회 (Fetching)

기본: 데이터 조회는 **서버 컴포넌트**에서 Supabase 서버 클라이언트(lib/supabase/server.ts)를 통해 직접 수행하는 것을 기본 원칙으로 합니다. 이는 클라이언트에 민감한 로직 노출을 막고, 렌더링 성능을 최적화하는 가장 효과적인 방법입니다.

RLS 존중: 일반적인 데이터 조회는 ANON_KEY를 사용하는 서버 클라이언트를 통해 수행하며, 이는 Row Level Security(RLS) 정책을 존중합니다. 사용자 세션 정보는 쿠키를 통해 자동으로 전달됩니다.

2.2. 데이터 변경 (Mutation)

클라이언트 직접 쓰기 허용 범위:

✅ 허용: 사용자가 자신의 데이터(user_id = auth.uid())에 대해 RLS 정책으로 엄격하게 보호된 범위 내에서 INSERT, UPDATE를 수행하는 것을 허용합니다. (예: 자신의 프로필 수정, 자신이 작성한 게시물 수정)

❌ 금지:

다른 사용자의 데이터에 접근/수정하는 작업

여러 테이블에 걸친 복잡한 조인 또는 집계 함수(COUNT, SUM 등)가 필요한 쿼리

여러 테이블에 걸쳐 원자적 작업이 보장되어야 하는 트랜잭션

서버 액션 필수 사용 시나리오:

크로스 유저 작업: 다른 사용자의 데이터에 영향을 미치는 작업 (예: 팀 멤버 초대, 공유 리소스 편집)

복잡한 비즈니스 로직: 여러 단계의 검증이 필요한 작업 (예: 결제 처리, 구독 등급 변경, 복잡한 권한 검증)

외부 API 연동: Supabase 외부 서비스와의 통신이 필요한 작업 (예: 이메일 발송, 웹훅 전송)

트랜잭션 작업: 여러 테이블에 걸쳐 원자성(All-or-Nothing)이 보장되어야 하는 작업 (예: 주문 생성 시 주문 테이블 + 주문 항목 테이블 동시 쓰기)

감사 로그: 보안상 중요한 작업(권한 변경, 중요 데이터 삭제)의 감사 추적(Audit Trail)이 필요한 경우

삭제는 없다, 오직 상태 변경만 있을 뿐 (Soft Deletes Only): 모든 데이터의 '삭제'는 물리적 DELETE가 아닌, status 필드를 'deleted'로 변경하고 deleted_at 타임스탬프를 기록하는 소프트 삭제(Soft Delete) 방식으로만 수행해야 합니다.

2.3. 소프트 삭제 구현 가이드

데이터베이스 스키마: 모든 테이블에 다음 필드를 추가합니다.

ALTER TABLE your_table
ADD COLUMN status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 성능 최적화를 위해 활성 레코드에 대한 인덱스 생성
CREATE INDEX idx_your_table_active_status ON your_table(status)
WHERE status != 'deleted';


RLS 정책 업데이트: SELECT, UPDATE 정책에 status 조건을 추가하여 삭제된 레코드가 보이지 않고 수정할 수 없도록 합니다.

CREATE POLICY "Users can view own active records" ON your_table
FOR SELECT USING (
  auth.uid() = user_id
  AND (status IS NULL OR status != 'deleted')
);


클라이언트/서버 코드: DELETE 대신 UPDATE를 사용합니다.

// ❌ DELETE 사용 금지 (물리적 삭제)
await supabase.from('items').delete().eq('id', itemId);

// ✅ 소프트 삭제 사용 (상태 변경)
await supabase
  .from('items')
  .update({
    status: 'deleted',
    deleted_at: new Date().toISOString()
  })
  .eq('id', itemId)
  .eq('user_id', userId); // RLS로도 보호


원칙 3: 보안은 계층적으로 (Defense in Depth)

우리 시스템의 보안은 두 개의 핵심 계층으로 구성됩니다.

데이터베이스 계층 (in Supabase) - 1차 방어선:

주요 관문: Row Level Security (RLS) 정책이 모든 데이터 접근에 대한 주요 관문(Primary Gatekeeper) 역할을 합니다. RLS 정책은 "이 사용자가 이 행의 소유자인가? (auth.uid() = user_id)"와 같이 데이터의 소유권을 검증합니다.

애플리케이션 계층 (in Next.js) - 2차 방어선:

복잡한 비즈니스 로직: 서버 액션은 RLS만으로 처리할 수 없는 복잡한 비즈니스 규칙, 역할(Role) 기반 권한, 입력 데이터 유효성, 트랜잭션 일관성을 철저히 검증합니다.

3.1. RLS 정책 작성 가이드

기본 패턴 (소유권):

CREATE POLICY "Users can access own data" ON your_table
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


정책 테스트 (Local Supabase CLI):

-- 테스트 사용자로 역할 및 JWT 설정
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<test-user-uuid>';

-- 정책 테스트 실행
SELECT * FROM your_table; -- 해당 사용자의 데이터만 보여야 함


3.2. 서버 액션 보안 체크리스트

모든 서버 액션은 다음을 확인해야 합니다:

[ ] 사용자 인증 확인: getCurrentUser() 등을 호출하여 인증된 사용자인지 확인

[ ] 입력 데이터 유효성 검사: Zod 스키마 등을 사용하여 입력값(payload) 검증

[ ] 권한 검증: 이 사용자가 이 작업을 수행할 역할(role)이나 권한이 있는지 확인

[ ] 데이터 소유권 이중 확인: RLS가 있더라도, 로직 내에서 한 번 더 소유권 확인

[ ] 에러 처리: try-catch를 사용하고, 클라이언트에 민감한 에러 정보를 노출하지 않음

원칙 4: 상태는 서버에, UI 상태는 클라이언트에 (Server for State, UI State for Client)

데이터의 진실 공급원(SSoT): 데이터의 유일하고 진실된 공급원은 Postgres 데이터베이스 입니다.

상태 중복 최소화: 서버의 데이터를 클라이언트 상태 관리 라이브러리(Zustand 등)에 그대로 복제하여 사용하는 것을 지양합니다. 서버 데이터는 필요시 revalidatePath 등을 통해 다시 조회하는 것을 원칙으로 합니다.

4.1. 클라이언트 상태 관리 예시 (Zustand 등)

✅ 적절한 사용 (UI 상태):

interface UIState {
  isModalOpen: boolean;
  selectedTab: string;
  formDraft: Partial<FormData>; // 비영속적인 폼 초안
  currentUser: User | null; // 로그인한 사용자 정보 (캐시 목적)
}


❌ 부적절한 사용 (서버 데이터 복제):

interface BadState {
  allProfiles: Profile[]; // 서버에서 가져온 데이터 목록
  teamItems: Item[];      // 서버에서 가져온 데이터 목록
}


4.2. 실시간 업데이트

Supabase Realtime은 UI에 즉각적인 피드백이 필요한 경우(예: 채팅, 알림)에 한해 제한적으로 사용합니다.

상태 복제가 아닌, Realtime 이벤트를 받아 revalidatePath()를 트리거하거나 UI에 알림을 표시하는 용도로 사용합니다.

4.2.1. 실시간 업데이트 예시

// 클라이언트 컴포넌트
'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache'; // 서버 액션으로 호출 필요

export function RealtimeProfileUpdater({ userId }: { userId: string }) {
  const supabase = createBrowserClient();

  useEffect(() => {
    const channel = supabase
      .channel(`profile-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('Profile updated!', payload.new);
          // UI에 알림을 표시하거나,
          // 서버 액션을 호출하여 관련 경로의 캐시를 무효화합니다.
          // 예: await triggerRevalidation('/dashboard');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return null;
}


4.3. 서버 데이터 캐싱 전략

Next.js 캐싱: 서버 컴포넌트의 fetch 또는 Supabase 클라이언트 조회를 Next.js가 자동으로 캐싱합니다. 데이터 변경 후 revalidatePath 또는 revalidateTag로 캐시를 무효화합니다.

React cache(): cache() 유틸리티를 사용하여 동일한 렌더링 주기 내에서 중복 데이터 요청을 방지합니다.

원칙 5: 코드는 예측 가능하게 (Predictable Code)

5.1. 의존성 주입(DI) 사용 가이드

사용 시점: 서비스 계층(예: UserService, CompanyService)이나 외부 의존성(Supabase 클라이언트, 외부 API)이 있는 복잡한 비즈니스 로직을 구현할 때 InversifyJS 등을 사용합니다.

목적: 코드의 결합도를 낮추고, 테스트(Mocking) 용이성을 극대화합니다.

예외: 프로젝트 초기 단계나 간단한 로직은 DI 없이 직접 호출하는 것을 허용합니다.

5.2. 타입 시스템 가이드

DB 타입 자동 생성: supabase gen types CLI 명령을 사용하여 데이터베이스 스키마로부터 TypeScript 타입을 자동 생성하고, 이를 프로젝트 전반에서 활용합니다.

supabase gen types typescript --project-id <project-id> > types/supabase.ts


타입 사용 원칙:

모든 DB 쿼리 결과는 types/supabase.ts의 타입을 사용합니다.

any 타입 사용을 절대 금지합니다. (unknown 사용 후 타입 가드)

5.2.1. 타입 사용 예시

// ✅ 올바른 타입 사용
import type { Database } from '@/types/supabase';

// DB에서 직접 타입 추론
type Profile = Database['public']['tables']['profiles']['Row'];
type NewProfile = Database['public']['tables']['profiles']['Insert'];

export async function getUserProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  return data;
}

// ✅ 타입 가드 예시
function isProfile(data: unknown): data is Profile {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data // 주요 필드 확인
  );
}


3. Supabase 클라이언트 사용 원칙

3.1. 서버 클라이언트 (lib/supabase/server.ts)

용도: 서버 컴포넌트, 서버 액션, API 라우트

키: PUBLISHABLE_KEY 사용 (RLS 정책 존중)

특징: 사용자 세션 정보는 쿠키를 통해 자동으로 전달됨

3.2. Admin 클라이언트 (서비스 롤 키) 사용 원칙

🚫 Admin 클라이언트 사용 금지 (원칙):

lib/supabase/admin.ts와 같이 SERVICE_ROLE_KEY를 사용하는 별도의 Admin 클라이언트 팩토리 함수를 만들지 않는 것을 원칙으로 합니다.

SERVICE_ROLE_KEY는 RLS를 포함한 모든 보안 장치를 우회하므로, 애플리케이션 로직에서 절대 사용해서는 안 됩니다.

✅ 서비스 롤 키가 필요한 경우 (극히 예외적):

시나리오: RLS 정책을 우회해야 하는 극히 제한적인 서버 액션 (예: 시스템 전체 설정 변경, 특정 사용자의 데이터 마이게이션)

구현: 별도 클라이언트를 만들지 않고, 해당 서버 액션 내에서 process.env.SUPABASE_SECRET_KEY를 사용하여 일회성으로 생성하여 사용합니다. 이 키는 클라이언트에 절대 노출되어서는 안 됩니다.

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function highlySensitiveAdminAction() {
  const cookieStore = await cookies();

  // 서버 액션 내부에서만 Secret Key로 일회성 클라이언트 생성
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!, // Secret Key 사용
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // 서버 액션에서는 쿠키 설정 불필요
      },
    }
  );

  // ... RLS를 우회하는 관리자 작업 수행 ...
}


⚠️ 경고: 이 패턴은 RLS를 우회하므로 극히 예외적인 경우에만 사용해야 합니다.
사용 전 반드시 팀의 기술 리더와 합의하고, 사용 이유를 명확히 문서화해야 합니다.

3.3. 브라우저 클라이언트 (lib/supabase/client.ts)

용도: 클라이언트 컴포넌트에서 RLS로 보호된 자신의 데이터에 대한 직접 접근

키: PUBLISHABLE_KEY 사용 (RLS 정책 존중)

사용 범위:

✅ 적절한 사용:

// 자신의 프로필 업데이트 (RLS로 보호됨)
await supabase
  .from('profiles')
  .update({ full_name: 'New Name' })
  .eq('id', userId);


❌ 부적절한 사용:

// 다른 사용자 데이터 접근 시도 (RLS가 막지만, 로직 자체가 잘못됨)
await supabase
  .from('profiles')
  .update({ full_name: 'Hacked' })
  .eq('id', otherUserId); // 서버 액션을 사용해야 함


4. 데이터베이스 네이밍 컨벤션

테이블명: snake_case, 복수형 사용 (예: profiles, companies, team_members)

컬럼명: snake_case 사용

외래키: {참조하는테이블_단수형}_id (예: user_id, company_id)

타임스탬프: created_at, updated_at, deleted_at (모두 timestamptz 타입)

상태: status (예: 'active', 'deleted', 'pending')

인덱스명: idx_{table}_{column} (예: idx_profiles_email)

제약조건명: fk_{table}_{column} (예: fk_profiles_user_id)

5. 코드 리뷰 체크리스트

코드를 리뷰할 때 다음 아키텍처 원칙이 준수되었는지 확인합니다.

[ ] Supabase Edge Functions를 사용하지 않았는가?

[ ] RLS 정책이 모든 신규 테이블에 활성화되었는가?

[ ] 클라이언트 직접 쓰기는 자신의 데이터(auth.uid() = user_id)에 한정되는가?

[ ] 복잡한 로직, 트랜잭션, 외부 API 연동은 서버 액션을 사용하는가?

[ ] 물리적 DELETE 대신 소프트 삭제(status = 'deleted') 패턴을 사용했는가?

[ ] any 타입을 사용하지 않고 DB 타입을 정확히 지정했는가?

[ ] 서버 데이터를 Zustand 같은 클라이언트 상태에 직접 복제하지 않았는가?

[ ] SERVICE_ROLE_KEY를 부적절하게 사용하지 않았는가?

6. 결론

이 원칙들은 프로젝트의 기술적 방향성을 결정하는 핵심입니다. 모든 개발자는 이 원칙을 숙지하고, 코드 작성 시 이를 준수해야 합니다. 원칙을 위반해야 하는 특별한 경우가 있다면, 반드시 팀의 기술 리더와 논의한 후 진행해야 합니다.