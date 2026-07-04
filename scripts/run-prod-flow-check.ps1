param(
    [string]$BaseUrl = "https://api.poyyathabailgcc.com",
    [string]$MemberLogin = "",
    [string]$MemberPassword = "",
    [string]$AdminLogin = "",
    [string]$AdminPassword = "",
    [switch]$WriteTests
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd('/')

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [string]$Token = ""
    )

    $uri = "$BaseUrl$Path"
    $headers = @{}
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    try {
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 10
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -ContentType "application/json" -Body $json -UseBasicParsing
        }
        else {
            $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -UseBasicParsing
        }

        $parsed = $null
        if ($resp.Content) {
            try { $parsed = $resp.Content | ConvertFrom-Json } catch { $parsed = $resp.Content }
        }

        return [pscustomobject]@{
            Status = [int]$resp.StatusCode
            Body = $parsed
            Raw = $resp.Content
        }
    }
    catch {
        $status = 0
        $raw = ""
        $parsed = $null

        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode.value__
            try {
                $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $raw = $sr.ReadToEnd()
                try { $parsed = $raw | ConvertFrom-Json } catch { $parsed = $raw }
            }
            catch {}
        }

        return [pscustomobject]@{
            Status = $status
            Body = $parsed
            Raw = $raw
        }
    }
}

function Assert-Ok {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Login {
    param(
        [string]$Username,
        [string]$Password,
        [string]$Label
    )

    $res = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
        username = $Username
        password = $Password
    }

    Assert-Ok ($res.Status -eq 200) "$Label login failed (status=$($res.Status)): $($res.Raw)"
    $token = $res.Body.access_token
    Assert-Ok ([string]::IsNullOrWhiteSpace($token) -eq $false) "$Label login returned no access_token"

    Write-Host "[OK] $Label login" -ForegroundColor Green
    return $token
}

if ([string]::IsNullOrWhiteSpace($MemberLogin)) { $MemberLogin = Read-Host "Member username" }
if ([string]::IsNullOrWhiteSpace($MemberPassword)) { $MemberPassword = Read-Host "Member password" }
if ([string]::IsNullOrWhiteSpace($AdminLogin)) { $AdminLogin = Read-Host "Admin username" }
if ([string]::IsNullOrWhiteSpace($AdminPassword)) { $AdminPassword = Read-Host "Admin password" }

Write-Host "==============================================================="
Write-Host "Live Production Flow Check"
Write-Host "Base URL: $BaseUrl"
if ($WriteTests) {
    Write-Host "Mode: WRITE TESTS (creates data)"
}
else {
    Write-Host "Mode: SAFE CHECK (no writes)"
}
Write-Host "==============================================================="

# 1) Health
$health = Invoke-Api -Method "GET" -Path "/health"
Assert-Ok ($health.Status -eq 200) "Health check failed (status=$($health.Status)): $($health.Raw)"
Write-Host "[OK] Health endpoint" -ForegroundColor Green

# 2) Logins
$memberToken = Login -Username $MemberLogin -Password $MemberPassword -Label "Member"
$adminToken = Login -Username $AdminLogin -Password $AdminPassword -Label "Admin"

# 3) Read checks (safe)
$memberMe = Invoke-Api -Method "GET" -Path "/members/me" -Token $memberToken
Assert-Ok ($memberMe.Status -eq 200) "GET /members/me failed (status=$($memberMe.Status)): $($memberMe.Raw)"
Write-Host "[OK] Member profile fetch" -ForegroundColor Green

$payable = Invoke-Api -Method "GET" -Path "/challans/payable-months" -Token $memberToken
Assert-Ok ($payable.Status -eq 200) "GET /challans/payable-months failed (status=$($payable.Status)): $($payable.Raw)"
Write-Host "[OK] Challan payable months fetch" -ForegroundColor Green

