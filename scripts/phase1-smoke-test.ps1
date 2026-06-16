<#
.SYNOPSIS
  Phase 1 security smoke tests for Orbyt CRM API routes.

.DESCRIPTION
  Runs anonymous HTTP checks against secured endpoints. No login cookies required.

  Two modes:
    Dev server (npm run dev):
      pwsh scripts/phase1-smoke-test.ps1

    Production build (npm run build; $env:NODE_ENV='production'; npm start):
      pwsh scripts/phase1-smoke-test.ps1 -ExpectProductionGuards

  Optional env vars (or pass as parameters):
    CRON_SECRET     - test cron auth (401 without header, 2xx when correct)
    DEV_API_SECRET  - test blockInProduction bypass on prod build

  Production site after deploy:
    pwsh scripts/phase1-smoke-test.ps1 -BaseUrl https://www.orbytservice.com -ExpectProductionGuards

  Browser checks (not automated here): login, Providers, Industries save extra, book-now flow.
#>

param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$ExpectProductionGuards,
  [string]$CronSecret = $env:CRON_SECRET,
  [string]$DevApiSecret = $env:DEV_API_SECRET
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")

$passed = 0
$failed = 0
$skipped = 0

function Write-Result {
  param([string]$Name, [bool]$Ok, [string]$Detail)
  if ($Ok) {
    $script:passed++
    Write-Host "  PASS  $Name" -ForegroundColor Green
  } else {
    $script:failed++
    Write-Host "  FAIL  $Name" -ForegroundColor Red
  }
  if ($Detail) {
    Write-Host "        $Detail" -ForegroundColor DarkGray
  }
}

function Write-Skip {
  param([string]$Name, [string]$Reason)
  $script:skipped++
  Write-Host "  SKIP  $Name" -ForegroundColor Yellow
  Write-Host "        $Reason" -ForegroundColor DarkGray
}

function Invoke-StatusCheck {
  param(
    [string]$Method = "GET",
    [string]$Path,
    [hashtable]$Headers = @{},
    [string]$Body = $null
  )

  $uri = "$BaseUrl$Path"
  $request = [System.Net.HttpWebRequest]::Create($uri)
  $request.Method = $Method
  $request.AllowAutoRedirect = $false

  foreach ($key in $Headers.Keys) {
    $request.Headers[$key] = [string]$Headers[$key]
  }

  if ($null -ne $Body -and $Method -notin @('GET', 'HEAD')) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
    $request.ContentType = "application/json"
    $request.ContentLength = $bytes.Length
    $stream = $request.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
  }

  try {
    $response = $request.GetResponse()
    $status = [int]$response.StatusCode
    $response.Close()
    return $status
  } catch [System.Net.WebException] {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    throw "Request failed for $Method $uri - $($_.Exception.Message)"
  }
}

function Test-Status {
  param(
    [string]$Name,
    [string]$Method = "GET",
    [string]$Path,
    [hashtable]$Headers = @{},
    [string]$Body = $null,
    [int[]]$Expected
  )

  $invokeParams = @{
    Method  = $Method
    Path    = $Path
    Headers = $Headers
  }
  if ($PSBoundParameters.ContainsKey('Body') -and $null -ne $Body) {
    $invokeParams.Body = $Body
  }
  $status = Invoke-StatusCheck @invokeParams
  $expectedText = ($Expected | Sort-Object -Unique) -join " or "
  $ok = $Expected -contains $status
  Write-Result -Name $Name -Ok $ok -Detail "got $status, expected $expectedText"
}

Write-Host ""
Write-Host "Phase 1 smoke tests" -ForegroundColor Cyan
Write-Host "  Base URL:              $BaseUrl"
Write-Host "  Production guards:     $(if ($ExpectProductionGuards) { 'yes (test routes should 404)' } else { 'no (dev - test routes may respond)' })"
Write-Host ""

Write-Host "1. Auth required (anonymous requests)" -ForegroundColor Cyan

Test-Status -Name "GET /api/admin/providers" `
  -Path "/api/admin/providers" `
  -Expected @(401)

