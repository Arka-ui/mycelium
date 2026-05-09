$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    if (-not (Get-Command nix -ErrorAction SilentlyContinue)) {
        Write-Host "nix not found on PATH. Install via WSL or use a Linux/macOS host."
        exit 2
    }

    Write-Host "[repro-verify] Build 1"
    nix build ".#relay" --out-link result-1
    if ($LASTEXITCODE -ne 0) { Write-Host "Build 1 failed"; exit 1 }

    Write-Host "[repro-verify] Build 2"
    nix build ".#relay" --out-link result-2 --rebuild
    if ($LASTEXITCODE -ne 0) { Write-Host "Build 2 failed"; exit 1 }

    $h1 = (Get-FileHash -Algorithm SHA256 result-1\bin\mycelium-relay).Hash
    $h2 = (Get-FileHash -Algorithm SHA256 result-2\bin\mycelium-relay).Hash

    Write-Host "Hash 1: $h1"
    Write-Host "Hash 2: $h2"

    if ($h1 -ne $h2) {
        Write-Host "REPRODUCIBILITY BROKEN"
        exit 1
    }

    Write-Host "OK: hashes match"
}
finally {
    Pop-Location
}
