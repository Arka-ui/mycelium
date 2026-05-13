# Mycelium UI Remake — phased plan

> **Status**: draft, in flight. Phase 1 ships as part of v0.75; phases 2–5 are scoped one per beta from v0.76 onward.

The desktop UI was assembled feature-by-feature across 65+ beta releases, which gave us breadth but accumulated layout debt: the bulk-action bar overlaps the editor footer, the filter pill and the tab bar share vertical space without a contract, modals share z-index with floating popovers, and there is no shared spacing scale. This plan replaces incremental patches with a deliberate redesign in five phases — each phase ships independently, each phase is reversible, and at no point does the app stop working.

This document is the source of truth. Each phase has a concrete deliverable and a measurable acceptance check.

---

## Phase 1 — Foundation (v0.75) **[shipping now]**

**Goal**: stop the bleeding on overlap bugs and establish design tokens everything downstream depends on.

- Replace inline `gap: 8px`, `padding: 12px 16px` literals scattered across `app.css` with a CSS-variable scale `--sp-1` through `--sp-8` (4px / 6px / 8px / 12px / 16px / 24px / 32px / 48px).
- Add a `--z-*` token group: `--z-base: 0`, `--z-sticky: 100`, `--z-floating: 300`, `--z-modal-backdrop: 800`, `--z-palette: 850`, `--z-modal: 900`, `--z-toast: 1000`. Replace ad-hoc `z-index: 9999` and the nine pre-existing values (50 / 90 / 95 / 100 / 200 / 250 / 300 / 500) with named tokens.
- Fix the audited overlaps that have a real reproduction in v0.75:
  - **Bulk-bar buttons clipping at narrow sidebar widths** — the bulk-action row had a fixed flex layout that overflowed under ~280 px sidebar width. Phase 1 adds `flex-wrap` + `min-width: 0` and rebases padding/margin on `--sp-*` tokens.
  - **Today-section spacing** — re-based padding/margin on the new tokens.
- Audit modal z-indexes: all six modals (settings, theme editor, history, snapshot diff, search, properties) sit at `--z-modal`; the global `#modal-backdrop` uses `--z-modal-backdrop`; **the command palette sits at the dedicated `--z-palette` layer between backdrop and modal**, so opening Settings deterministically covers an already-open palette without relying on DOM order.

### Deferred from Phase 1 (moved into Phase 2)
- **Bulk-bar floating mode** (sticky panel with `bottom: 32px` and a backdrop-blur over the editor footer) — only useful once the bulk-bar leaves the sidebar, which is a Phase-2 layout-grid task.
- **Filter pill below 320 px** — needs the container-query infrastructure from Phase 2 to do cleanly without media-query fragility.

**Acceptance**: open all six modals one after another, then resize the window to 600 × 400. No layout artifact, no stacked backdrops, no scroll trap.

---

## Phase 2 — Layout grid (v0.76)

**Goal**: replace the implicit flex chain (`#app > main > article > footer/header/etc.`) with an explicit two-column CSS grid that knows about every region.

- Convert the top-level layout to `grid-template-areas: "sidebar editor" "sidebar footer"`. Right-side panels (backlinks, outline, mentions) become a third column that collapses below 1080px wide.
- Add container queries for the editor pane so the toolbar can collapse to icon-only at <600px without affecting the sidebar's measure.
- Move the floating bulk-bar to a dedicated `bulk` area inside the grid; no more `position: fixed`.
- Replace the hand-rolled sidebar resizer with a `<dialog>`-less drag handle that snaps to 240 / 280 / 320 / 400 px.

**Acceptance**: drag the sidebar from 200 to 600 px; the editor and footer reflow without overlap at any width.

---

## Phase 3 — Typography & iconography (v0.77)

**Goal**: replace the 14px-everywhere typography with a scale, and replace inline emojis with a single icon font.

- Type scale: `--text-xs: 11px`, `--text-sm: 12.5px`, `--text-base: 14px`, `--text-lg: 16px`, `--text-xl: 20px`, `--text-2xl: 26px`. Heading weights pinned at 600. Mono stack standardised on `ui-monospace, "JetBrains Mono"`, fallback `Consolas`.
- Replace the 60+ emoji glyphs scattered through the UI (📌, 🔒, 🗑, ★, …) with a single inline-SVG sprite (`apps/desktop/resources/frontend/icons.svg`), referenced via `<svg><use href="#icon-pin"/></svg>`. Sprite total weight < 12 KB.
- Localised dates/numbers use `Intl.DateTimeFormat` + `Intl.NumberFormat` driven by the existing `state.settings.locale`.

