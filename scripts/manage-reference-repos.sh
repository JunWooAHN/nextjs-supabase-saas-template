#!/bin/bash

# 참조용 리포지토리 관리 스크립트
# 프로젝트 루트에서 실행해야 합니다.

set -e

REF_REPOS_DIR="reference-repos"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REF_REPOS_PATH="$PROJECT_ROOT/$REF_REPOS_DIR"

# 리포지토리 목록 (배열 형식: URL|디렉토리명)
REPOS=(
  "https://github.com/JunWooAHN/commuting-react-supabase-app.git|commuting-react-supabase-app"
)

echo "📦 Reference Repositories Manager"
echo "=================================="
echo ""

# 디렉토리 생성
mkdir -p "$REF_REPOS_PATH"
cd "$REF_REPOS_PATH"

# 각 리포지토리 처리
for repo_info in "${REPOS[@]}"; do
  # 파이프로 구분된 정보 분리
  repo_url="${repo_info%%|*}"
  repo_name="${repo_info##*|}"
  repo_path="$REF_REPOS_PATH/$repo_name"
  
  if [ -d "$repo_path" ]; then
    echo "🔄 Updating $repo_name..."
    cd "$repo_path"
    
    # 현재 브랜치 확인
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    
    # 업데이트 시도 (main 또는 master 브랜치)
    if git pull origin main 2>/dev/null || git pull origin master 2>/dev/null; then
      echo "   ✅ Updated successfully"
    else
      echo "   ⚠️  Update failed (may be up to date or have conflicts)"
    fi
    
    cd "$REF_REPOS_PATH"
  else
    echo "📥 Cloning $repo_name..."
    if git clone "$repo_url" "$repo_name"; then
      echo "   ✅ Cloned successfully"
    else
      echo "   ❌ Clone failed"
      exit 1
    fi
  fi
  echo ""
done

echo "✅ Reference repositories management complete!"
echo ""
echo "📁 Location: $REF_REPOS_PATH"
echo "📖 See reference-repos/README.md for more information"

