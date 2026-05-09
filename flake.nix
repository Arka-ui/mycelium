{
  description = "Mycelium reproducible build (Linux/WSL only — see SETUP.md for native Windows dev)";

  # M0 stub:
  # The full reproducible build pipeline is M3 work (per MYCELIUM.md §23). This
  # flake currently provides only the development shell; the per-target
  # `packages.default` outputs (.dmg, .msi, .deb, .AppImage, headless relay)
  # will be authored in M3 alongside the cross-compilation matrix described in
  # SPECIFICATION.md FR-DEPLOY-04 and FR-DEPLOY-05.
  #
  # Why this file exists today:
  # - Honours the constraint C-03 (no curl-pipe-shell, every dep pinned) by
  #   declaring the input set.
  # - Documents the eventual structure so contributors know where each output
  #   will live.
  # - Provides a `nix develop` shell on Linux/macOS with the full toolchain so
  #   contributors can iterate without per-tool installs.
  #
  # On native Windows, Nix is unavailable. Use SETUP.md (PowerShell + scoop +
  # cargo) for the time being. WSL2 with Nix-on-NixOS or Nix-on-Ubuntu is the
  # supported "Windows" path for the full reproducible build.

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    # M3: pin a specific Erlang/OTP and Gleam toolchain via overlays.
    # gleam-overlay.url = "github:gleam-lang/nix-flake-overlay";

    # M3: pin a Rust toolchain via fenix or rust-overlay.
    # rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        # M3: replace these with overlay-pinned versions.
        beam = pkgs.beam.packages.erlang_27;
        gleam = pkgs.gleam;          # placeholder — pin to specific version in M3
        just = pkgs.just;
        rustToolchain = pkgs.rustc;  # M3: replace with rust-overlay pin

        # Common dev shell content. Used both in the dev shell and as a
        # foundation for future per-target builds.
        commonInputs = with pkgs; [
          beam.erlang
          beam.rebar3
          gleam
          rustToolchain
          cargo
          just
          nodejs_20
          pkg-config
          openssl
          # Tauri runtime deps (Linux):
          gtk3
          webkitgtk_4_1
          libappindicator
          librsvg
        ];
      in
      {
        # Drop into a shell with the full toolchain. M3: add cross-compilation
        # targets, the WebView2 mock for Linux Tauri builds, and the WiX
        # toolchain for cross-compiling MSI installers from Linux.
        devShells.default = pkgs.mkShell {
          buildInputs = commonInputs;
          shellHook = ''
            echo "Mycelium dev shell — Linux/macOS"
            echo "Tools:"
            ${beam.erlang}/bin/erl -version
            ${gleam}/bin/gleam --version
            ${rustToolchain}/bin/rustc --version
            ${just}/bin/just --version
            echo ""
            echo "Build with: just build"
            echo "Run dev:    just dev"
          '';
        };

        # M3: per-platform packages.
        packages = {
          # default = pkgs.stdenv.mkDerivation { ... };       # the desktop bundle
          # relay   = pkgs.stdenv.mkDerivation { ... };       # the headless relay
          # cli     = pkgs.stdenv.mkDerivation { ... };       # the scripting CLI
        };

        # M3: a flake-check that runs gleam test, cargo test, fmt-check, and
        # the integration suite under simulated network partitions.
        # checks = { ... };
      });
}
