# Mermaid plugin

Renders Mermaid diagrams (flowcharts, sequence diagrams, class diagrams, gantts) as preview blocks inline in Mycelium notes.

This is a **reference plugin** demonstrating the `render-block` integration pattern. Status: scaffold only — implementation lands in M2 alongside the WasmEdge plugin sandbox.

## Manifest

See [`manifest.json`](manifest.json). Capabilities: none (this plugin is purely a renderer; it does not need graph access, KV, or HTTP).

## Block kind

The plugin registers one custom block kind: `mermaid`. Inside the editor, a user types `/mermaid` to insert one. The block's text content is the Mermaid source; the plugin's `render-block` returns the corresponding SVG, sandboxed by the host before insertion.

## Building

The build process is documented in `docs/plugins/sdk.md`. Brief sketch (post-M2):

```
cd plugins/examples/mermaid
cargo build --release --target wasm32-wasi
```

The `mycelium-cli` will then sign the resulting `.wasm` against your author key and produce the `.myplug` bundle.
