# Translate plugin

Translates the current editor selection between language pairs using a local model.

Reference plugin demonstrating the `on-command` integration pattern (a slash command). Status: scaffold only — implementation lands in M2.

## Capabilities

- `kv` — caches model state locally per source/target language pair to avoid re-loading on every invocation.

The plugin does **not** request `http` capability; the model is bundled with the plugin and runs offline. This is a deliberate design choice for the reference set: a translate plugin that calls a remote API would betray Mycelium's local-first promise. Authors of forks are free to ship a cloud-translation variant under a different name.
