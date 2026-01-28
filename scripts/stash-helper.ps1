# PowerShell helper to locate Stash configuration directory.

$ErrorActionPreference = "Stop"

function Invoke-StashGraphQL {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri
    )

    $query = @{
        query = "query SystemStatus { systemStatus { configPath } }"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Method Post -Uri $Uri -Body $query -ContentType "application/json" -TimeoutSec 2
    } catch {
        return $null
    }

    $configPath = $response.data.systemStatus.configPath
    if ([string]::IsNullOrWhiteSpace($configPath)) {
        return $null
    }

    return $configPath
}

function Get-StashConfigPathFromRunningProcess {
    $process = $null
    try {
        $process = Get-Process -Name "stash" -ErrorAction Stop | Select-Object -First 1
    } catch {
        return $null
    }

    if ($null -eq $process) {
        return $null
    }

    $defaultUri = "http://localhost:9999/graphql"
    $configPath = Invoke-StashGraphQL -Uri $defaultUri
    if ($configPath) {
        return $configPath
    }

    $ports = @()
    try {
        $connections = Get-NetTCPConnection -OwningProcess $process.Id -State Listen -ErrorAction Stop
        $ports = $connections | Select-Object -ExpandProperty LocalPort -Unique
    } catch {
        return $null
    }

    foreach ($port in $ports | Sort-Object -Unique) {
        if ($port -eq 9999) {
            continue
        }

        $configPath = Invoke-StashGraphQL -Uri "http://localhost:$port/graphql"
        if ($configPath) {
            return $configPath
        }
    }

    return $null
}

function Get-StashConfigDirectory {
    $configPath = Get-StashConfigPathFromRunningProcess
    if ($configPath) {
        return Split-Path -Parent $configPath
    }

    $localConfig = Join-Path -Path (Get-Location) -ChildPath "config.yml"
    if (Test-Path -Path $localConfig) {
        return Split-Path -Parent $localConfig
    }

    $userProfile = [Environment]::GetFolderPath("UserProfile")
    return Join-Path -Path $userProfile -ChildPath ".stash"
}

$stashDir = Get-StashConfigDirectory
if ($stashDir) {
    Write-Output $stashDir
}
