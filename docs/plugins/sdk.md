# Plugin SDK Reference

**Version:** 0.1.0
**Status:** M2 — runtime is M2 work; the SDK skeleton ships in M0 so authors can start designing against the WIT contract today.
**Crate:** [`mycelium_plugin_sdk`](../../plugins/sdk/) (MIT-licensed, separate from the AGPL application core).
**Audience:** plugin authors writing in Rust.

This document is the canonical reference for writing Mycelium plugins in Rust. Authors targeting other Wasm-producing languages (Go, AssemblyScript, Zig, C, Swift) generate bindings directly from `proto/plugin.wit`; the patterns below translate.

## Quick start (post-M2)

```bash
# Scaffold a new plugin
cargo new --lib my_plugin
cd my_plugin

# Add the SDK
cargo add mycelium_plugin_sdk
cargo add wit-bindgen

# Compile to wasm32-wasi
rustup target add wasm32-wasi
cargo build --release --target wasm32-wasi
```

Then sign and bundle with the `mycelium-cli`:

```bash
mycelium-cli plugin sign \
    --wasm target/wasm32-wasi/release/my_plugin.wasm \
    --manifest manifest.json \
    --key ~/.config/mycelium/author.key \
    --output my_plugin.myplug
```

## The WIT contract

The single source of truth is `proto/plugin.wit`. The SDK re-exports the bindings via `wit-bindgen`. Authors do not edit the WIT directly; they implement the `plugin` world.

## Anatomy of a Rust plugin

```rust
use mycelium_plugin_sdk::prelude::*;

// The host calls activate() once after capability negotiation succeeds.
#[no_mangle]
pub extern "C" fn activate() -> Result<(), PluginError> {
    let ctx = Context::current();
    ctx.subscribe(EventKind::NodeCreated)?;
    Ok(())
}

#[no_mangle]
pub extern "C" fn on_event(ev: Event) -> Result<(), PluginError> {
    if ev.kind == EventKind::NodeCreated {
        if let Some(id) = ev.node_id {
            // ... do something with the new node
        }
    }
    Ok(())
}
```

The actual macro surface (`#[plugin_main]`, `#[on_event]`, `#[on_command]`, `#[render_block]`) is provided by the SDK in M2 to remove boilerplate. The above is the desugared form to make the contract concrete.

## Manifest authoring

A manifest is a JSON file matching `plugins/manifest_schema.json`. Minimal example for a hook plugin:

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "display_name": "My Plugin",
  "description": "Does a useful thing on every new node.",
  "license": "MIT",
  "author": {
    "name": "Your Name",
    "key": "ed25519:<your-public-key-base64>"
  },
  "wasm_hash": "blake3:<filled-in-by-mycelium-cli-sign>",
  "wit_version": "0.1.0",
  "capabilities": [
    {
      "kind": "events",
      "events": ["node-created"]
    },
    {
      "kind": "subgraph",
      "filter": "kind = 'note'",
      "write": false
    }
  ],
  "signature": "<filled-in-by-mycelium-cli-sign>"
}
```

The `wasm_hash` and `signature` fields are filled in by `mycelium-cli plugin sign`.

## Capabilities in the SDK

Each capability surface in the WIT becomes a Rust module in the SDK:

| WIT interface | Rust module | Available when |
|---|---|---|
| `graph::query`, `get`, `create`, `update` | `mycelium_plugin_sdk::graph` | `subgraph` capability granted |
| `events::subscribe`, `unsubscribe` | `mycelium_plugin_sdk::events` | `events` capability granted |
| `kv::get`, `set`, `delete`, `list_keys` | `mycelium_plugin_sdk::kv` | `kv` capability granted |
| `http::fetch` | `mycelium_plugin_sdk::http` | `http` capability granted |

Calling a function from a module whose capability was not granted returns `PluginError::CapabilityDenied(...)`.

## Testing

Plugins can be tested in two modes:

1. **Unit tests** — write your business logic in plain Rust, mock the host calls. The SDK provides `mycelium_plugin_sdk::testing::MockHost` (M2) for this.
2. **Integration** — run inside a real `wasmedge_port` sidecar, pointed at a test instance of Mycelium. The `mycelium-cli plugin run` subcommand instantiates the plugin against a fresh in-memory database (M2).

## Signing keys

Plugin signing uses Ed25519. Authors generate a key once:

```bash
mycelium-cli plugin keygen --output ~/.config/mycelium/author.key
```

Keep the private key safe. The public key (printed by the keygen command) is what users will see in the install prompt — pin a stable public key per author identity.

## Distribution

Three distribution channels:

1. **Local file** — share `your-plugin.myplug` directly. The user opens it; Mycelium prompts for capability approval.
2. **URL** — host the `.myplug` on any HTTP server. The user pastes the URL into Mycelium's plugin install dialog. Mycelium downloads, verifies, and prompts.
3. **Community plugin index** (M4) — a curated index. Submission process documented in M4.

In all three cases, the signature + hash are verified before the user sees the install prompt.

## Updates

Plugins do not auto-update by default. The user is prompted when an update is available. A plugin author publishing an update keeps the same `name` and `author.key`, bumps the `version` (SemVer 2.0.0), and re-signs.

The user MAY opt in to auto-update for a specific plugin. Updates that introduce new capabilities re-trigger the install prompt regardless of auto-update setting.

## Reference plugins

Three reference plugins live under `plugins/examples/`:

- [`mermaid`](../../plugins/examples/mermaid/) — `render-block` pattern
- [`translate`](../../plugins/examples/translate/) — `on-command` pattern
- [`ical_import`](../../plugins/examples/ical_import/) — `on-command` + `subgraph` write

Read their manifests and (post-M2) source code as templates.