**Acceptance**: zero raw emoji glyphs in `index.html` or `app.js` for icon use (text content like wiki-link `[[Title]]` excluded). Lighthouse contrast ≥ AA on all three default themes.

---

## Phase 4 — Motion & microinteractions (v0.78)

**Goal**: add restrained motion so state changes are legible without distracting.

- 150 ms ease-out for hover/focus transitions; 250 ms ease-in-out for panel mount/unmount; 80 ms for keypress feedback. All wrapped in `@media (prefers-reduced-motion: reduce)` no-op.
- Sidebar drawer animation when toggled; tab-bar tab open/close with a 4-stage transition (insert / expand / settle / focus).
- Save-state pulse (the green dot) becomes a 600 ms ease-out shrink on success.
- Toast notifications (currently `setStatus()` text in the status bar) gain a sliding banner above the status bar with auto-dismiss at 4000 ms.

**Acceptance**: every transition can be disabled by OS-level reduced-motion preference. No animation longer than 350 ms. No animation in response to scroll.

---

## Phase 5 — Settings & modal redesign (v0.79)

**Goal**: the Settings modal currently has 11 tabs that have grown organically. Phase 5 reorganises around user mental models, not feature timelines.

- New top-level groups: **Workspace** (general, locale, sidebar), **Editor** (typography, smart features, snippets), **Sync** (offline / WiFi / cellular policy, last sync, peer list), **Data** (backup, export, import, encryption), **Appearance** (themes, fonts, density), **Plugins**, **Updates**, **About**. Saved searches and shortcuts live inside Editor.
- Modal layout: vertical sidebar of groups (icon + label), main content area, sticky footer with "Reset to defaults" and "Close". Same chrome for theme editor and properties editor.
- Search box at the top of Settings filters across all groups.
- Keyboard shortcuts: Ctrl/Cmd + , opens Settings, Ctrl/Cmd + K opens command palette, Esc closes everything top-down (innermost first).

**Acceptance**: every existing setting reachable in ≤ 2 clicks from the Settings root. Tab order respects DOM order. Esc never gets stuck.

---

## Out-of-scope (deferred to post-v0.80)

- A second, denser "Compact" density preset. Phase 1 prepares the spacing tokens for it but does not ship it.
- Inline AI chat panel. Possibly v1.x.
- Replacing the markdown renderer (`markdown.js`) with a CommonMark-compliant parser. Tracked separately.

---

## Theme catalogue (shipping in v0.75)

The remake plan keeps the existing theme system; v0.75 simply expands the builtin catalogue from 3 to 7:

| Theme              | Origin              | Notes                                                 |
| ------------------ | ------------------- | ----------------------------------------------------- |
| Dark (default)     | original            | unchanged                                             |
| Light              | original            | unchanged                                             |
| High contrast      | original            | unchanged                                             |
| Solarized Dark     | Ethan Schoonover    | yellow accent on `#002b36`                            |
| Solarized Light    | Ethan Schoonover    | yellow accent on `#fdf6e3`                            |
| Dracula            | dracula-theme.com   | purple accent on `#282a36`, signature pink danger     |
| Nord               | arcticicestudio     | frost-blue accent on `#2e3440`                        |

User-authored themes are unaffected — they continue to live in the Themes settings tab and override builtins by id.

---

## Sync policy (shipping in v0.75)

Real device sync (Iroh + Loro CRDT) is M1 work; the on-the-wire transport is still stubbed. v0.75 ships the **policy layer** and the **detection scaffolding** so the moment the transport lands, the rules are already authored and the UI is already in place. The contract:

- **WiFi-only (default)**: full sync; no rate cap.
- **WiFi + cellular (light)**: WiFi unrestricted; on cellular, only metadata + tag changes + diffs ≤ 4 KB; large blobs (images, snapshots) deferred until WiFi.
- **WiFi + cellular (full)**: WiFi unrestricted; on cellular, full sync but with op-batching (5-second debounce) and gzip compression.
- **Manual**: no automatic sync; user triggers via palette command or button.

Detection on desktop uses `navigator.connection.type` and `effectiveType` (Chromium provides this in Tauri's webview on Windows / Linux; macOS falls back to "wifi"). A manual override in Settings → Sync lets users force a connection class regardless of detection — useful for tethering scenarios. The Sync tab also shows last-sync timestamp, current peer count (0 in M0), and an "Sync now" button.

Once M1 lands, the transport reads `state.settings.sync_policy` and the resolved connection class, applies the rules, and never has to revisit policy design.

---

*This document evolves with each phase. Mark a phase **done** when its acceptance check passes.*
