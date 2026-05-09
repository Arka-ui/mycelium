# Port Protocol Specification

**Version:** 0.1.0 (M0)
**Status:** Stable for M0/M1; encoding migrates to CBOR in M2 (per ADR-0012).
**Schema:** `proto/port.cddl`
**Audience:** sidecar implementers, BEAM-side actor implementers, contributors auditing the boundary.

The port protocol is the wire format between the BEAM and a Rust sidecar. The BEAM spawns the sidecar as an Erlang port (a child process). They exchange messages over the sidecar's stdin (BEAM → sidecar) and stdout (sidecar → BEAM). Stderr is for human-readable diagnostic logging only and is never parsed by the BEAM.

## Framing

Each message is a single UTF-8 JSON object on its own line, terminated by the byte `0x0A` (`\n`). The stream is line-oriented: a parser reads up to the next `\n`, then attempts to decode the bytes as JSON.

Empty lines (consecutive `\n`) are ignored. Lines longer than 16 MiB are rejected (the sender MUST chunk).

## Envelopes

There are three envelope shapes: **request**, **response**, and **notification**. The CDDL schema is in `proto/port.cddl`.

### Request

BEAM → sidecar with a response expected.

```json
{
  "id": <uint or string>,
  "method": "<method-name>",
  "params": {<object>}    // or [<array>], or omitted
}
```

`id` is opaque to the sidecar; it must be echoed verbatim in the response. The BEAM uses sequential integers per port, but other senders MAY use UUIDs or descriptive strings.

`method` is a registered method name (see per-sidecar tables below).

`params` is the method's argument bundle. May be an object, an array, or absent.

### Response

Sidecar → BEAM, in reply to a request with the same `id`.

Success:
```json
{
  "id": <same as the request>,
  "result": <any>
}
```

Error:
```json
{
  "id": <same as the request>,
  "error": {
    "code": <int>,
    "message": "<text>",
    "data": <any>     // optional
  }
}
```

Exactly one of `result` or `error` is present.

### Notification

Either direction, no response expected. Distinguished from request by the absence of `id`.

```json
{
  "method": "<method-name>",
  "params": <object or array>     // optional
}
```

Sidecars use notifications to push asynchronous events to the BEAM (e.g., `iroh_port` will emit `peer_connected` notifications when a peer comes online).

## Error codes

The standard codes mirror JSON-RPC 2.0:

| Code | Meaning |
|---|---|
| `-32600` | Invalid request (envelope failed to decode) |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32603` | Internal error (sidecar bug) |
| `-32099` to `-32000` | Reserved for sidecar-specific application errors |

## Lifecycle

1. The BEAM spawns the sidecar via `erlang:open_port({spawn_executable, ...}, [...])`. The CLI args specify per-sidecar config (e.g., `--db-path` for `surreal_port`).
2. The sidecar performs initialization (open the database, bind to a network endpoint, etc.). It may emit log lines on stderr.
3. Once ready, the sidecar processes incoming requests on stdin until EOF. The BEAM closes stdin to signal shutdown.
4. The sidecar drains any outstanding writes, releases resources, and exits with status 0.

If the sidecar dies unexpectedly the BEAM port closes; the supervising actor restarts the sidecar and replays any pending operation queue.

A heartbeat method `ping` is supported by every sidecar:

- Request: `{"id": 1, "method": "ping"}`
- Response: `{"id": 1, "result": {"pong": true}}`

The BEAM-side actor SHOULD send a `ping` every 5 s when the sidecar has been idle, and treat a missing response within 10 s as a hung sidecar (NFR-AVAIL-06).

## Method registries

### `surreal_port` — M0 functional

| Method | Params | Result | Notes |
|---|---|---|---|
| `ping` | — | `{"pong": true}` | Heartbeat. |
| `migrate` | — | `{"applied": true, "schema_version": <int>}` | Idempotent. Run at startup. |
| `create_node` | `{id: string, kind: string, title: string, body: array}` | the created node | `kind` MUST be `"note"` in M0. |
| `get_node` | `{id: string}` | the node, or `null` | |
| `list_nodes` | `{limit: uint, offset: uint}` | `{items: array, limit: uint, offset: uint}` | Sorted by `updated_at DESC`. |
| `update_node` | `{id: string, title?: string, body?: array}` | the patched node | Server bumps `updated_at`. |
| `delete_node` | `{id: string}` | `{deleted: <id>}` | Hard delete in M0. |

### `loro_port` — M1 (M0: stub returns -32601)

| Method | Params | Result |
|---|---|---|
| `open_doc` | `{doc_id: string}` | `{handle: string}` |
| `close_doc` | `{doc_id: string}` | `{closed: true}` |
| `apply_local_op` | `{doc_id, intent: object}` | `{op_id: string, op_bytes: base64}` |
| `apply_remote_ops` | `{doc_id, ops: [base64]}` | `{applied: uint}` |
| `get_state` | `{doc_id: string}` | `{blocks: array}` |
| `version_vector` | `{doc_id: string}` | `{vv: object}` |
| `snapshot` | `{doc_id: string}` | `{snap: base64, hash: string}` |
| `load_snapshot` | `{doc_id, snap: base64}` | `{loaded: true}` |

### `iroh_port` — M1 (M0: stub returns -32601)

| Method | Params | Result |
|---|---|---|
| `bind` | `{node_key: base64, listen_port: uint}` | `{node_id: string, addresses: [string]}` |
| `discover` | `{ring_id: string}` | `{started: true}` |
| `connect` | `{peer_id: string}` | `{stream_id: string}` |
| `send` | `{stream_id, payload: base64}` | `{sent: uint}` |
| `transfer_blob` | `{blob_hash, peer_id}` | `{bytes: uint}` |

Notifications: `peer_connected`, `peer_disconnected`, `incoming_ops`, `incoming_blob`.

### `fastembed_port` — M2 (M0: stub returns -32601)

| Method | Params | Result |
|---|---|---|
| `load_model` | `{model_id: string}` | `{loaded: true, dimensions: uint}` |
| `embed_batch` | `{texts: [string]}` | `{vectors: [[float]]}` |
| `embed_query` | `{text: string}` | `{vector: [float]}` |
| `model_info` | — | `{model_id, dimensions, quantization, file_path, blake3}` |

### `wasmedge_port` — M2 (M0: stub returns -32601)

| Method | Params | Result |
|---|---|---|
| `install_plugin` | `{wasm: base64, manifest: object, signature: string}` | `{plugin_id: string}` |
| `activate` | `{plugin_id, capabilities: array}` | `{activated: true}` |
| `invoke` | `{plugin_id, method: string, args: object}` | result of the plugin call |
| `notify` | `{plugin_id, event: object}` | `{delivered: true}` |
| `revoke` | `{plugin_id: string}` | `{revoked: true}` |

## Encoding migration (M2)

Per ADR-0012, the on-the-wire encoding migrates from line-framed JSON to CBOR (RFC 8949) in M2. The CDDL schema in `proto/port.cddl` is encoding-independent; the migration touches only the codec wrappers in `gleam_json` ↔ `gleam_cbor` and `serde_json` ↔ `ciborium`.

The method registry, error codes, lifecycle, and heartbeat semantics do not change.
