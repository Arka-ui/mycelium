# ADR-0007 — Lustre server-components for the UI

- **Status**: Accepted
- **Date**: 2026-05-07
- **Authors**: project lead
- **Reviewers**: maintainer team

## Context

The UI runs in a Tauri webview. We had to choose between three frontend architectures:

1. **Client-side SPA**, classic — the model lives in the browser, the BEAM exposes a JSON API, the SPA fetches and renders. Familiar pattern. Two implementations of the model (browser + BEAM) drift over time.
2. **Phoenix LiveView equivalent** — model on the server, DOM diffs over WebSocket. Eliminates client/server divergence. The Phoenix ecosystem is Elixir, not Gleam.
3. **Lustre server-components** — the same Elm-style MVU pattern as Phoenix LiveView, but native to Gleam. The model is a `lustre_session` actor on the BEAM; the browser holds a thin runtime that applies DOM diffs and sends events back.

Per ADR-0002, our application language is Gleam. Server-components let the same Gleam code type-check from the document process all the way to the rendered HTML — there is no API boundary where types degrade.

## Decision

Use **Lustre in server-component mode**. The browser-side bundle is the lustre server-component runtime (~30 KB) plus a ~40-line bootstrap. Every meaningful view function lives under `apps/core/src/mycelium/views/` and runs on the BEAM.

Each open browser tab corresponds to one `lustre_session` actor. Document changes broadcast to subscribed sessions. Sessions hold their own `lustre.application` MVU loop and push DOM diffs through their WebSocket.

## Consequences

- The frontend is one type-checked Gleam codebase end-to-end. No JSON API drift, no zod schemas, no TypeScript.
- The browser bundle stays tiny. First paint is fast; users don't pay an SPA's initial-load cost.
- Per-tab actors are cheap on the BEAM. Hundreds of open tabs cost a few MB total — well below NFR-PERF-06's 250 MB idle budget.
- Cost: the WebSocket must be alive for the UI to be interactive. Acceptable for a local-only loopback connection, where the WebSocket is essentially free.
- Cost: in pathological network conditions (tunneling Mycelium's local HTTP through a flaky relay) latency hurts. Out of scope — Mycelium's HTTP is local-only, served by Mist on `127.0.0.1`.
- Lustre is a younger framework than Phoenix LiveView. Mitigation: the server-component contract is small; if Lustre stalls, replacing it would mean writing a small adapter, not rewriting the views.

## References

- `../MYCELIUM.md` §5 (Stack), §6 (Layer 2), §15 (Frontend architecture).
- `../SPECIFICATION.md` TO-4 (end-to-end type safety), NFR-PERF-01 (cold start ≤ 1.2 s), NFR-PERF-02 (keystroke ≤ 16 ms).
- Lustre: https://lustre.build
