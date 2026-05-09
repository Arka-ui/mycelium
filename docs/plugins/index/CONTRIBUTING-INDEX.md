# Contributing to the plugin community index

The plugin community index is the curated registry of community plugins, hosted as a static signed JSON file. Adding or updating a plugin is a public, signed process.

## Requirements before submission

Your plugin must:

1. Be a single `.wasm` module compiled for `wasm32-unknown-unknown` (no WASI dependency for simple plugins; WASI permitted for plugins that need filesystem-style host imports).
2. Have a `manifest.json` validating against [`../../../plugins/manifest_schema.json`](../../../plugins/manifest_schema.json).
3. Be signed by an Ed25519 author key.
4. Declare exactly the capabilities it needs — overly broad capability requests are rejected.
5. Include source code under an OSI-approved license (closed-source plugins may distribute outside the index but are not eligible for `category: official` or `category: community-trusted`).

## Submission process

1. Host your `.wasm` and `manifest.json` at stable HTTPS URLs (e.g. GitHub Release assets, S3 + signed URLs, your own domain).
2. Compute the BLAKE3 hash of the `.wasm` file: `b3sum plugin.wasm`.
3. Open a pull request to this directory adding an entry to `index.json`. Use the `plugin_entry` shape from [`schema.json`](schema.json).
4. The operator's CI verifies:
   - The manifest schema validates
   - The BLAKE3 hash matches the URL contents
   - The author signature on the manifest is valid against `author.key`
   - The plugin starts cleanly in `wasmedge_port` with the declared capabilities
5. On approval, the operator regenerates `index.json`, re-signs it with the operator key, and publishes to the static host.

## Categories

| Category | Meaning |
|---|---|
| `official` | Authored by the Mycelium project itself. |
| `community-trusted` | Reviewed by the operator + at least one core maintainer. Author identity verified. |
| `community` | Default category. Schema + signature checks passed. |
| `experimental` | Self-declared by the author as not production-ready. |
| `deprecated` | Author or operator has marked the plugin as superseded; new installations are warned. |

## Updating an existing plugin

Submit a new `versions[]` entry in the same `plugin_entry`. Keep the same `name` and `author.key`. Bump `version` per SemVer 2.0.0.

If a security issue is discovered post-publication, set `yanked: true` and provide a `yanked_reason`. Clients that already installed the version retain it; new installations are blocked.

## Author identity verification

Set `author.verified: true` when one of the following is true:

- **Domain ownership**: a TXT record at `_mycelium-author.<domain>` containing the Ed25519 public key.
- **GitHub social proof**: a public gist signed with the author key, linked from `homepage`.
- **Off-band attestation**: the author has met a maintainer in person and verified key-by-key (rare).

The `verified` flag is set by the operator; authors cannot set it themselves.

## Operator key management

The operator's signing key is held offline. The index is regenerated and signed only when:

- A new plugin entry is approved.
- A version is yanked.
- An author key is rotated.

The signature mechanism is identical to plugin manifest signing (Ed25519 signature over the canonical JSON of every other field).

## Disputes

If the operator declines a submission, the rationale is published in the PR. If the author disagrees, the project's `../../MAINTAINERS.md` lists the appeal contact. Final decision rests with the project lead.
