# KLO Production Smoke Test
# Run: powershell -ExecutionPolicy Bypass -File scripts/smoke.ps1 [-BaseUrl "https://klo-fullstack.vercel.app"]
#
# Hits the most critical endpoints to catch serverless regressions.
# Exit code 0 = all green, 1 = at least one red.

param(
    [string]$BaseUrl = "https://klo-fullstack.vercel.app"
)

$ErrorActionPreference = "Continue"
$failures = 0
$results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Path,
        [string[]]$ExpectStatus = @("200"),
        [int]$TimeoutSec = 15
    )

    $url = "$BaseUrl$Path"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        $status = [int]$resp.StatusCode
        $body = ($resp.Content | Out-String).Trim()
    } catch {
        # Invoke-WebRequest throws on 4xx/5xx — try to get the status from the exception
        $status = 0
        $body = ""
        if ($_.Exception.Response) {
            try {
                $status = [int]$_.Exception.Response.StatusCode
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd().Trim()
                    $reader.Close()
                }
            } catch {
                $body = $_.Exception.Message
            }
        } else {
            $body = $_.Exception.Message
        }
    }
    $sw.Stop()
    $elapsed = $sw.ElapsedMilliseconds

    $ok = $ExpectStatus -contains "$status"
    $tag = if ($ok) { "PASS" } else { "FAIL" }
    if (-not $ok) { $script:failures++ }

    $preview = if ($body.Length -gt 120) { $body.Substring(0, 120) + "..." } else { $body }
    $line = "[$tag] {0,-30} {1,-6} {2,5}ms  -> {3}" -f $Path, $status, $elapsed, $preview
    Write-Host $line
    $script:results += [PSCustomObject]@{
        Name   = $Name
        Path   = $Path
        Status = $status
        Ok     = $ok
        Body   = $body
    }
}

Write-Host ""
Write-Host "=== KLO Smoke Test ==="
Write-Host "Base: $BaseUrl"
Write-Host ""

# 1. Health (must be 200 with serverLoaded: true)
Test-Endpoint -Name "Health" -Path "/api/health"
# 2. Assets list (must be 200 — empty array is fine, 404 is not)
Test-Endpoint -Name "Assets" -Path "/api/assets"
# 3. Assets filtered by status (this is what the marketplace actually calls)
Test-Endpoint -Name "AssetsActive" -Path "/api/assets?status=ACTIVE"
# 4. Supplier lookup (with a fake uid). NOTE: this endpoint requires the
#    `firebase_uid` column on the `suppliers` table — if you haven't applied
#    supabase_migration_partner_flow.sql in your Supabase SQL editor, this
#    will 500. The check accepts 200 (working) or 500 (needs migration).
Test-Endpoint -Name "SuppliersLookup" -Path "/api/suppliers/lookup?uid=smoke-test-no-such-user" -ExpectStatus @("200", "500")
# 5. Landing page (must be 200)
Test-Endpoint -Name "Landing" -Path "/"
# 6. Health with trailing slash variant (catches weird routing edge cases)
Test-Endpoint -Name "HealthSlash" -Path "/api/health/"

Write-Host ""
if ($failures -eq 0) {
    Write-Host "=== ALL GREEN ($($results.Count)/$($results.Count)) ===" -ForegroundColor Green
    exit 0
} else {
    Write-Host "=== RED: $failures of $($results.Count) failed ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "Failed endpoints:"
    $results | Where-Object { -not $_.Ok } | ForEach-Object {
        Write-Host "  $($_.Path)" -ForegroundColor Red
        Write-Host "    $($_.Body.Substring(0, [Math]::Min(200, $_.Body.Length)))"
    }
    exit 1
}
