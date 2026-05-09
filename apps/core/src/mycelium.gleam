import gleam/erlang/process
import gleam/int
import gleam/io
import gleam/json

import mycelium/config_server
import mycelium/registry
import mycelium/storage/surreal_port
import mycelium/sup

pub fn main() -> Nil {
  let config = config_server.load_or_default()
  let names = registry.new()
  let port_subject = process.new_subject()
  let assert Ok(_) = sup.start_link(config, names, port_subject)
  let _ = surreal_port.migrate(names.storage)
  let bound_port = case process.receive(port_subject, 5000) {
    Ok(p) -> p
    Error(_) -> config_server.http_port(config)
  }
  emit_ready(bound_port, config_server.ipc_pipe(config))
  process.sleep_forever()
}

fn emit_ready(http_port: Int, ipc_pipe: String) -> Nil {
  let payload =
    json.object([
      #("http_port", json.int(http_port)),
      #("ipc_pipe", json.string(ipc_pipe)),
      #("pid", json.int(self_os_pid())),
    ])
  io.println("MYCELIUM_READY " <> json.to_string(payload))
}

@external(erlang, "os", "getpid")
fn os_getpid() -> String

fn self_os_pid() -> Int {
  case int.parse(os_getpid()) {
    Ok(n) -> n
    Error(_) -> 0
  }
}
