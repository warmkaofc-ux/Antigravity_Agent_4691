# Moltbook Heartbeat Script
# Uses ASCII only to prevent PowerShell 5.1 parser/encoding issues
$ErrorActionPreference = "Stop"

# Ensure UTF8 output if possible, though we will stick to ASCII in code
if ([System.Console]::OutputEncoding -ne [System.Text.Encoding]::UTF8) {
    try { [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
}

$scriptPath = $PSScriptRoot
$credsPath = Join-Path $scriptPath "credentials.json"
$statePath = Join-Path $scriptPath "heartbeat-state.json"

if (-not (Test-Path $credsPath)) {
    Write-Error "Credentials not found at $credsPath. Please register first."
}

try {
    $creds = Get-Content $credsPath | ConvertFrom-Json
    $apiKey = $creds.api_key
    $agentName = $creds.agent_name
}
catch {
    Write-Error "Failed to parse credentials.json"
}

Write-Host "Moltbook Heartbeat for $agentName"

function Invoke-MoltbookApi {
    param (
        [string]$Uri,
        [string]$Method = "Get",
        [hashtable]$Body = $null
    )
    $headers = @{ Authorization = "Bearer $apiKey" }
    try {
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            Invoke-RestMethod -Uri $Uri -Method $Method -Headers $headers -ContentType "application/json" -Body $jsonBody
        }
        else {
            Invoke-RestMethod -Uri $Uri -Method $Method -Headers $headers
        }
    }
    catch {
        Write-Warning "API Call failed: $($_.Exception.Message)"
        return $null
    }
}

# 1. Check Status
Write-Host "Checking status..."
$statusUrl = "https://www.moltbook.com/api/v1/agents/status"
$status = Invoke-MoltbookApi -Uri $statusUrl

if ($status -and $status.status -eq "pending_claim") {
    Write-Warning "Agent is not claimed yet!"
    Write-Warning "Claim URL: $($status.claim_url)"
    # Exit if not claimed, as per skill instructions
    exit
}

# 2. Check DMs
Write-Host "Checking DMs..."
$dmUrl = "https://www.moltbook.com/api/v1/agents/dm/check"
$dmCheck = Invoke-MoltbookApi -Uri $dmUrl

if ($dmCheck -and $dmCheck.has_activity) {
    Write-Host "[!] You have DM activity!" -ForegroundColor Cyan
    Write-Host "    Pending Requests: $($dmCheck.requests.count)"
    Write-Host "    Unread Messages: $($dmCheck.messages.total_unread)"
}
else {
    Write-Host "    No new DMs."
}

# 3. Check Feed
Write-Host "Checking Feed..."
# Build URL safely
$feedUrl = "https://www.moltbook.com/api/v1/feed?sort=new&limit=5"
$feed = Invoke-MoltbookApi -Uri $feedUrl

if ($feed -and $feed.posts) {
    foreach ($post in $feed.posts) {
        Write-Host "    [$($post.submolt)] $($post.title) (by $($post.author.name))"
    }
}

# 4. Update State
try {
    $state = @{ lastMoltbookCheck = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ") }
    $state | ConvertTo-Json | Set-Content $statePath
}
catch {
    Write-Warning "Could not save heartbeat state."
}

Write-Host "Done."
