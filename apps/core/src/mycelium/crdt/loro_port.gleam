import gleam/erlang/process.{type Name}
import gleam/json
import gleam/otp/actor

import mycelium/util/port_actor.{type Message, type PortError}
import mycelium/util/port_locator

pub type LoroError =
  PortError

pub fn start_link(
  name: Name(Message),
) -> Result(actor.Started(process.Subject(Message)), actor.StartError) {
  let bin = port_locator.locate("loro_port")
  port_actor.start_link(name, bin, [])
}

pub fn ping(name: Name(Message)) -> Result(String, PortError) {
  port_actor.call(name, "ping", json.object([]))
}

pub fn open_doc(
  name: Name(Message),
  doc_id: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "open_doc",
    json.object([#("doc_id", json.string(doc_id))]),
  )
}

pub fn close_doc(
  name: Name(Message),
  doc_id: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "close_doc",
    json.object([#("doc_id", json.string(doc_id))]),
  )
}

pub fn insert_text(
  name: Name(Message),
  doc_id: String,
  container: String,
  pos: Int,
  text: String,
) -> Result(String, PortError) {
  let intent =
    json.object([
      #("kind", json.string("insert_text")),
      #("container", json.string(container)),
      #("pos", json.int(pos)),
      #("text", json.string(text)),
    ])
  port_actor.call(
    name,
    "apply_local_op",
    json.object([
      #("doc_id", json.string(doc_id)),
      #("intent", intent),
    ]),
  )
}

pub fn delete_text(
  name: Name(Message),
  doc_id: String,
  container: String,
  pos: Int,
  len: Int,
) -> Result(String, PortError) {
  let intent =
    json.object([
      #("kind", json.string("delete_text")),
      #("container", json.string(container)),
      #("pos", json.int(pos)),
      #("len", json.int(len)),
    ])
  port_actor.call(
    name,
    "apply_local_op",
    json.object([
      #("doc_id", json.string(doc_id)),
      #("intent", intent),
    ]),
  )
}

pub fn apply_remote_ops(
  name: Name(Message),
  doc_id: String,
  ops_b64: List(String),
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "apply_remote_ops",
    json.object([
      #("doc_id", json.string(doc_id)),
      #("ops", json.array(ops_b64, json.string)),
    ]),
  )
}

pub fn get_state(
  name: Name(Message),
  doc_id: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "get_state",
    json.object([#("doc_id", json.string(doc_id))]),
  )
}

pub fn version_vector(
  name: Name(Message),
  doc_id: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "version_vector",
    json.object([#("doc_id", json.string(doc_id))]),
  )
}

pub fn snapshot(
  name: Name(Message),
  doc_id: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "snapshot",
    json.object([#("doc_id", json.string(doc_id))]),
  )
}

pub fn load_snapshot(
  name: Name(Message),
  doc_id: String,
  snap_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "load_snapshot",
    json.object([
      #("doc_id", json.string(doc_id)),
      #("snap", json.string(snap_b64)),
    ]),
  )
}
