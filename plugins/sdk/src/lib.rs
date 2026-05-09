//! Mycelium Plugin SDK.
//!
//! Plugin authors target `wasm32-wasi`. This crate exposes the bindings
//! generated from `proto/plugin.wit` and a small ergonomic wrapper.
//!
//! # Status
//!
//! The plugin runtime (WasmEdge sandbox) ships in M2. This crate exists today
//! so that the SDK API can be designed and the contract can be written
//! against. The host functions are unimplemented stubs in M0.
//!
//! See `docs/plugins/sdk.md` for the full reference.

#![deny(missing_docs)]
#![allow(dead_code)]

use std::fmt;

/// Re-exports for plugin authors.
pub mod prelude {
    pub use super::{Capability, Context, EventKind, NodeId, PluginError, PluginResult};
}

/// A node identifier (ULID, base32-encoded, 26 chars).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NodeId(pub String);

/// A capability the plugin requests in its manifest.
#[derive(Debug, Clone)]
pub enum Capability {
    /// Read-only access to nodes matching the given SurrealQL filter.
    Subgraph(String),
    /// Subscribe to specific event kinds on the event bus.
    Events(Vec<EventKind>),
    /// A per-plugin isolated key-value store.
    Kv,
    /// HTTP egress to the listed hostnames, rate-limited.
    Http(Vec<String>),
}

/// Event kinds a plugin can subscribe to.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EventKind {
    /// A node was created.
    NodeCreated,
    /// A node's body or properties changed.
    NodeChanged,
    /// A node was deleted.
    NodeDeleted,
    /// A search query was run by the user.
    QueryRun,
}

/// Errors returned by host calls.
#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum PluginError {
    /// The plugin lacks the capability required for this call.
    CapabilityDenied(String),
    /// The host call returned an unexpected error.
    Host(String),
    /// Decoding or encoding failed.
    Codec(String),
}

impl fmt::Display for PluginError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CapabilityDenied(c) => write!(f, "capability not granted: {c}"),
            Self::Host(m) => write!(f, "host error: {m}"),
            Self::Codec(m) => write!(f, "codec error: {m}"),
        }
    }
}

impl std::error::Error for PluginError {}

/// Result alias used throughout the SDK.
pub type PluginResult<T> = Result<T, PluginError>;

/// The plugin's runtime context. Created by the host on activation; passed to
/// every plugin entry point.
pub struct Context {
    _private: (),
}

impl Context {
    /// Subscribe to an event. The handler is invoked in the plugin's own
    /// linear memory.
    ///
    /// M2 wires this through the WasmEdge runtime; M0/M1 returns
    /// `PluginError::Host("plugin runtime not implemented")`.
    pub fn subscribe<F>(&self, _kind: EventKind, _handler: F) -> PluginResult<()>
    where
        F: Fn(&Context, NodeId) -> PluginResult<()> + 'static,
    {
        Err(PluginError::Host(
            "plugin runtime not implemented in M0".into(),
        ))
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn types_compile() {
        let _ = super::NodeId("01HXAB000000000000000000000".into());
        let _ = super::Capability::Kv;
        let _ = super::EventKind::NodeCreated;
        let e = super::PluginError::CapabilityDenied("kv".into());
        assert!(format!("{e}").contains("capability not granted"));
    }
}
