import gleam/erlang/process.{type Name}
import gleam/json
import gleam/otp/actor

import mycelium/util/port_actor.{type Message, type PortError}
import mycelium/util/port_locator

pub fn start_link(
  name: Name(Message),
) -> Result(actor.Started(process.Subject(Message)), actor.StartError) {
  let bin = port_locator.locate("iroh_port")
  port_actor.start_link(name, bin, [])
}

pub fn ping(name: Name(Message)) -> Result(String, PortError) {
  port_actor.call(name, "ping", json.object([]))
}

pub fn bind(
  name: Name(Message),
  secret_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "bind",
    json.object([#("secret_b64", json.string(secret_b64))]),
  )
}

pub fn node_id(name: Name(Message)) -> Result(String, PortError) {
  port_actor.call(name, "node_id", json.object([]))
}

pub fn connect_send(
  name: Name(Message),
  node_id_hex: String,
  payload_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "connect_send",
    json.object([
      #("node_id_hex", json.string(node_id_hex)),
      #("payload_b64", json.string(payload_b64)),
    ]),
  )
}
