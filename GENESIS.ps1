#!/usr/bin/env pwsh
# GENESIS Delivery Script (Atomic / Non-Interactive)
# - Safety rails:
#   - Default push is non-force (`git push`)
#   - Force push requires `-ForcePush` (uses `--force-with-lease`)
#   - Self-destruct requires `-SelfDestruct`
#
# Usage examples:
#   pwsh ./GENESIS.ps1
#   pwsh ./GENESIS.ps1 -RepoUrl "https://github.com/<you>/<repo>.git" -ForcePush -SelfDestruct

[CmdletBinding()]
param(
    [string]$RepoUrl = "https://github.com/TUR1412/Shouwban.git",
    [string]$RepoDir = "Shouwban",
    [string]$CommitMessage = "feat(GOD-MODE):  Ultimate Evolution - Quark-level UI & Arch Upgrade",
    [switch]$ForcePush,
    [switch]$SelfDestruct,
    [switch]$SkipVerify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "缺少命令：$Name（请先安装并确保在 PATH 中）"
    }
}

Assert-Command "git"
Assert-Command "node"
Assert-Command "npm"

$startDir = (Get-Location).Path
$repoPath = $null

try {
    if (Test-Path (Join-Path $startDir ".git")) {
        $repoPath = $startDir
    } else {
        $target = Join-Path $startDir $RepoDir
        if (-not (Test-Path $target)) {
            git clone $RepoUrl $RepoDir
        }
        $repoPath = $target
    }

    Set-Location $repoPath
    git rev-parse --is-inside-work-tree | Out-Null

    if (-not $SkipVerify) {
        npm run verify
        npm test
    }

    git add .

    $status = git status --porcelain
    if (-not $status) {
        Write-Host "无变更：工作区已是最新状态。"
        return
    }

    try {
        git commit -m $CommitMessage
    } catch {
        throw "提交失败：请检查 Git 用户名/邮箱配置（git config user.name / user.email）以及 hooks。"
    }

    if ($ForcePush) {
        git push --force-with-lease
    } else {
        git push
    }

    if ($SelfDestruct) {
        Set-Location $startDir
        Remove-Item -Recurse -Force $repoPath
        Write-Host "Self-Destruct：已删除 $repoPath"
    }
} finally {
    Set-Location $startDir
}

