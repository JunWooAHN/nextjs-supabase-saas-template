$$기술 정책 v6.0$$  
Context-Driven Architecture & Access Control

## **1\. 서문 (Preamble)**

우리는 SaaS의 복잡한 권한(Permission)과 구독(Subscription) 상태를 관리하기 위해 수많은 시행착오를 거쳤다. 그 결과, \*\*"요청(Request)은 하나의 맥락(Context)으로 관리되어야 한다"\*\*는 결론에 도달했다.

본 문서는 **Next.js App Router**와 **React Cache**의 특성을 극대화하여, 보안성과 개발 생산성을 동시에 잡는 \*\*'Scoped Context Pattern'\*\*을 프로젝트의 표준으로 제정한다.

## **2\. 핵심 철학 (Core Philosophy)**

### **제1원칙: 컨텍스트 불변의 법칙 (Context Immutability)**

하나의 HTTP 요청(Request) 내에서, 사용자의 권한과 구독 상태는 \*\*단일한 객체(Context Object)\*\*로 관리되며, 이 객체는 react.cache를 통해 메모이제이션된다.  
Layout에서 생성된 Context는 Page, Component 어디서 호출하든 동일한 인스턴스임이 보장된다.

### **제2원칙: 데이터와 행위의 응집 (Cohesion)**

데이터(Data)를 검증하는 로직을 분리하지 않는다.  
"이 유저가 오너인가?"(Data)와 "오너가 아니면 쫓아내라"(Behavior)는 하나의 클래스 메서드로 묶여야 한다.  
개발자는 if (user.role \!== 'OWNER') redirect(...)를 반복 작성하지 않고, ctx.requireOwner() 한 줄로 처리한다.

### **제3원칙: 하이브리드 제어 (Hybrid Control)**

* **Server (Tier 2):** Context 객체를 통해 접근을 통제한다.  
* **Client (Tier 1):** 상태 변경(결제, 권한 변경) 즉시 refreshSession()을 통해 Server Context를 최신화한다.

## **3\. 아키텍처 명세 (Architecture Specs)**

### **3.1. Context 클래스 설계**

모든 엔티티(Organization, Center)는 전용 Context 클래스를 가진다.

**파일 경로:** src/lib/context/org-context.ts

import { cache } from 'react';  
import { redirect } from 'next/navigation';  
import { createServerSupabaseClient } from '@/lib/supabase/server';  
import { PermissionsBitField } from '@/lib/permissions'; // v5.6 Hex 로직 포함  
import { SUBSCRIPTION\_STATUS } from '@/lib/constants';

/\*\*  
 \* \[Smart Context\] 조직과 관련된 모든 맥락을 캡슐화한 객체  
 \*/  
export class OrgContext {  
  constructor(  
    public readonly orgId: string,  
    public readonly user: any, // Supabase User Type  
    public readonly permissions: PermissionsBitField,  
    private readonly \_subscriptionStatus: number,  
  ) {}

  // \--- \[State Getters\] 상태 조회 \---

  get isBillingActive(): boolean {  
    return this.\_subscriptionStatus \=== SUBSCRIPTION\_STATUS.ACTIVE;  
  }

  get isOwner(): boolean {  
    return this.permissions.has(32n); // ORG\_OWNER Bit  
  }

  get roleName(): string {  
    return this.isOwner ? 'OWNER' : 'MEMBER';  
  }

  // \--- \[Guard Methods\] 강제성 검증 (실패 시 Redirect) \---

  /\*\*  
   \* 특정 권한이 없으면 즉시 퇴장시킴  
   \*/  
  require(permission: bigint, redirectUrl \= '/dashboard?error=forbidden'): void {  
    if (\!this.permissions.has(permission)) {  
      redirect(redirectUrl);  
    }  
  }

