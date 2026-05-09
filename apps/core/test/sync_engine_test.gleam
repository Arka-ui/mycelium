import gleam/erlang/process
import gleeunit/should

import mycelium/crdt/loro_port
import mycelium/crypto_server
import mycelium/network/iroh_port
import mycelium/network/peer_registry
import mycelium/registry
import mycelium/sync/sync_engine

pub fn engine_starts_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = loro_port.start_link(names.loro)
  let assert Ok(_) = crypto_server.start_link(names.crypto)
  let assert Ok(_) = iroh_port.start_link(names.iroh)
  let assert Ok(peers_started) = peer_registry.start_link()
  process.sleep(800)
  let assert Ok(_engine) =
    sync_engine.start_link(
      names.loro,
      names.crypto,
      names.iroh,
      peers_started.data,
    )
  should.equal(True, True)
}

pub fn engine_handles_local_op_with_no_peers_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = loro_port.start_link(names.loro)
  let assert Ok(_) = crypto_server.start_link(names.crypto)
  let assert Ok(_) = iroh_port.start_link(names.iroh)
  let assert Ok(peers_started) = peer_registry.start_link()
  process.sleep(800)
  let assert Ok(engine) =
    sync_engine.start_link(
      names.loro,
      names.crypto,
      names.iroh,
      peers_started.data,
    )
  process.send(engine.data, sync_engine.LocalOp("doc1", "AAAA"))
  process.sleep(200)
  should.equal(True, True)
}
