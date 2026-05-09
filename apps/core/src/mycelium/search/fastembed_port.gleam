import gleam/erlang/process.{type Name}
import gleam/json
import gleam/otp/actor

import mycelium/util/port_actor.{type Message, type PortError}
import mycelium/util/port_locator

pub fn start_link(
  name: Name(Message),
) -> Result(actor.Started(process.Subject(Message)), actor.StartError) {
  let bin = port_locator.locate("fastembed_port")
  port_actor.start_link(name, bin, [])
}

pub fn ping(name: Name(Message)) -> Result(String, PortError) {
  port_actor.call(name, "ping", json.object([]))
}

pub fn load_model(name: Name(Message)) -> Result(String, PortError) {
  port_actor.call(name, "load_model", json.object([]))
}

pub fn embed_batch(
  name: Name(Message),
  texts: List(String),
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "embed_batch",
    json.object([
      #("texts", json.array(texts, json.string)),
    ]),
  )
}

pub fn embed_query(
  name: Name(Message),
  text: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "embed_query",
    json.object([
      #("text", json.string(text)),
    ]),
  )
}

pub fn model_info(name: Name(Message)) -> Result(String, PortError) {
  port_actor.call(name, "model_info", json.object([]))
}
