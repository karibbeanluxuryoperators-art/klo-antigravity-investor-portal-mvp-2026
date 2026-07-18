#!/usr/bin/env bash
# KLO Production Smoke Test
# Run: ./scripts/smoke.sh [BASE_URL]
# Default: https://klo-fullstack.vercel.app
#
# Exits 0 if all green, 1 if any red.

set -u

BASE_URL="${1:-https://klo-fullstack.vercel.app}"
FAILURES=0
TOTAL=0

# Each line: path|expected_status_1,expected_status_2,...
ENDPOINTS=(
  "/api/health|200"
  "/api/assets|200"
  "/api/assets?status=ACTIVE|200"
  "/api/suppliers/lookup?uid=smoke-test-no-such-user|200,500"
  "/|200"
)

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
NC=$'\033[0m'

echo
echo "=== KLO Smoke Test ==="
echo "Base: $BASE_URL"
echo

for spec in "${ENDPOINTS[@]}"; do
  path="${spec%%|*}"
  expected="${spec##*|}"

  TOTAL=$((TOTAL + 1))
  url="${BASE_URL}${path}"
  body=""
  status=""

  if command -v curl >/dev/null 2>&1; then
    out=$(curl -sS -o /tmp/klo_smoke_body -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")
    status="$out"
    body=$(cat /tmp/klo_smoke_body 2>/dev/null || echo "")
    rm -f /tmp/klo_smoke_body
  else
    echo "[FAIL] $path  curl not found" >&2
    FAILURES=$((FAILURES + 1))
    continue
  fi

  IFS=',' read -ra expects <<< "$expected"
  ok=0
  for e in "${expects[@]}"; do
    [ "$status" = "$e" ] && ok=1
  done

  if [ "$ok" -eq 1 ]; then
    printf "${GREEN}[PASS]${NC} %-30s %-6s  -> %s\n" "$path" "$status" "${body:0:120}"
  else
    printf "${RED}[FAIL]${NC} %-30s %-6s  -> %s\n" "$path" "$status" "${body:0:120}"
    FAILURES=$((FAILURES + 1))
  fi
done

echo
if [ "$FAILURES" -eq 0 ]; then
  printf "${GREEN}=== ALL GREEN ($TOTAL/$TOTAL) ===${NC}\n"
  exit 0
else
  printf "${RED}=== RED: $FAILURES of $TOTAL failed ===${NC}\n"
  exit 1
fi
