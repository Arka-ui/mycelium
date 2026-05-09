$ErrorActionPreference = "Continue"

Push-Location "$PSScriptRoot"
try {
    if (Test-Path "build\packages\lustre\priv") {
        $dest = "build\dev\erlang\lustre"
        if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
        if (-not (Test-Path "$dest\priv")) {
            cmd /c mklink /J "$dest\priv" "$PSScriptRoot\build\packages\lustre\priv" 2>&1 | Out-Null
        }
    }

    & gleam build 2>&1 | Out-Null

    if (Test-Path "build\packages\lustre\priv") {
        $dest = "build\dev\erlang\lustre"
        if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
        if (-not (Test-Path "$dest\priv")) {
            cmd /c mklink /J "$dest\priv" "$PSScriptRoot\build\packages\lustre\priv" 2>&1 | Out-Null
        }
    }

    & gleam run -m mycelium
}
finally {
    Pop-Location
}
