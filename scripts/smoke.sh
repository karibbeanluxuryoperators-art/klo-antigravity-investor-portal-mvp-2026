#!/usr/bin/env bash
# KLO Production Smoke Test (Linux/macOS)
# Run: bash scripts/smoke.sh [BASE_URL]
# Default base: https://klo-fullstack.vercel.app
# Exit code 0 = all green, 1 = at least one red.

set -u

BASE_URL="${1:-https://klo-fullstack.vercel.app}"
FAILURES=0
RESULTS=()

# Colors (no-op if not a tty)
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'
else
  RED=''; GREEN=''; NC=''
fi

test_endpoint() {
  local name="$1"
  local path="$2"
  local expect="${3:-200}"
  local url="${BASE_URL}${path}"

  # Capture status + body
  local response
  response=$(curl -s -w "\n%{http_code}" --max-time 15 "$url" 2>/dev/null)
  local status=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  # Trim long bodies
  local preview="$body"
  if [ "${#preview}" -gt 120 ]; then
    preview="${preview:0:120}..."
  fi

  # Check if status is in expected
  if echo ",$expect," | grep -q ",$status,"; then
    echo -e "[PASS] ${path} ${status} -> ${preview}"
  else
    echo -e "[FAIL] ${path} ${status} (expected $expect) -> ${preview}"
    FAILURES=$((FAILURES+1))
  fi
  RESULTS+=("$path=$status")
}

echo ""
echo "=== KLO Smoke Test ==="
echo "Base: $BASE_URL"
echo ""

# Same 6 checks as the PowerShell version
test_endpoint "Health"         "/api/health"                                "200"
test_endpoint "Assets"         "/api/assets"                                "200"
test_endpoint "AssetsActive"   "/api/assets?status=ACTIVE"                  "200"
test_endpoint "SuppliersLookup" "/api/suppliers/lookup?uid=smoke-test-no-such-user" "200,500"
test_endpoint "Landing"        "/"                                          "200"
test_endpoint "HealthSlash"    "/api/health/"                               "200"

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}=== ALL GREEN (6/6) ===${NC}"
  exit 0
else
  echo -e "${RED}=== RED: $FAILURES of 6 failed ===${NC}"
  exit 1
fi
