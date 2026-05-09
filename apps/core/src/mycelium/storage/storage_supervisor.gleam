import gleam/otp/actor
import gleam/otp/static_supervisor as sup
import gleam/otp/supervision
import simplifile

import mycelium/config_server.{type Config}
import mycelium/registry.{type Names}
import mycelium/storage/attachment_store
import mycelium/storage/surreal_port
import mycelium/util/port_locator

pub fn start_link(
  config: Config,
  names: Names,
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  let binary = port_locator.locate("surreal_port")
  let db_path = config_server.db_path(config)
  let attachments_path = config_server.attachments_path(config)
  let _ = simplifile.create_directory_all(db_path)
  let storage_name = names.storage

  sup.new(sup.OneForOne)
  |> sup.add(
    supervision.worker(fn() {
      surreal_port.start_link(storage_name, binary, db_path)
    }),
  )
  |> sup.add(
    supervision.worker(fn() { attachment_store.start_link(attachments_path) }),
  )
  |> sup.start
}
