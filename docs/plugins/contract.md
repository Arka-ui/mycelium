# Plugin Contract

**Version:** 0.1.0
**Status:** M2 — runtime not yet implemented; contract published today so plugin authors can target it.
**Authoritative WIT:** `proto/plugin.wit`
**Manifest schema:** `plugins/manifest_schema.json`
**Audience:** plugin authors, security reviewers.

A Mycelium plugin is a WebAssembly module compiled to `wasm32-wasi` and accompanied by a signed manifest. The host (`wasmedge_port` sidecar) instantiates the plugin in a sandbox with exactly the capabilities granted by the user.

## Anatomy of a plugin

A plugin is distributed as a `.myplug` archive containing:

- `plugin.wasm` — the Wasm module.
- `manifest.json` — metadata, declared capabilities, signature (per `plugins/manifest_schema.json`).
- `LICENSE` — author's choice; SPDX identifier MUST be declared in the manifest.

The manifest's `wasm_hash` field (`blake3:<hex>`) MUST match the BLAKE3 hash of `plugin.wasm`. The `signature` field is an Ed25519 signature over the canonical JSON of every other manifest field, verified against `author.key`.

The host rejects installation if the hash check fails, the signature check fails, the manifest doesn't validate against `manifest_schema.json`, or the WIT version doesn't match `proto/plugin.wit`.

## Capability model

Plugins declare capabilities in the manifest. The user reviews and approves them at install time (similar to mobile-app permission prompts). The user can revoke any capability at any time.

The available capabilities:

| Capability | Surface | Risk |
|---|---|---|
| `subgraph(<filter>)` | Read access to nodes matching the SurrealQL filter; optionally write. | The plugin sees real user content matching the filter. |
| `events(<kinds>)` | Subscribe to graph events. | The plugin learns when nodes change. |
| `kv` | Per-plugin isolated key-value store. | Local; no cross-plugin or host access. |
| `http(<hosts>, <rate>)` | Egress to allowlisted hostnames, rate-limited. | The plugin can exfiltrate data to allowed hosts. |

A plugin without `network`-class capability has no `http::fetch` import linked at instantiation. Capability denial is **structural**, not policy-based.

## Integration patterns

The plugin contract supports three patterns. A plugin MAY use any combination.

### 1. Hooks

Subscribe to events via `events::subscribe(kind)`. The host invokes the plugin's `on-event` export when the kind fires:

```wit
export on-event: func(ev: event) -> result<_, host-error>;
```

Use cases: incremental indexing, mirroring a subgraph to an external system (with `http`), running validation when a node changes.

### 2. Commands

Register slash-commands via the manifest's `commands` array. When the user invokes a command, the host calls:

```wit
export on-command: func(name: string, args: string, selection: string)
    -> result<string, host-error>;
```

The plugin returns text to insert (or empty for no-op). Use cases: `/translate`, `/summarize`, `/import-ics`.

### 3. Custom block renderers

Register custom block kinds via the manifest's `block_kinds`. The editor inserts a block with `kind = "<your-kind>"` and the plugin's `render-block` is invoked:

```wit
export render-block: func(kind: string, content: string)
    -> result<string, host-error>;
```

Returns sandboxed HTML or SVG. The host strips `<script>`, `<iframe>`, `on*` attributes, and `javascript:` URLs before insertion. Use case: Mermaid diagrams, custom charts, math rendering.

## Lifecycle

1. **Install** — The user opens a `.myplug` file (or a URL pointing at one). The host verifies the hash + signature + manifest schema. The user reviews capabilities and approves or cancels.
2. **Activate** — On approval (and on every Mycelium startup thereafter, if enabled), the host instantiates the plugin's Wasm module, links the granted capability imports, and calls `activate()`.
3. **Run** — Hooks, commands, and renderers are dispatched as configured.
4. **Deactivate** — On user disable or app shutdown, the host calls `deactivate()` and tears down the instance. The KV store is preserved across deactivation.
5. **Revoke** — On capability revocation, the host calls `deactivate()`, then re-activates with the new (smaller) capability set. If the plugin requires a revoked capability, it stays disabled until the user grants it again.
6. **Uninstall** — On user uninstall, the manifest, Wasm module, and KV store are removed.

## Resource limits

Per-plugin limits enforced by the WasmEdge host:

| Resource | Limit |
|---|---|
| Linear memory | 128 MiB |
| Execution time per call | 5 s (commands), 1 s (renderers, hooks) |
| KV total bytes | 100 MiB |
| KV value size | 64 KiB |
| HTTP egress | per `rate_limit_per_minute` in the manifest, default 60/min |
| Subgraph result rows | 10,000 per query |

A plugin that exceeds a limit is killed; the work item fails with `host-error::internal("resource-limit-exceeded")`.

## Identity and reputation

Each plugin has an author Ed25519 public key. The signature on the manifest binds the plugin to its author. Updates are signed by the same key.

The community plugin index (M4) maintains author reputation, signed by the index operator. Users may pin specific authors as trusted for auto-update without prompt.

## Security boundary

Plugins are **untrusted code**. The host treats every plugin like a third-party native application: capabilities are the boundary. The threat model document (`docs/threat_model.md`) details what the sandbox does and does not protect against.

In particular:

- A plugin with `subgraph` can leak the subgraph's content via any other capability it holds (KV, HTTP).
- A plugin with `kv` cannot read another plugin's KV.
- A plugin without `http` cannot make any network request.
- A plugin without `subgraph` cannot read user content of any kind.

Users are advised to grant the minimum capability set the plugin requires and to prefer reference plugins or signed plugins from authors they trust.
