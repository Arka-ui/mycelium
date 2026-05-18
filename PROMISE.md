# The Mycelium Promise

**Mycelium is free, open, and open source. It will stay that way.**

### Your data

Mycelium cannot collect your notes — and this is an architectural fact, not
a policy we ask you to trust.

- **Local-first.** Your notes live only on your own device, in
  `%APPDATA%\Mycelium\` (Windows), `~/Library/Application Support/Mycelium/`
  (macOS), or `~/.local/share/Mycelium/` (Linux). There is no Mycelium
  server, no account, no sign-up, no telemetry, no analytics endpoint, and
  no "phone home." The only network request the official app ever makes on
  its own is the update check against the public release manifest on GitHub
  — and even that can be turned off.
- **Encrypted at rest, by you.** When you enable the workspace lock or
  per-note encryption, your content is sealed with **ChaCha20-Poly1305**
  (an authenticated AEAD cipher) using a 256-bit key derived from your
  passphrase via **50,000 iterations of BLAKE3** over a domain-separated,
  per-workspace-salted input. A fresh 96-bit random nonce from the OS CSPRNG
  is used for every encryption. Your passphrase is never written to disk —
  only a separate BLAKE3 verifier is stored, and the plaintext key exists
  only in memory while the workspace is unlocked.
- **End-to-end by design.** Peer-to-peer device sync (on the roadmap) is
  built so that only your own devices hold the keys: ciphertext flows
  between your devices directly over an encrypted transport, and any
  optional relay only ever sees opaque bytes. Until that ships, your notes
  simply never leave your machine unless *you* export them.

Nobody on the project — myself included — can read your notes. There is no
master key, no backdoor, no recovery service. If you lose your passphrase,
your data is gone, and that is the correct and intended behaviour.

### Money

No subscriptions. No paywalls. No "pro" tier. No ads in the official
version. No "free trial." No upsell.

I do not ask for or accept money for this project, and neither does anyone
else on the team. The **only** exception: a user may, entirely on their own
initiative, choose to thank an individual developer. But **no developer is
ever allowed to ask for this**, no contribution is gated behind it, and
every developer remains free to refuse it. Gratitude is never solicited and
never owed.

### Transparency

The project's running costs — domains, signing certificates, CI, anything
— will always be communicated publicly. If money is ever spent to keep
Mycelium alive, you will be able to see exactly what, why, and how much.

### Why

Mycelium exists for a freer, safer internet, accessible to everyone. Not
for a market. Not for an exit. Not for your attention.

---

## Disclaimer — official version vs. forks

This promise is a binding commitment for the **official Mycelium**:

- the source at **https://github.com/Arka-ui/mycelium**, and
- the official signed release binaries distributed from that repository's
  GitHub Releases (verified by the minisign public key baked into the app
  and used by the auto-updater).

The official version will keep and respect every clause of this promise,
**no matter what** — no future version of the official app will introduce
tracking, a paywall, ads, or a data-collection path. If that ever appears
in a build that claims to be official, it is not official.

**Mycelium is open source, which means anyone may legally fork it.** We
neither control nor endorse forks, rebuilds, repackaged installers, or
copies distributed anywhere other than the official repository above. A
malicious or careless fork **can** strip out the encryption, add telemetry,
inject ads, exfiltrate your notes, ship a trojaned updater, or otherwise
break every line of this promise — and it can still call itself
"Mycelium," because we cannot stop that.

**Protect yourself:**

- Only install Mycelium from
  **https://github.com/Arka-ui/mycelium/releases**.
- Let the in-app auto-updater (which verifies the official signing key) do
  the updating. Do not install "Mycelium" builds handed to you from
  anywhere else.
- If you build from source, build from the official repository and read the
  diff.
- The promise above applies to the official version **only**. We make no
  guarantees, and accept no responsibility, for anything a third party ships
  under this name.

*This document is versioned with the source. Any change to it is visible in
the git history of the official repository.*
