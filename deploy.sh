#!/bin/bash
# StaySharp Deploy Script
# Usage: ./deploy.sh "описание изменений"

cd "$(dirname "$0")"

MSG="${1:-update}"
TIMESTAMP=$(date +%s)

# Inject build timestamp into SW for automatic cache busting
sed -i '' "s/__BUILD_TIME__/$TIMESTAMP/" sw.js

# Commit & push
git add -A
git commit -m "$MSG"
git push

# Restore placeholder for next deploy
sed -i '' "s/$TIMESTAMP/__BUILD_TIME__/" sw.js

echo ""
echo "✅ Deployed! iPhone обновится автоматически при следующем открытии."
