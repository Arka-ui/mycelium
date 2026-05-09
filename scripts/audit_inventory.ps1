$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    $files = @(
        "sidecars/crypto_port/src/main.rs",
        "sidecars/iroh_port/src/main.rs",
        "sidecars/wasmedge_port/src/main.rs",
        "sidecars/surreal_port/src/main.rs",
        "sidecars/loro_port/src/main.rs",
        "sidecars/port_codec/src/lib.rs",
        "apps/core/src/mycelium/identity_server.gleam",
        "apps/core/src/mycelium/crypto_server.gleam",
        "apps/core/src/mycelium/network/pairing.gleam",
        "apps/core/src/mycelium/network/iroh_port.gleam",
        "apps/core/src/mycelium/network/peer_registry.gleam",
        "apps/core/src/mycelium/network/backpressure.gleam",
        "apps/core/src/mycelium/sync/sync_engine.gleam",
        "apps/core/src/mycelium/sync/compaction.gleam",
        "apps/core/src/mycelium/storage/at_rest.gleam",
        "apps/core/src/mycelium/storage/surreal_port.gleam",
        "apps/relay/src/main.rs",
        "proto/port.cddl",
        "proto/wire.cddl",
        "proto/plugin.wit",
        "plugins/manifest_schema.json",
        "docs/threat_model.md",
        "docs/protocols/port.md",
        "docs/protocols/wire.md",
        "docs/plugins/contract.md",
        "Cargo.lock"
    )

    $commit = "(no git repo)"
    if (Test-Path ".git") {
        try { $commit = & git rev-parse HEAD 2>$null } catch { }
    }

    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.AppendLine("# Audit inventory")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
    [void]$sb.AppendLine("Commit: $commit")
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("| File | SHA-256 | Size (B) |")
    [void]$sb.AppendLine("|---|---|---|")
    foreach ($f in $files) {
        if (Test-Path $f) {
            $h = (Get-FileHash -Algorithm SHA256 $f).Hash.ToLower()
            $sz = (Get-Item $f).Length
            [void]$sb.AppendLine("| $f | $h | $sz |")
        } else {
            [void]$sb.AppendLine("| $f | MISSING | 0 |")
        }
    }
    if (-not (Test-Path "docs/audit")) {
        New-Item -ItemType Directory -Path "docs/audit" -Force | Out-Null
    }
    $sb.ToString() | Out-File "docs/audit/inventory.md" -Encoding utf8
    "Wrote docs/audit/inventory.md ($((Get-Item docs/audit/inventory.md).Length) bytes)"
}
finally {
    Pop-Location
}