Test-Status -Name "POST /api/extras" `
  -Method POST `
  -Path "/api/extras" `
  -Body "{}" `
  -Expected @(401)

Test-Status -Name "POST /api/pricing-parameters" `
  -Method POST `
  -Path "/api/pricing-parameters" `
  -Body "{}" `
  -Expected @(401)

Test-Status -Name "POST /api/form2/extras" `
  -Method POST `
  -Path "/api/form2/extras" `
  -Body "{}" `
  -Expected @(401)

Test-Status -Name "POST /api/admin/fix-providers" `
  -Method POST `
  -Path "/api/admin/fix-providers" `
  -Body "{}" `
  -Expected $(if ($ExpectProductionGuards) { @(404, 401) } else { @(401) })

Write-Host ""
Write-Host "2. Test / debug routes (blockInProduction)" -ForegroundColor Cyan

if ($ExpectProductionGuards) {
  Test-Status -Name "GET /api/test-env blocked" `
    -Path "/api/test-env" `
    -Expected @(404)

  Test-Status -Name "GET /api/test-db blocked" `
    -Path "/api/test-db" `
    -Expected @(404)

  Test-Status -Name "GET /api/test-email blocked" `
    -Path "/api/test-email" `
    -Expected @(404)

  if ($DevApiSecret) {
    Test-Status -Name "GET /api/test-env with DEV_API_SECRET bypass" `
      -Path "/api/test-env" `
      -Headers @{ Authorization = "Bearer $DevApiSecret" } `
      -Expected @(200)
  } else {
    Write-Skip -Name "DEV_API_SECRET bypass" -Reason "Set DEV_API_SECRET env var to test bypass"
  }
} else {
  $testEnvStatus = Invoke-StatusCheck -Path "/api/test-env"
  $notBlocked = $testEnvStatus -ne 404
  Write-Result -Name "GET /api/test-env reachable in dev (not 404)" -Ok $notBlocked -Detail "got $testEnvStatus"
  Write-Host "        (In dev this is expected. Use -ExpectProductionGuards after npm start with NODE_ENV=production.)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "3. Cron endpoint" -ForegroundColor Cyan

if ($CronSecret) {
  Test-Status -Name "POST /api/cron/auto-complete-bookings (no auth)" `
    -Method POST `
    -Path "/api/cron/auto-complete-bookings" `
    -Expected @(401)

  Test-Status -Name "POST /api/cron/auto-complete-bookings (wrong secret)" `
    -Method POST `
    -Path "/api/cron/auto-complete-bookings" `
    -Headers @{ Authorization = "Bearer wrong-secret" } `
    -Expected @(401)

  $cronOkStatus = Invoke-StatusCheck -Method POST -Path "/api/cron/auto-complete-bookings" `
    -Headers @{ Authorization = "Bearer $CronSecret" }
  $cronOk = $cronOkStatus -ge 200 -and $cronOkStatus -lt 300
  Write-Result -Name "POST /api/cron/auto-complete-bookings (correct secret)" -Ok $cronOk -Detail "got $cronOkStatus, expected 2xx"
} else {
  if ($ExpectProductionGuards) {
    Test-Status -Name "POST /api/cron/auto-complete-bookings (no auth, prod)" `
      -Method POST `
      -Path "/api/cron/auto-complete-bookings" `
      -Expected @(401, 500)
    Write-Skip -Name "Cron secret match test" -Reason "Set CRON_SECRET env var to verify 2xx with correct header"
  } else {
    Write-Skip -Name "Cron auth tests" -Reason "Set CRON_SECRET in .env or pass -CronSecret to test cron auth"
  }
}

Write-Host ""
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "  Passed:  $passed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "White" })
Write-Host "  Failed:  $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "White" })
Write-Host "  Skipped: $skipped" -ForegroundColor Yellow
Write-Host ""
Write-Host "Manual browser checks (logged in):" -ForegroundColor Cyan
Write-Host "  - Admin -> Providers (list + invite)"
Write-Host "  - Settings -> Industries -> save an extra"
Write-Host "  - Book-now on demo tenant (guest flow)"
Write-Host ""

if ($failed -gt 0) {
  exit 1
}