$myRequests = Invoke-Api -Method "GET" -Path "/requests/?skip=0&limit=5" -Token $memberToken
Assert-Ok ($myRequests.Status -eq 200) "GET /requests/ failed (status=$($myRequests.Status)): $($myRequests.Raw)"
Write-Host "[OK] Member requests fetch" -ForegroundColor Green

$adminRequests = Invoke-Api -Method "GET" -Path "/admin/requests/?skip=0&limit=5" -Token $adminToken
Assert-Ok ($adminRequests.Status -eq 200) "GET /admin/requests/ failed (status=$($adminRequests.Status)): $($adminRequests.Raw)"
Write-Host "[OK] Admin requests fetch" -ForegroundColor Green

if (-not $WriteTests) {
    Write-Host ""
    Write-Host "SAFE CHECK PASSED (no data created)." -ForegroundColor Cyan
    Write-Host "Use -WriteTests to validate actual profile/challan creation flow." -ForegroundColor Yellow
    exit 0
}

# 4) Write test: profile update request + admin approve
$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$newPhone = "90000$((Get-Random -Minimum 10000 -Maximum 99999))"

$createReq = Invoke-Api -Method "POST" -Path "/requests/" -Token $memberToken -Body @{
    request_type = "profile_update"
    subject = "Smoke profile update $stamp"
    message = "Smoke test for live profile update flow"
    requested_changes = @{ phone = $newPhone }
}
Assert-Ok (($createReq.Status -eq 200) -or ($createReq.Status -eq 201)) "POST /requests/ profile_update failed (status=$($createReq.Status)): $($createReq.Raw)"

$requestId = $createReq.Body.id
Assert-Ok ($requestId -ne $null) "Profile update request created but id missing"
Write-Host "[OK] Profile update request created (id=$requestId)" -ForegroundColor Green

$approve = Invoke-Api -Method "PATCH" -Path "/requests/$requestId/approve" -Token $adminToken -Body @{
    admin_response = "Approved by smoke test"
}
if ($approve.Status -eq 404 -or $approve.Status -eq 405) {
    $approve = Invoke-Api -Method "PUT" -Path "/requests/$requestId" -Token $adminToken -Body @{
        status = "approved"
        admin_response = "Approved by smoke test"
    }
}
Assert-Ok (($approve.Status -eq 200) -or ($approve.Status -eq 201)) "Approve profile update failed (status=$($approve.Status)): $($approve.Raw)"
Write-Host "[OK] Profile update request approved" -ForegroundColor Green

# 5) Write test: challan bulk create with one month
$memberId = $memberMe.Body.id
if (-not $memberId -and $memberMe.Body.member_id) { $memberId = $memberMe.Body.member_id }
$pendingMonths = @()
if ($payable.Body.pending_months) { $pendingMonths = @($payable.Body.pending_months) }
$targetMonth = if ($pendingMonths.Count -gt 0) { [string]$pendingMonths[0] } else { [string](Get-Date).ToString('yyyy-MM') }

$monthlyAmount = 0
if ($memberMe.Body.monthly_amount) { $monthlyAmount = [double]$memberMe.Body.monthly_amount }
if ($monthlyAmount -le 0) { $monthlyAmount = 1 }

$challanPayload = @{
    months = @($targetMonth)
    amount_per_month = $monthlyAmount
    proof_file_id = "https://example.com/smoke-proof-$stamp.png"
}
if ($memberId) { $challanPayload.member_id = $memberId }

$bulkCreate = Invoke-Api -Method "POST" -Path "/challans/bulk-create" -Token $memberToken -Body $challanPayload
Assert-Ok (($bulkCreate.Status -eq 200) -or ($bulkCreate.Status -eq 201)) "POST /challans/bulk-create failed (status=$($bulkCreate.Status)): $($bulkCreate.Raw)"
Write-Host "[OK] Challan bulk-create succeeded for month $targetMonth" -ForegroundColor Green

Write-Host ""
Write-Host "WRITE TEST PASSED. Profile update and challan generation are working in live production." -ForegroundColor Cyan
