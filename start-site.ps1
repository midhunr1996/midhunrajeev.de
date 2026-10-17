# Starts the portfolio server and makes it public, then prints the address.
#   Tailscale Funnel (permanent https://midhunrajeev.<tailnet>.ts.net) when Tailscale is signed in,
#   otherwise a Cloudflare Quick Tunnel (random address that changes on every start).
# Closing this window or pressing Ctrl+C takes the site offline.
param(
    [int]$Port = 8080,
    [ValidateSet('auto', 'tailscale', 'cloudflare')]
    [string]$Tunnel = 'auto'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$logDir = Join-Path $root 'logs'
$cloudflared = Join-Path $root 'bin\cloudflared.exe'
$tailscale = 'C:\Program Files\Tailscale\tailscale.exe'
$urlFile = Join-Path $root 'PUBLIC_URL.txt'
$localUrl = "http://127.0.0.1:$Port"
$tunnelPattern = 'https://[a-z0-9-]+\.trycloudflare\.com'

function Write-Step($message) { Write-Host "  $message" -ForegroundColor Cyan }

function Wait-ForServer {
    for ($i = 0; $i -lt 40; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { return $true }
        } catch { Start-Sleep -Milliseconds 250 }
    }
    return $false
}

# Returns this machine's Tailscale DNS name when Tailscale is installed and signed in, else $null.
function Get-TailscaleName {
    if (-not (Test-Path $tailscale)) { return $null }
    try { $status = & $tailscale status --json 2>$null | ConvertFrom-Json } catch { return $null }
    if ($status.BackendState -ne 'Running' -or -not $status.Self.DNSName) { return $null }
    return $status.Self.DNSName.TrimEnd('.')
}

function Start-TailscaleFunnel {
    $output = & $tailscale funnel --bg $Port 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw "Tailscale Funnel could not start:`n$output" }
    return "https://$(Get-TailscaleName)"
}

function Stop-TailscaleFunnel {
    & $tailscale funnel --https=443 off 2>&1 | Out-Null
}

function Start-CloudflareTunnel {
    if (-not (Test-Path $cloudflared)) { throw "cloudflared not found at $cloudflared" }
    $log = Join-Path $logDir 'tunnel.log'
    if (Test-Path $log) { Remove-Item $log }
    $process = Start-Process -FilePath $cloudflared -ArgumentList "tunnel --no-autoupdate --url $localUrl" -NoNewWindow -PassThru `
        -RedirectStandardOutput (Join-Path $logDir 'tunnel.out.log') -RedirectStandardError $log
    for ($i = 0; $i -lt 120; $i++) {
        $match = if (Test-Path $log) { Select-String -Path $log -Pattern $tunnelPattern | Select-Object -First 1 }
        if ($match) { return @{ Process = $process; Url = $match.Matches[0].Value } }
        Start-Sleep -Milliseconds 500
    }
    throw "Tunnel did not report a public URL. See $log"
}

# Keeps the laptop from sleeping while the site is online (the display may still turn off).
# Optional: a stale LIB variable (e.g. from an uninstalled Visual Studio) breaks Add-Type, so clear it
# for this process and carry on without keep-awake if compilation still fails.
$ES_CONTINUOUS = [uint32]'0x80000000'
$ES_SYSTEM_REQUIRED = [uint32]'0x00000001'
$keepAwake = $false
try {
    $env:LIB = $null
    Add-Type -Namespace Portfolio -Name Power -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
'@ -ErrorAction Stop
    $keepAwake = $true
} catch {
    Write-Warning 'Could not enable keep-awake; set Windows sleep to "Never" while the site is online.'
}

function Set-KeepAwake([bool]$enabled) {
    if (-not $keepAwake) { return }
    $flags = if ($enabled) { $ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED } else { $ES_CONTINUOUS }
    [Portfolio.Power]::SetThreadExecutionState($flags) | Out-Null
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is not installed or not on PATH.' }
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$mode = $Tunnel
if ($mode -eq 'auto') { $mode = if (Get-TailscaleName) { 'tailscale' } else { 'cloudflare' } }

$server = $null
$tunnelProcess = $null
try {
    Write-Host ''
    Write-Host 'Midhun Rajeev portfolio' -ForegroundColor White
    Write-Step "Starting web server on $localUrl"
    $env:PORT = "$Port"
    $server = Start-Process -FilePath 'node' -ArgumentList "`"$root\server\server.mjs`"" -NoNewWindow -PassThru `
        -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'server.err.log')
    if (-not (Wait-ForServer)) { throw "Web server did not respond. See $logDir\server.err.log" }

    if ($mode -eq 'tailscale') {
        Write-Step 'Opening Tailscale Funnel'
        $publicUrl = Start-TailscaleFunnel
        $note = 'This address is permanent.'
    } else {
        Write-Step 'Opening Cloudflare tunnel'
        $tunnel = Start-CloudflareTunnel
        $tunnelProcess = $tunnel.Process
        $publicUrl = $tunnel.Url
        $note = 'This address changes every time the script restarts.'
    }

    [System.IO.File]::WriteAllText($urlFile, $publicUrl)  # UTF-8 without BOM, unlike Set-Content in PS 5.1
    try { Set-Clipboard -Value $publicUrl } catch { }
    Set-KeepAwake $true

    Write-Host ''
    Write-Host '  Your site is live worldwide at:' -ForegroundColor Green
    Write-Host "  $publicUrl" -ForegroundColor Yellow
    Write-Host '  (copied to clipboard and saved to PUBLIC_URL.txt)'
    Write-Host ''
    Write-Host "  $note"
    Write-Host '  Keep this window open. Press Ctrl+C to take the site offline.'
    Write-Host ''

    while (-not $server.HasExited -and -not ($tunnelProcess -and $tunnelProcess.HasExited)) { Start-Sleep -Seconds 2 }
    if ($server.HasExited) { Write-Warning "Web server stopped. See $logDir\server.err.log" }
    if ($tunnelProcess -and $tunnelProcess.HasExited) { Write-Warning "Tunnel stopped. See $logDir\tunnel.log" }
} finally {
    Set-KeepAwake $false
    if ($mode -eq 'tailscale') { Stop-TailscaleFunnel }
    foreach ($process in @($tunnelProcess, $server)) {
        if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    }
    if (Test-Path $urlFile) { Remove-Item $urlFile -ErrorAction SilentlyContinue }
    Write-Host '  Site offline.' -ForegroundColor DarkGray
}
