# Plugin community index

This directory contains the schema and a starter index for Mycelium's plugin discovery system.

## Files

- [`schema.json`](schema.json) — JSON Schema 2020-12 spec for the index file.
- [`index.json`](index.json) — bootstrap index (3 official reference plugins).

## How it works

1. Mycelium clients pin the **operator's Ed25519 public key** at install time.
2. Clients periodically fetch the index JSON over HTTPS from the operator's domain.
3. The signature field is verified against the pinned operator key. Mismatched signatures cause the update to be discarded.
4. Each plugin entry includes signed manifest URLs and BLAKE3 hashes of the WASM binaries; clients re-verify on download.

## Hosting requirements (for the operator)

- A static HTTPS host (e.g. GitHub Pages, Cloudflare Pages, S3+CloudFront).
- A signing key kept offline; the index JSON is regenerated and re-signed on each plugin submission.
- A submission process documented in `CONTRIBUTING-INDEX.md` (TBD by the operator).
- A CI pipeline that:
  - Validates each submission against [`../../../plugins/manifest_schema.json`](../../../plugins/manifest_schema.json).
  - Recomputes the BLAKE3 hash of each WASM binary.
  - Verifies the author's Ed25519 signature on the manifest.
  - Regenerates `index.json` and signs it with the operator key.

## Adding a plugin (for plugin authors)

1. Build your `.wasm` and produce a signed `manifest.json` per [`../../plugins/contract.md`](../../plugins/contract.md).
2. Host both files at a stable URL.
3. Open a PR to this directory adding an entry to `index.json`. Include the BLAKE3 of the WASM and the signed manifest URL.
4. The operator's CI verifies the signature, recomputes the hash, regenerates `index.json` with a fresh operator signature.

## Yanking a version

Set `yanked: true` and provide a `yanked_reason`. Clients that already installed the version retain it; new installations are blocked. The version remains accessible by direct URL for forensics.

## Author verification

The `author.verified` flag is set by the operator after confirming the author's identity (e.g. domain ownership via DNS TXT record matching the Ed25519 key, or a social-proof attestation linked from the `homepage`).
