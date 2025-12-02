#!/bin/bash

# 페이지 확인 스크립트
# 개발 서버가 실행 중이어야 합니다

BASE_URL="${1:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 페이지 확인 시작..."
echo "Base URL: $BASE_URL"
echo ""

# 공개 페이지
echo "📄 공개 페이지 확인:"
echo "-------------------"

check_page() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$status" = "$expected_status" ] || [ "$status" = "302" ] || [ "$status" = "307" ]; then
        echo -e "${GREEN}✅${NC} $name: $status"
    else
        echo -e "${RED}❌${NC} $name: $status (예상: $expected_status)"
    fi
}

# 공개 페이지
check_page "$BASE_URL/" "루트 페이지"
check_page "$BASE_URL/login" "로그인 페이지"
check_page "$BASE_URL/signup" "회원가입 페이지"

echo ""
echo "📄 인증 필요 페이지 확인:"
echo "-------------------"
echo -e "${YELLOW}⚠️${NC}  인증이 필요하므로 302/307 리디렉션은 정상입니다"
echo ""

# 인증 필요 페이지 (리디렉션 예상)
check_page "$BASE_URL/dashboard" "대시보드"
check_page "$BASE_URL/settings" "설정 페이지"

echo ""
echo "✅ 확인 완료!"
echo ""
echo "💡 팁:"
echo "   - 로그인 후 브라우저에서 직접 확인하는 것을 권장합니다"
echo "   - 동적 라우트 (/org/[orgId], /center/[centerId])는 실제 ID가 필요합니다"

