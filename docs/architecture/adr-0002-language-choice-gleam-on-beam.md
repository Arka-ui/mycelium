# ADR-0002 — Gleam on the BEAM as the primary application language

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

Mycelium needs concurrency at the granularity of "one document = one process, one peer = one process, one open browser tab = one process." Per ../MYCELIUM.md §7, the supervision tree is dozens of processes per node, each isolated, each cheaply restartable. The runtime that natively gives this for free is the **BEAM** (the Erlang virtual machine).

The BEAM has three production languages: Erlang (mature, dynamically typed), Elixir (more ergonomic, dynamically typed), and **Gleam** (statically typed, immutable, functional, sound type system).

We considered Rust as the alternative. Rust gives type safety and zero-cost abstractions but does not give the BEAM's process model — implementing supervision trees in Rust requires manual work that re-invents what the BEAM provides natively. Reproducing per-process fault isolation and hot code reloading on top of tokio is theoretically possible but would itself become a substantial subproject.

We considered Elixir as the alternative inside the BEAM family. Elixir's metaprogramming is powerful and the ecosystem is larger, but a CRDT engine that crashes a node because of a stray `nil` is much harder to debug than a compile error. The Loro port boundary is the worst place to discover a typo at runtime.

## Decision

Use **Gleam** for every BEAM component (`apps/core`, `apps/cli`, the server-side portion of `apps/frontend` running in Lustre's server-component mode).

- Type-safe across the full request path (HTTP → router → document process → port boundary → response).
- Compiles to Erlang bytecode, so all BEAM primitives (gen_server, supervisor, ports, ETS, distribution) are first-class.
- Compiles to JavaScript, so the same language runs in the browser webview; no Node/TypeScript hop.
- The standard library is small enough to re-implement if upstream stalls.

## Consequences

- Contributor pool is smaller than for Rust or TypeScript. Mitigated by RFC process, ADRs, and the fact that Erlang-fluent contributors can read Gleam code with minutes of orientation.
- Some libraries we'd have used in Elixir (Phoenix LiveView, Ecto) have no Gleam equivalents. We use Lustre + Mist + Wisp instead, which cover the same surface with a thinner ecosystem.
- The Gleam compiler is fast and the language is small, which keeps build times short and onboarding documentation manageable.
- We preserve the option to drop down to raw Erlang from Gleam (FFI is straightforward) if a specific OTP API isn't yet wrapped.

## References

- `../MYCELIUM.md` §5 (Stack), §7 (Process model on the BEAM).
- `../SPECIFICATION.md` C-07 (no first-party C/C++), TO-4 (end-to-end type safety).
- Gleam: https://gleam.run
