import gleam/erlang/process.{type Name}

import mycelium/document/document_registry
import mycelium/storage/surreal_port
import mycelium/util/port_actor

pub type Names {
  Names(
    storage: Name(surreal_port.Message),
    document_registry: Name(document_registry.Message),
    loro: Name(port_actor.Message),
    crypto: Name(port_actor.Message),
    iroh: Name(port_actor.Message),
    fastembed: Name(port_actor.Message),
    wasmedge: Name(port_actor.Message),
  )
}

pub fn new() -> Names {
  Names(
    storage: process.new_name("mycelium_storage"),
    document_registry: process.new_name("mycelium_document_registry"),
    loro: process.new_name("mycelium_loro"),
    crypto: process.new_name("mycelium_crypto"),
    iroh: process.new_name("mycelium_iroh"),
    fastembed: process.new_name("mycelium_fastembed"),
    wasmedge: process.new_name("mycelium_wasmedge"),
  )
}
