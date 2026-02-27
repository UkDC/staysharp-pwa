#!/bin/bash
# StaySharp Deploy Script
# Usage: ./deploy.sh "описание изменений"

set -e

cd "$(dirname "$0")"

MSG="${1:-update}"
TIMESTAMP=$(date +%s)

# Update cache/build versions (iOS-friendly cache busting)
sed -E -i '' "s|(const CACHE_VERSION = ')[^']+(';)|\\1$TIMESTAMP\\2|" sw.js
sed -E -i '' "s|(href=\"css/style\\.css\\?v=)[0-9]+(\")|\\1$TIMESTAMP\\2|" index.html
sed -E -i '' "s|(src=\"js/app\\.js\\?v=)[0-9]+(\")|\\1$TIMESTAMP\\2|" index.html

# Commit & push
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
  exit 0
fi
git commit -m "$MSG"
git push

echo ""
echo "✅ Deployed! build=$TIMESTAMP"
