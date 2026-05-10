# Repository secrets

The release workflow signs every installer with [minisign](https://jedisct1.github.io/minisign/) so the in-app updater can verify them. To enable signed CI builds you have to provide two GitHub repository secrets.

This guide tells you exactly what to paste.

---

## What you need

| Secret name | What it is | Where it comes from |
|---|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | The full text of the minisign private key file. | Generated once with `cargo tauri signer generate`. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password used to encrypt that private key. | Whatever you typed when generating the key. |

The matching **public** key already lives in `apps/desktop/tauri.conf.json` under `plugins.updater.pubkey` — it ships inside every installed app and is what the updater uses to verify the signature on each new release.

---

## One-time setup (3 minutes)

### 1. Locate your private key

If you generated the key earlier in this project the file is at:

- **Windows**: `%USERPROFILE%\.tauri\mycelium.key`
- **macOS / Linux**: `~/.tauri/mycelium.key`

Open it in any text editor — it's a single base64 blob that looks like:

```
untrusted comment: rsign encrypted secret key
RWRTY0Iyi3...long base64...VTkpQ==
```

If the file does not exist, generate one:

```bash
cargo tauri signer generate --write-keys ~/.tauri/mycelium.key
```

Choose a password when prompted; remember it.

> **Important**: never commit the private key file to git. It is ignored by `.gitignore` for `.tauri/` paths.

### 2. Open the secrets page

In your browser go to:

> https://github.com/Arka-ui/mycelium/settings/secrets/actions

Click the green **"New repository secret"** button.

### 3. Add the first secret

| Field | Value |
|---|---|
| **Name** | `TAURI_SIGNING_PRIVATE_KEY` |
| **Secret** | Paste the *entire* contents of `~/.tauri/mycelium.key` — including the `untrusted comment:` header line and every line below it. Trailing newline is fine. |

Click **"Add secret"**.

### 4. Add the second secret

Click **"New repository secret"** again.

| Field | Value |
|---|---|
| **Name** | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |
| **Secret** | The password you used when running `cargo tauri signer generate`. For the bootstrap key shipped with this project the password is `mycelium-beta-key`. |

Click **"Add secret"**.

### 5. Verify

Go to https://github.com/Arka-ui/mycelium/settings/secrets/actions — you should see both:

```
TAURI_SIGNING_PRIVATE_KEY            Updated just now
TAURI_SIGNING_PRIVATE_KEY_PASSWORD   Updated just now
```

That's it. The next tag push (or manual workflow dispatch) will produce signed `.exe.sig`, `.msi.sig`, `.dmg.sig`, `.deb.sig`, and `.AppImage.sig` files alongside each installer.

---

## Test it

Trigger the release workflow manually without cutting a new version:

```bash
gh workflow run release.yml -f tag=v0.1.0-beta.1
```

Watch it at <https://github.com/Arka-ui/mycelium/actions>. You should see:

- The "Detect signing secrets" step prints `Signing secrets present; will build signed updater bundle.`
- The build step takes ~5 min per OS (parallel matrix).
- The publish step uploads the bundles + `.sig` files to the existing release, replacing prior assets.

If the workflow still falls through to the unsigned path, open the failed step and confirm both secrets are spelled exactly as above (case-sensitive, no leading/trailing whitespace).

---

## Rotating the key

If you suspect the key was leaked or you want to change it:

1. Generate a new key: `cargo tauri signer generate --write-keys ~/.tauri/mycelium-v2.key --force`.
2. Replace `plugins.updater.pubkey` in `apps/desktop/tauri.conf.json` with the new `*.key.pub` contents.
3. Update both secrets above with the new key + password.
4. **Cut a new release.** Existing installs will *not* accept updates signed by the new key until they are first manually upgraded to a build that ships the new public key.

The Tauri updater is intentionally strict — the public key baked into the installed app is the trust root.

---

## Why CI signing matters

Without these secrets, `release.yml` falls back to building **unsigned** bundles. Users can still install them, but the in-app "Check for updates" feature will refuse to apply any update because the signature won't verify against the public key in their installed app. Setting these secrets is what makes auto-update actually update.

The local installer at <https://github.com/Arka-ui/mycelium/releases/tag/v0.1.0-beta.1> is already signed (built from a developer machine that had the key locally). Setting the CI secrets is what lets every *future* release be signed automatically.