  /\*\*  
   \* 구독이 비활성 상태면 빌링 페이지로 강제 이동  
   \*/  
  requireBilling(): void {  
    if (\!this.isBillingActive) {  
      redirect(\`/org-management/${this.orgId}/billing\`);  
    }  
  }

  /\*\*  
   \* 오직 오너만 통과  
   \*/  
  requireOwner(): void {  
    this.require(32n); // ORG\_OWNER  
  }  
}

/\*\*  
 \* \[Factory\] Request-Scoped Singleton 생성기  
 \* \- Layout, Page 어디서든 호출해도 1회만 실행됨 (DB/JWT 파싱 비용 절감)  
 \*/  
export const getOrgContext \= cache(async (orgId: string) \=\> {  
  const supabase \= await createServerSupabaseClient();  
  const { data: { user } } \= await supabase.auth.getUser();

  if (\!user) redirect('/login');

  // JWT Claims 파싱 (v5.6 Spec: Hex String)  
  const memberships \= user.app\_metadata.memberships as Record\<string, \[number, string\]\> | undefined;  
  const data \= memberships?.\[orgId\];

  // 멤버십이 없으면 접근 불가 (404/Dashboard)  
  if (\!data) redirect('/dashboard');

  const \[status, permHex\] \= data;  
  const permissions \= PermissionsBitField.fromHex(permHex);

  return new OrgContext(orgId, user, permissions, status);  
});

### **3.2. Layout 적용 패턴**

**패턴:** "상위 레이아웃은 최소한의 방어, 하위 레이아웃은 정밀 방어"

**(1) 최상위 Layout (src/app/(org-management)/\[orgId\]/layout.tsx)**

* **역할:** 컨텍스트 초기화, 기본 권한(VIEW) 체크, 사이드바 주입.

import { getOrgContext } from '@/lib/context/org-context';  
import { PERMISSIONS } from '@/lib/permissions';

export default async function OrgBaseLayout({ children, params }: any) {  
  // 1\. 컨텍스트 로드 (최초 실행)  
  const ctx \= await getOrgContext(params.orgId);

  // 2\. 최소 권한 체크 (멤버인가?)  
  ctx.require(PERMISSIONS.ORG\_VIEW);

  return (  
    \<div className="flex h-screen"\>  
      {/\* 3\. Context 객체 주입 (Props Drilling 최소화) \*/}  
      \<Sidebar context={ctx} /\>  
      \<main className="flex-1 overflow-auto"\>{children}\</main\>  
    \</div\>  
  );  
}

**(2) 보호된 Layout (src/app/(org-management)/\[orgId\]/(protected)/layout.tsx)**

* **역할:** 구독 상태 체크 (빌링 페이지 제외용).

import { getOrgContext } from '@/lib/context/org-context';

export default async function ProtectedLayout({ children, params }: any) {  
  const ctx \= await getOrgContext(params.orgId); // 캐시된 객체 재사용

  // 3\. 구독 상태 강제 (돈 안 냈으면 /billing으로)  
  ctx.requireBilling();

  return \<\>{children}\</\>;  
}

### **3.3. Page 사용 패턴**

**패턴:** "데이터가 필요해? Context를 불러."

**(1) Dashboard Page (.../dashboard/page.tsx)**

import { getOrgContext } from '@/lib/context/org-context';

export default async function DashboardPage({ params }: any) {  
  const ctx \= await getOrgContext(params.orgId); // 캐시 Hit

  return (  
    \<div className="p-8"\>  
      \<h1 className="text-2xl font-bold"\>  
        {ctx.roleName} 대시보드  
      \</h1\>  
        
      {/\* 4\. 비즈니스 로직이 UI에서 사라지고 Context 메서드로 대체됨 \*/}  
      {\!ctx.isBillingActive && (  
        \<Alert\>구독이 만료되었습니다. 기능을 사용할 수 없습니다.\</Alert\>  
      )}

      {/\* 5\. 권한별 UI 렌더링 \*/}  
      {ctx.isOwner && \<DeleteOrgButton orgId={ctx.orgId} /\>}  
    \</div\>  
  );  
}

## **4\. 클라이언트 동기화 (Client Synchronization)**

서버 컨텍스트(OrgContext)는 JWT 쿠키를 기반으로 생성된다. 따라서 Tier 2 작업(tRPC)으로 상태가 변경되면, 반드시 클라이언트 쿠키를 갱신해야 한다.

**Hook 정의 (src/hooks/use-user-sync.ts)**

'use client';  
import { createBrowserSupabaseClient } from '@/lib/supabase/client';  
import { useRouter } from 'next/navigation';

export function useUserSync() {  
  const supabase \= createBrowserSupabaseClient();  
  const router \= useRouter();

  const refreshContext \= async () \=\> {  
    // 1\. Supabase Auth Hook 트리거 \-\> 새 JWT 발급 (쿠키 갱신)  
    await supabase.auth.refreshSession();  
    // 2\. Server Component 리렌더링 요청 \-\> 새 쿠키로 getOrgContext 다시 실행됨  
    router.refresh();  
  };

  return { refreshContext };  
}

**사용처:**

* 결제 성공 페이지 (PaymentSuccess)  
* 멤버 초대 수락 완료 페이지  
* 플랜 업그레이드 완료 시점

## **5\. 결론 및 체크리스트**

이 아키텍처는 **Next.js App Router의 렌더링 메커니즘**과 **OOP의 캡슐화**를 결합한 최종 형태다.

**Checklist:**

* \[ \] src/lib/context/ 폴더 생성 및 org-context.ts, center-context.ts 구현  
* \[ \] getOrgContext에 react.cache 적용 확인  
* \[ \] PermissionsBitField에 Hex String 파싱 로직 포함 확인 (v5.6)  
* \[ \] Layout 파일들을 ctx.require() 방식으로 리팩토링  
* \[ \] tRPC Mutation 성공 후 useUserSync() 호출 로직 추가