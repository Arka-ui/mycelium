import gleam/erlang/process.{type Subject}
import gleam/otp/actor
import gleam/otp/static_supervisor as sup
import gleam/otp/supervision

import mycelium/config_server.{type Config}
import mycelium/crdt/loro_port
import mycelium/crypto_server
import mycelium/document/document_registry
import mycelium/http/http_supervisor
import mycelium/identity_server
import mycelium/network/iroh_port
import mycelium/network/peer_registry
import mycelium/network/sync_orchestrator
import mycelium/plugin/plugin_registry
import mycelium/plugin/wasmedge_port
import mycelium/registry.{type Names}
import mycelium/search/fastembed_port
import mycelium/search/indexer
import mycelium/storage/storage_supervisor

pub fn start_link(
  config: Config,
  names: Names,
  port_subject: Subject(Int),
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  sup.new(sup.OneForOne)
  |> sup.add(supervision.supervisor(fn() { core_subtree(config, names) }))
  |> sup.add(
    supervision.supervisor(fn() { storage_supervisor.start_link(config, names) }),
  )
  |> sup.add(supervision.supervisor(fn() { crdt_subtree(names) }))
  |> sup.add(supervision.supervisor(fn() { network_subtree(names) }))
  |> sup.add(supervision.supervisor(fn() { search_subtree(names) }))
  |> sup.add(supervision.supervisor(fn() { plugin_subtree(names) }))
  |> sup.add(
    supervision.supervisor(fn() {
      http_supervisor.start_link(config, names, port_subject)
    }),
  )
  |> sup.start
}

fn core_subtree(
  config: Config,
  names: Names,
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  sup.new(sup.RestForOne)
  |> sup.add(supervision.worker(fn() { config_server.start_link(config) }))
  |> sup.add(
    supervision.worker(fn() { crypto_server.start_link(names.crypto) }),
  )
  |> sup.add(
    supervision.worker(fn() { identity_server.start_link_with(config, names) }),
  )
  |> sup.start
}

fn crdt_subtree(
  names: Names,
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  sup.new(sup.OneForOne)
  |> sup.add(supervision.worker(fn() { loro_port.start_link(names.loro) }))
  |> sup.add(
    supervision.worker(fn() {
      document_registry.start_link(names.document_registry)
    }),
  )
  |> sup.start
}

fn network_subtree(
  names: Names,
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  sup.new(sup.OneForOne)
  |> sup.add(supervision.worker(fn() { iroh_port.start_link(names.iroh) }))
  |> sup.add(supervision.worker(fn() { peer_registry.start_link() }))
  |> sup.add(supervision.worker(fn() { sync_orchestrator.start_link() }))
  |> sup.start
}

fn search_subtree(
  names: Names,
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  sup.new(sup.OneForOne)
  |> sup.add(
    supervision.worker(fn() { fastembed_port.start_link(names.fastembed) }),
  )
  |> sup.add(supervision.worker(fn() { indexer.start_link(names) }))
  |> sup.start
}

fn plugin_subtree(
  names: Names,
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  sup.new(sup.OneForOne)
  |> sup.add(
    supervision.worker(fn() { wasmedge_port.start_link(names.wasmedge) }),
  )
  |> sup.add(supervision.worker(fn() { plugin_registry.start_link() }))
  |> sup.start
}
