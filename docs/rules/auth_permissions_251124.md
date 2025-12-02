$$기술 정책 v5.6$$  
통합 접근 제어 전략 (Unified Access Control Strategy)

## **1\. 개요 (Overview)**

본 문서는 \*\*\[기술 정책 v5.5\]\*\*를 계승 및 확장하여, \*\*구독 상태(Subscription)\*\*뿐만 아니라 \*\*세부 권한(Permissions)\*\*까지 JWT 기반으로 처리하는 통합 전략을 정의한다.

이를 통해 **Tier 2 (SaaS 관리자)** 기능 접근 시, 미들웨어 단계에서 \*\*'권한 확인(Authorization)'\*\*과 \*\*'구독 확인(Subscription Check)'\*\*을 동시에 수행하여 DB 부하를 원천 차단한다.

## **2\. 데이터 명세 (Data Specifications)**

### **제1항 통합 멤버십 구조 (Unified Membership Map)**

JWT 용량(4KB)을 효율적으로 사용하기 위해 subscriptions와 permissions를 분리하지 않고, memberships라는 단일 객체에 배열 형태로 압축 저장한다.

**JWT app\_metadata 구조:**

{  
  "app\_metadata": {  
    "memberships": {  
      // "EntityUUID": \[SubscriptionStatus(Int), Permissions(HexString)\]  
      "org-uuid-1": \[1, "1f"\],       // Active, ORG\_OWNER (31)  
      "center-uuid-A": \[2, "400"\],   // Past\_Due, CENTER\_VIEW (1024)  
      "org-uuid-2": \[1, "5"\]         // Active, ORG\_MEMBER (5)  
    }  
  }  
}

* **Index 0 (Status):** 구독 상태 코드 (1: Active, 2: Past Due...)  
* **Index 1 (Permissions):** 권한 비트필드 값을 \*\*16진수 문자열(Hex String)\*\*로 변환하여 저장.  
  * *이유:* BigInt(64bit)는 JSON 숫자로 표현 시 정밀도 손실 위험이 있으며, 10진수 문자열보다 16진수가 더 짧아 용량을 절약함.

## **3\. 구현 상세 (Implementation)**

### **제1항 Database Hook 업데이트**

기존 custom\_access\_token\_hook을 수정하여 권한 정보까지 함께 조회 및 변환한다.

\-- \[Hook\] 통합 멤버십 정보 주입  
CREATE OR REPLACE FUNCTION public.custom\_access\_token\_hook(event jsonb)  
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$  
DECLARE  
  claims jsonb;  
  user\_id uuid;  
  membership\_map jsonb;  
BEGIN  
  user\_id := (event-\>\>'user\_id')::uuid;

  \-- 1\. 전체 멤버십 조회 (50개 제한 보장됨)  
  \-- 권한(bigint)를 to\_hex()로 변환하여 용량 절약 및 정밀도 보장  
  SELECT jsonb\_object\_agg(  
    m.entity\_id,   
    json\_build\_array(  
      COALESCE(es.status, 1),       \-- Index 0: Status  
      to\_hex(m.permissions)         \-- Index 1: Permissions (Hex)  
    )  
  )  
  INTO membership\_map  
  FROM public.memberships m  
  LEFT JOIN public.entity\_subscriptions es   
    ON m.entity\_id \= es.entity\_id AND m.entity\_type \= es.entity\_type  
  WHERE m.user\_id \= user\_id;

  \-- 2\. JWT 주입  
  claims := event-\>'claims';  
    
  IF jsonb\_typeof(claims-\>'app\_metadata') IS NULL THEN  
    claims := jsonb\_set(claims, '{app\_metadata}', '{}');  
  END IF;

  \-- 'memberships' 필드에 주입  
  claims := jsonb\_set(claims, '{app\_metadata, memberships}', COALESCE(membership\_map, '{}'));

  event := jsonb\_set(event, '{claims}', claims);  
  RETURN event;  
END;  
$$;

### **제2항 미들웨어 로직 (Tier 2 Access Control)**

미들웨어는 이제 16진수 권한을 파싱하여 접근 권한까지 검사한다.

**필수 검사 로직:**

1. **조직 관리 페이지:** ORG\_VIEW (1) 권한 비트가 켜져 있는지 확인.  
2. **센터 관리 페이지:** CENTER\_VIEW (1024) 권한 비트가 켜져 있는지 확인.

// middleware.ts  
import { NextResponse, type NextRequest } from 'next/server';

