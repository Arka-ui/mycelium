# ADR-0011 — Nix flakes for reproducible builds

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

`../SPECIFICATION.md` constraint **C-03** forbids "curl pipe shell" and unpinned binary downloads. Requirement **FR-DEPLOY-04** demands that two builds of the same commit produce byte-identical binaries. Requirement **NFR-SEC-06** requires that reproducibility allow third-party verification of distributed binaries.

A reproducible build needs every input pinned: the compiler, system libraries, build tools, OS-level dependencies. Tools that satisfy this:

- **Nix** — content-addressed package management; flakes pin every input by cryptographic hash.
- **Bazel** — hermetic builds via custom toolchains. Powerful but heavy onboarding.
- **Guix** — similar to Nix. Smaller community.

## Decision

Use **Nix flakes** as the canonical build system. `flake.nix` at the repository root declares every input, every toolchain version, and every per-target output. `nix build .#desktop-linux` produces the Linux desktop bundle; `nix build .#server-linux-x64` produces the relay binary; etc.

CI runs `nix flake check` on every PR. A binary cache is published so contributors can build incrementally without rebuilding the world locally.

## Consequences

- Two checkouts of the same commit on the same architecture produce byte-identical binaries.
- Cross-compilation: every target builds from any host using the Zig-based Rust cross-compilation toolchain pinned in the flake.
- All third-party dependencies are content-addressed. License compliance (per ../LICENSES.md) is mechanically verifiable.
- **Native Windows is not a Nix-supported platform.** Windows contributors use the PowerShell-based dev loop (per ../SETUP.md) or WSL. The Nix flake remains authoritative; the Windows scripts are convenience.
- Onboarding cost: new contributors learn Nix or use the WSL/Linux escape hatch. The dev shell (`nix develop`) drops them into a working environment in one command.
- M0 status: the flake is a stub. The full per-target builders (cross-compilation matrix, signed bundling) are M3 work per the roadmap.

## References

- `../MYCELIUM.md` §17 (build system and reproducibility).
- `../SPECIFICATION.md` C-03, FR-DEPLOY-04, NFR-SEC-06, R-09 (reproducibility break risk).
- Nix flakes: https://nixos.wiki/wiki/Flakes
