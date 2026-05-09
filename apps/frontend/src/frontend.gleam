//// Mycelium frontend bootstrap (M0 placeholder).
////
//// Beta.1 ships the Tauri-native HTML/CSS/JS UI under
//// `apps/desktop/resources/frontend/`. This Gleam->JS bootstrap is the
//// M2+ entry point for the Lustre server-component runtime defined by
//// `apps/core/src/mycelium/http/`. It compiles to a small ES module
//// loaded by the HTML shell once the BEAM-backed UI is wired up.
////
//// The Lustre server-component custom element auto-registers when the
//// `lustre/server_component` script (served by Mist) loads in the
//// browser. Until that is wired up, this module is intentionally a
//// no-op so the JS bundle exists.

pub fn main() -> Nil {
  Nil
}
