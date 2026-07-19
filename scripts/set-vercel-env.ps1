# Vercel env var bulk loader
# Run this AFTER 'vercel link' has been run in the project root.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/set-vercel-env.ps1
#
# This sets the v1 env vars across all 3 environments (Production, Preview, Development).
# Values that are blank (Telegram, Stripe, Gemini) are skipped — set those manually
# when you have the tokens.
#
# ⚠️ BEFORE RUNNING: open this file and replace the REPLACE_ME placeholders for
# SUPABASE_SERVICE_KEY and SUPABASE_ANON_KEY with real values from your Supabase
# project's API settings. Never commit the real values back to git.

$ErrorActionPreference = "Stop"

# Required env vars (Supabase + Firebase).
# IMPORTANT: secrets below are PLACEHOLDERS. The operator must replace
# SUPABASE_SERVICE_KEY and SUPABASE_ANON_KEY with real values from
# Supabase → Settings → API before running this script. Never commit
# real secrets to a public repo.
$envVars = @(
    @{ name = "SUPABASE_URL";                       value = "https://YOUR-PROJECT.supabase.co" },
    @{ name = "SUPABASE_SERVICE_KEY";               value = "REPLACE_ME_WITH_SUPABASE_SERVICE_KEY" },
    @{ name = "SUPABASE_ANON_KEY";                  value = "REPLACE_ME_WITH_SUPABASE_ANON_KEY" },
    @{ name = "VITE_FIREBASE_API_KEY";              value = "AIzaSyDVSndC4pI-W8z-2eCZkcCtrld79AwkUcM" },
    @{ name = "VITE_FIREBASE_AUTH_DOMAIN";          value = "klo-fullstack-66f70.firebaseapp.com" },
    @{ name = "VITE_FIREBASE_PROJECT_ID";           value = "klo-fullstack-66f70" },
    @{ name = "VITE_FIREBASE_STORAGE_BUCKET";       value = "klo-fullstack-66f70.firebasestorage.app" },
    @{ name = "VITE_FIREBASE_MESSAGING_SENDER_ID";  value = "97964985400" },
    @{ name = "VITE_FIREBASE_APP_ID";               value = "1:97964985400:web:e1326e408d2102d6462acd" },
    @{ name = "VITE_FIREBASE_MEASUREMENT_ID";       value = "G-N8BXY56CV2" },
    @{ name = "VITE_WHATSAPP_NUMBER";               value = "573243132500" },
    @{ name = "APP_URL";                            value = "https://karibbeanluxuryoperators.lat" }
)

# Verify vercel CLI is available
$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
    Write-Host "ERROR: 'vercel' CLI not found. Install with: npm install -g vercel" -ForegroundColor Red
    exit 1
}

# Verify linked to a project
if (-not (Test-Path ".vercel/project.json")) {
    Write-Host "ERROR: not linked to a Vercel project. Run 'vercel link' first." -ForegroundColor Red
    exit 1
}

# Set each var across all 3 environments
$envs = @("production", "preview", "development")
foreach ($v in $envVars) {
    foreach ($env in $envs) {
        Write-Host "Setting $($v.name) for $env..." -NoNewline
        # Use 'printf' via cmd to pass value cleanly through vercel's stdin prompt
        $value = $v.value
        $result = echo $value | vercel env add $v.name $env 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host $result
        }
    }
}

Write-Host ""
Write-Host "Done. Run 'vercel env ls' to verify all values are set." -ForegroundColor Green
Write-Host ""
Write-Host "Optional env vars to set manually (skipped because blank or sensitive):" -ForegroundColor Yellow
Write-Host "  - TELEGRAM_BOT_TOKEN       (from @BotFather)"
Write-Host "  - STRIPE_SECRET_KEY        (from Stripe dashboard, test mode)"
Write-Host "  - STRIPE_PUBLISHABLE_KEY   (from Stripe dashboard, test mode)"
Write-Host "  - GEMINI_API_KEY           (from Google AI Studio)"
Write-Host "  - SENDGRID_API_KEY         (optional for v1)"
Write-Host "  - GOOGLE_CLIENT_ID         (optional — Google Calendar sync)"
Write-Host "  - GOOGLE_CLIENT_SECRET     (optional — Google Calendar sync)"
