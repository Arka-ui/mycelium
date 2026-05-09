# ADR-0010 — WasmEdge for the plugin sandbox

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

The plugin system (FR-PLUGIN-*) needs:

- **Sandboxing** — a malicious or buggy plugin must not access the file system, the network, the user's keychain, or other plugins' data without explicit permission.
- **Polyglot guests** — plugin authors should write in any language that targets WebAssembly (Rust, Go, AssemblyScript, Zig, C, Swift).
- **Capability enforcement** — granted capabilities are enforced at the host boundary, not by plugin self-restraint.
- **Resource limits** — execution time and memory caps prevent a stuck plugin from starving the host.

Two production-grade Wasm runtimes met the requirements:

- **WasmEdge** — CNCF-incubated, focused on cloud-native and edge use, strong WASI support, small footprint.
- **Wasmtime** — Bytecode Alliance, reference implementation of WASI, slightly larger footprint.

Both are excellent. The deciding factor was binary size (WasmEdge's footprint is smaller in a sidecar context) and the fact that WasmEdge has explicit "edge / desktop" framing whereas Wasmtime's positioning is server-side. Both runtimes implement the same WASI standard, so a future swap is mechanical.

## Decision

Use **WasmEdge** as the plugin sandbox. Hosted in `sidecars/wasmedge_port/`, accessed from `apps/core/src/mycelium/plugin/wasmedge_port.gleam`.

Each plugin instance runs in a dedicated Wasm linear memory inside the sidecar. The capability list granted to the plugin (per `plugins/manifest_schema.json`) is enforced by the host imports: a plugin without `network` capability has no `http::fetch` import linked at instantiation.

## Consequences

- Plugins are double-isolated: once by the sidecar boundary (per ADR-0003), once by the Wasm sandbox.
- Polyglot plugin authors. The WIT contract (`proto/plugin.wit`) is the single source of truth; bindings are generated per language.
- Capability denial is structural (the import isn't linked), not policy-based. A plugin that tries to call a denied capability fails at link time.
- Risk: WasmEdge is younger than Wasmtime in production deployment. Mitigation: the runtime is a sidecar; swapping to Wasmtime requires rewriting only the sidecar's host imports, not the plugin contract.
- The sandbox does not protect against capability *misuse* — a plugin granted `subgraph` access to a tag can exfiltrate that data through any capability it was also granted. This is documented in `docs/threat_model.md` and surfaced in the plugin install flow.

## References

- `../MYCELIUM.md` §5 (Stack), §14 (plugin system).
- `../SPECIFICATION.md` FR-PLUGIN-01/02 (sandbox + capability), R-08 (plugin ecosystem mitigation).
- WasmEdge: https://wasmedge.org
- WIT contract: `proto/plugin.wit`
- Plugin contract: `docs/plugins/contract.md`
