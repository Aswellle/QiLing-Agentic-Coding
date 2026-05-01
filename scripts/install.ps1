# 启灵 (QiLing) Windows 安装脚本
# 用法: irm https://raw.githubusercontent.com/YOUR_USER/qiling/main/scripts/install.ps1 | iex
# 或:   .\install.ps1 [-Version v0.2.0] [-InstallDir C:\Tools]

[CmdletBinding()]
param(
    [string]$Version = "",
    [string]$InstallDir = "$env:LOCALAPPDATA\qiling\bin",
    [string]$Repo = "YOUR_GITHUB_USER/qiling"
)

$ErrorActionPreference = "Stop"
$BinaryName = "qiling.exe"
$Artifact = "qiling-windows-x64.exe"

function Write-Info   { Write-Host "→ $args" -ForegroundColor Cyan }
function Write-Ok     { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Warn   { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Err    { Write-Host "✗ $args" -ForegroundColor Red; exit 1 }

# ─── 获取最新版本 ──────────────────��─────────────────────────────────────
if (-not $Version) {
    Write-Info "获取最新版本信息..."
    try {
        $ApiUrl = "https://api.github.com/repos/$Repo/releases/latest"
        $Headers = @{ "User-Agent" = "qiling-installer" }
        $Release = Invoke-RestMethod -Uri $ApiUrl -Headers $Headers
        $Version = $Release.tag_name
        if (-not $Version) { Write-Err "无法获取版本信息，请手动指定: -Version v0.2.0" }
    } catch {
        Write-Err "网络请求失败: $_"
    }
}

Write-Info "安装 QiLing $Version (Windows x64)..."

# ─── 下载 ─────────────────────────────────────────���──────────────────────
$DownloadUrl = "https://github.com/$Repo/releases/download/$Version/$Artifact"
$TempFile = [System.IO.Path]::GetTempFileName() + ".exe"

try {
    Write-Info "下载 $DownloadUrl ..."
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempFile -UseBasicParsing
    $ProgressPreference = "Continue"
} catch {
    Write-Err "下载失败: $_`n  URL: $DownloadUrl"
}

# ─── 验证 ──────────────────────────��─────────────────────────────────────
try {
    $InstalledVersion = & $TempFile --version 2>$null
    if (-not $InstalledVersion) { Write-Err "二进制文件验证失败" }
} catch {
    Write-Err "无法运行下载的二进制文件: $_"
}

# ─── 安装 ───────────────��──────────────────────────��─────────────────────
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$TargetPath = Join-Path $InstallDir $BinaryName
Copy-Item -Path $TempFile -Destination $TargetPath -Force
Remove-Item -Path $TempFile -Force

Write-Ok "已安装: $TargetPath"

# ─── PATH 设置 ────────────────────────────────────────────────────────────
$UserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$IsInPath = $UserPath -split ";" | Where-Object { $_ -eq $InstallDir }

if (-not $IsInPath) {
    Write-Warn "$InstallDir 不在 PATH 中"

    $Reply = Read-Host "  是否自动添加到用户 PATH? [Y/n]"
    if ($Reply -eq "" -or $Reply -match "^[Yy]") {
        $NewPath = "$UserPath;$InstallDir"
        [Environment]::SetEnvironmentVariable("PATH", $NewPath, "User")
        $env:PATH = "$env:PATH;$InstallDir"
        Write-Ok "已添加到 PATH（当前 PowerShell 会话已生效）"
        Write-Info "新的终端窗口中即可直接运行 qiling"
    } else {
        Write-Warn "请手动将以下路径添加到系统 PATH:"
        Write-Host "  $InstallDir" -ForegroundColor Yellow
    }
} else {
    Write-Ok "PATH 已正确配置"
}

# ─── 完成 ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "✨ QiLing $InstalledVersion 安装完成！" -ForegroundColor Green
Write-Host ""
Write-Host "  在任意目录运行:  qiling"
Write-Host "  查看帮助:        qiling --help"
Write-Host "  查看版本:        qiling --version"
Write-Host ""
