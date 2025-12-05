#!/bin/bash

# v6.0 Context-Driven Architecture 테스트 스크립트
# 
# 사용법:
#   ./scripts/test-v6-context.sh
# 
# 또는:
#   bash scripts/test-v6-context.sh

set -e

echo "🧪 v6.0 Context-Driven Architecture 테스트"
echo "=========================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 서버 상태 확인
echo "1️⃣ 서버 상태 확인..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 서버 실행 중 (http://localhost:3000)${NC}"
else
    echo -e "${RED}❌ 서버가 실행되지 않았습니다.${NC}"
    echo "   다음 명령어로 서버를 실행하세요:"
    echo "   pnpm run dev"
    exit 1
fi

echo ""
echo "2️⃣ 파일 구조 확인..."

# Context 파일 확인
if [ -f "src/lib/jwt-context/org-context.ts" ]; then
    echo -e "${GREEN}✅ org-context.ts 존재${NC}"
else
    echo -e "${RED}❌ org-context.ts 없음${NC}"
    exit 1
fi

if [ -f "src/lib/jwt-context/center-context.ts" ]; then
    echo -e "${GREEN}✅ center-context.ts 존재${NC}"
else
    echo -e "${RED}❌ center-context.ts 없음${NC}"
    exit 1
fi

# Layout 파일 확인
if [ -f "src/app/(org-management)/manage/org/[orgId]/layout.tsx" ]; then
    echo -e "${GREEN}✅ org-management layout.tsx 존재${NC}"
else
    echo -e "${RED}❌ org-management layout.tsx 없음${NC}"
    exit 1
fi

# Page 파일 확인
if [ -f "src/app/(org-management)/manage/org/[orgId]/dashboard/page.tsx" ]; then
    echo -e "${GREEN}✅ org-management dashboard/page.tsx 존재${NC}"
else
    echo -e "${RED}❌ org-management dashboard/page.tsx 없음${NC}"
    exit 1
fi

echo ""
echo "3️⃣ 마이그레이션 파일 확인..."

if [ -f "supabase/migrations/06_add_custom_access_token_hook_v6.sql" ]; then
    echo -e "${GREEN}✅ Database Hook 마이그레이션 파일 존재${NC}"
    echo -e "${YELLOW}⚠️  Supabase Dashboard에서 Hook을 등록해야 합니다.${NC}"
else
    echo -e "${RED}❌ Database Hook 마이그레이션 파일 없음${NC}"
    exit 1
fi

echo ""
echo "4️⃣ 테스트 체크리스트:"
echo ""
echo "   [ ] Supabase 프로젝트 실행 중"
echo "   [ ] Database Hook 등록 완료"
echo "   [ ] 테스트 사용자 로그인"
echo "   [ ] JWT에 memberships 정보 확인"
echo "   [ ] /manage/org/[orgId]/dashboard 접근 테스트"
echo "   [ ] 권한 체크 동작 확인"
echo "   [ ] 구독 상태 체크 동작 확인"
echo ""
echo -e "${GREEN}✅ 기본 파일 구조 검증 완료${NC}"
echo ""
echo "📝 다음 단계:"
echo "   1. Supabase Dashboard에서 Database Hook 등록"
echo "   2. 브라우저에서 http://localhost:3000 접속"
echo "   3. 테스트 사용자로 로그인"
echo "   4. 관리자 페이지 접근 테스트"
echo ""
echo "📚 상세 가이드: docs/todo-hypothesis/251130_v6_testing_guide.md"






