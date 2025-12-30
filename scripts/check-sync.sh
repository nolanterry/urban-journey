#!/bin/bash
#
# Script to check if local and remote branches are in sync
# Usage: ./scripts/check-sync.sh

set -e

BRANCH="portal-brain-v1"
REMOTE="origin"

echo "🔍 Checking git sync status..."
echo ""

# Fetch latest from remote
git fetch "$REMOTE" "$BRANCH" > /dev/null 2>&1 || {
  echo "❌ Error: Could not fetch from remote"
  exit 1
}

# Get commit hashes
LOCAL=$(git rev-parse "$BRANCH" 2>/dev/null || {
  echo "❌ Error: Local branch '$BRANCH' does not exist"
  exit 1
})

REMOTE_REF=$(git rev-parse "$REMOTE/$BRANCH" 2>/dev/null || {
  echo "❌ Warning: Remote branch '$REMOTE/$BRANCH' does not exist (new branch)"
  exit 0
})

BASE=$(git merge-base "$BRANCH" "$REMOTE/$BRANCH" 2>/dev/null || {
  echo "⚠️  Warning: Branches have no common ancestor (unrelated histories)"
  exit 1
})

# Compare
if [ "$LOCAL" = "$REMOTE_REF" ]; then
  echo "✅ Branches are in sync"
  echo "   Local:  $LOCAL"
  echo "   Remote: $REMOTE_REF"
  exit 0
elif [ "$LOCAL" = "$BASE" ]; then
  echo "⚠️  Local branch is BEHIND remote"
  echo "   Local:  $LOCAL"
  echo "   Remote: $REMOTE_REF"
  echo ""
  echo "   Run: git pull $REMOTE $BRANCH"
  exit 1
elif [ "$REMOTE_REF" = "$BASE" ]; then
  COMMITS_AHEAD=$(git rev-list --count "$REMOTE_REF".."$LOCAL")
  echo "✅ Local branch is AHEAD of remote ($COMMITS_AHEAD commits ahead)"
  echo "   Local:  $LOCAL"
  echo "   Remote: $REMOTE_REF"
  echo ""
  echo "   Safe to push: git push $REMOTE $BRANCH"
  exit 0
else
  COMMITS_AHEAD=$(git rev-list --count "$BASE".."$LOCAL")
  COMMITS_BEHIND=$(git rev-list --count "$BASE".."$REMOTE_REF")
  echo "❌ Branches have DIVERGED"
  echo "   Local is $COMMITS_AHEAD commits ahead"
  echo "   Remote is $COMMITS_BEHIND commits behind"
  echo ""
  echo "   Local:  $LOCAL"
  echo "   Remote: $REMOTE_REF"
  echo "   Base:   $BASE"
  echo ""
  echo "   To fix:"
  echo "   1. git pull $REMOTE $BRANCH --no-rebase"
  echo "   2. Resolve conflicts"
  echo "   3. git push $REMOTE $BRANCH"
  exit 1
fi
