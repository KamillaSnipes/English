#!/usr/bin/env bash
# Автопуш live/session.json на GitHub во время урока (запустить один раз перед занятием).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FILE="live/session.json"
echo "Слежу за $FILE — коммит и push при изменениях (Ctrl+C стоп)."
LAST=""
while true; do
  HASH="$(shasum -a 256 "$FILE" 2>/dev/null | awk '{print $1}')"
  if [[ "$HASH" != "$LAST" && -n "$HASH" ]]; then
    LAST="$HASH"
    git add "$FILE"
    if git diff --cached --quiet; then
      sleep 2
      continue
    fi
    git commit -m "live: update session $(date '+%Y-%m-%d %H:%M')" || true
    git push origin HEAD 2>/dev/null && echo "→ GitHub $(date '+%H:%M:%S')" || echo "push не удался — проверьте git/ssh"
  fi
  sleep 2
done
