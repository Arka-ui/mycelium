import gleam/erlang/process.{type Name}
import gleam/json
import gleam/otp/actor

import mycelium/util/port_actor.{type Message, type PortError}
import mycelium/util/port_locator

pub fn start_link(
  name: Name(Message),
) -> Result(actor.Started(process.Subject(Message)), actor.StartError) {
  let bin = port_locator.locate("wasmedge_port")
  port_actor.start_link(name, bin, [])
}

pub fn install(
  name: Name(Message),
  plugin_id: String,
  wasm_b64: String,
  expected_blake3: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "install",
    json.object([
      #("plugin_id", json.string(plugin_id)),
      #("wasm_b64", json.string(wasm_b64)),
      #("expected_blake3", json.string(expected_blake3)),
    ]),
  )
}

pub fn invoke(
  name: Name(Message),
  plugin_id: String,
  function: String,
  arg: Int,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "invoke",
    json.object([
      #("plugin_id", json.string(plugin_id)),
      #("function", json.string(function)),
      #("arg_i32", json.int(arg)),
    ]),
  )
}

pub fn uninstall(
  name: Name(Message),
  plugin_id: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "uninstall",
    json.object([
      #("plugin_id", json.string(plugin_id)),
    ]),
  )
}

pub fn invoke_string(
  name: Name(Message),
  plugin_id: String,
  function: String,
  input: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "invoke_string",
    json.object([
      #("plugin_id", json.string(plugin_id)),
      #("function", json.string(function)),
      #("input", json.string(input)),
    ]),
  )
}