// 권한 비트 상수 (BigInt) \- constants.ts와 동기화  
const PERM\_BITS \= {  
  ORG\_VIEW: BigInt(1),        // 1 \<\< 0  
  CENTER\_VIEW: BigInt(1024),  // 1 \<\< 10  
};

export async function middleware(request: NextRequest) {  
  // ... (Supabase 클라이언트 초기화 및 User Fetch) ...  
  const { data: { user } } \= await supabase.auth.getUser();

  if (user) {  
    const pathParts \= request.nextUrl.pathname.split('/');  
    // memberships 구조: { \[entityId\]: \[status(number), permHex(string)\] }  
    const memberships \= user.app\_metadata.memberships as Record\<string, \[number, string\]\> | undefined;

    // \[Tier 2\] 조직 관리 경로 체크  
    if (pathParts\[1\] \=== 'org-management' && pathParts\[2\]) {  
      const entityId \= pathParts\[2\];  
      const data \= memberships?.\[entityId\];

      // 1\. 멤버십 존재 여부 확인  
      if (\!data) {  
        return NextResponse.redirect(new URL('/dashboard', request.url)); // 404/403  
      }

      const \[status, permHex\] \= data;

      // 2\. 권한(Permission) 체크 (RBAC)  
      // Hex String \-\> BigInt 변환  
      const permissions \= BigInt(\`0x${permHex}\`);  
        
      // ORG\_VIEW 권한이 없으면 접근 차단  
      if ((permissions & PERM\_BITS.ORG\_VIEW) \=== 0n) {  
         // 권한 부족 페이지 또는 대시보드 리디렉션  
         return NextResponse.redirect(new URL('/dashboard?error=forbidden', request.url));  
      }

      // 3\. 구독(Subscription) 체크  
      if (status \!== 1\) { // ACTIVE  
         if (\!request.nextUrl.pathname.includes('/billing')) {  
           return NextResponse.redirect(new URL(\`/org-management/${entityId}/billing\`, request.url));  
         }  
      }  
    }  
      
    // \[Tier 2\] 센터 관리 경로 체크 (동일 로직)  
    if (pathParts\[1\] \=== 'center-management' && pathParts\[2\]) {  
       // ... CENTER\_VIEW 비트 체크 ...  
    }  
  }  
  return response;  
}

### **제3항 클라이언트/tRPC 활용 (PermissionsBitField Integration)**

클라이언트와 tRPC 서버에서도 JWT 데이터를 사용하여 PermissionsBitField를 초기화한다.

// lib/permissions.ts 업데이트

export class PermissionsBitField {  
  // ... 기존 구현 ...

  /\*\*  
   \* JWT Hex String에서 인스턴스 생성 헬퍼  
   \*/  
  static fromHex(hex: string): PermissionsBitField {  
    return new PermissionsBitField(BigInt(\`0x${hex}\`));  
  }  
}

// 예시: tRPC Context 또는 Client Component  
const membershipData \= user.app\_metadata.memberships\[orgId\];  
if (membershipData) {  
  const \[status, permHex\] \= membershipData;  
  const permissions \= PermissionsBitField.fromHex(permHex);  
    
  if (permissions.has(PERMISSIONS.ORG\_MANAGE\_MEMBERS)) {  
    // Show Admin Button  
  }  
}

## **4\. 기대 효과 (Impact Analysis)**

1. **Tier 2 보안 강화:** 미들웨어 단계에서 악의적인 URL 접근(권한 없는 사용자가 /settings 접근 등)을 원천 차단한다.  
2. **완벽한 Zero DB Latency:** 페이지 이동 시 DB를 전혀 조회하지 않으므로, 관리자 페이지의 로딩 속도가 일반 페이지(SPA)급으로 향상된다.  
3. **데이터 일관성:** 구독 상태와 권한 정보가 하나의 스냅샷(JWT)으로 관리되어 동기화 문제가 감소한다.

## **5\. 체크리스트**

* \[ \] **DB Hook 업데이트:** custom\_access\_token\_hook 함수를 v5.6 버전(Hex 변환 포함)으로 갱신했는가?  
* \[ \] **Middleware 수정:** memberships 통합 구조를 파싱하고, BigInt 비트 연산을 적용했는가?  
* \[ \] **클라이언트 코드 수정:** 기존 user.app\_metadata.subscriptions를 참조하던 코드를 memberships 구조에 맞게 리팩토링했는가?