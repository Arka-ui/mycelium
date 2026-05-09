import gleam/dict.{type Dict}
import gleam/erlang/process.{type Name, type Subject}
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/otp/actor
import gleam/string

import mycelium/document/block.{type Block}

pub type StorageError {
  PortClosed
  Decode(String)
  RemoteError(code: Int, message: String)
}

pub type Message {
  CallRaw(json: String, reply_to: Subject(Result(String, StorageError)))
  PortLine(line: String)
  PortClosedMsg
}

type State {
  State(
    port: PortRef,
    next_id: Int,
    pending: Dict(Int, Subject(Result(String, StorageError))),
  )
}

pub fn start_link(
  name: Name(Message),
  binary_path: String,
  db_path: String,
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new_with_initialiser(5000, fn(self) {
    let port_ref = open_port(binary_path, ["--db-path", db_path])
    spawn_port_reader(port_ref, self)
    let state = State(port: port_ref, next_id: 1, pending: dict.new())
    Ok(actor.initialised(state) |> actor.returning(self))
  })
  |> actor.on_message(handle_message)
  |> actor.named(name)
  |> actor.start
}

pub fn migrate(name: Name(Message)) -> Result(String, StorageError) {
  call(name, "migrate", json.object([]))
}

pub fn ping(name: Name(Message)) -> Result(String, StorageError) {
  call(name, "ping", json.object([]))
}

pub fn create_node(
  name: Name(Message),
  id: String,
  kind: String,
  title: String,
  body: List(Block),
) -> Result(String, StorageError) {
  call(
    name,
    "create_node",
    json.object([
      #("id", json.string(id)),
      #("kind", json.string(kind)),
      #("title", json.string(title)),
      #("body", block.list_to_json(body)),
    ]),
  )
}

pub fn get_node(
  name: Name(Message),
  id: String,
) -> Result(String, StorageError) {
  call(name, "get_node", json.object([#("id", json.string(id))]))
}

pub fn list_nodes(
  name: Name(Message),
  limit: Int,
  offset: Int,
) -> Result(String, StorageError) {
  call(
    name,
    "list_nodes",
    json.object([
      #("limit", json.int(limit)),
      #("offset", json.int(offset)),
    ]),
  )
}

pub fn update_node(
  name: Name(Message),
  id: String,
  title: Option(String),
  body: Option(List(Block)),
) -> Result(String, StorageError) {
  let title_field = case title {
    Some(t) -> #("title", json.string(t))
    None -> #("title", json.null())
  }
  let body_field = case body {
    Some(b) -> #("body", block.list_to_json(b))
    None -> #("body", json.null())
  }
  call(
    name,
    "update_node",
    json.object([
      #("id", json.string(id)),
      title_field,
      body_field,
    ]),
  )
}

pub fn delete_node(
  name: Name(Message),
  id: String,
) -> Result(String, StorageError) {
  call(name, "delete_node", json.object([#("id", json.string(id))]))
}

pub fn search_nodes(
  name: Name(Message),
  query: String,
  limit: Int,
) -> Result(String, StorageError) {
  call(
    name,
    "search_nodes",
    json.object([
      #("query", json.string(query)),
      #("limit", json.int(limit)),
    ]),
  )
}

pub fn upsert_embedding(
  name: Name(Message),
  block_id: String,
  node_id: String,
  vector: List(Float),
) -> Result(String, StorageError) {
  call(
    name,
    "upsert_embedding",
    json.object([
      #("block_id", json.string(block_id)),
      #("node_id", json.string(node_id)),
      #("vector", json.array(vector, json.float)),
    ]),
  )
}

pub fn semantic_search(
  name: Name(Message),
  query_vector: List(Float),
  limit: Int,
) -> Result(String, StorageError) {
  call(
    name,
    "semantic_search",
    json.object([
      #("query_vector", json.array(query_vector, json.float)),
      #("limit", json.int(limit)),
    ]),
  )
}

pub fn hybrid_search(
  name: Name(Message),
  query_vector: List(Float),
  query_text: String,
  limit: Int,
) -> Result(String, StorageError) {
  call(
    name,
    "hybrid_search",
    json.object([
      #("query_vector", json.array(query_vector, json.float)),
      #("query_text", json.string(query_text)),
      #("limit", json.int(limit)),
    ]),
  )
}

pub fn append_op(
  name: Name(Message),
  doc_id: String,
  lamport: Int,
  author: String,
  dek_id: Int,
  ciphertext_b64: String,
) -> Result(String, StorageError) {
  call(
    name,
    "append_op",
    json.object([
      #("doc_id", json.string(doc_id)),
      #("lamport", json.int(lamport)),
      #("author", json.string(author)),
      #("dek_id", json.int(dek_id)),
      #("ciphertext_b64", json.string(ciphertext_b64)),
    ]),
  )
}

pub fn list_ops(
  name: Name(Message),
  doc_id: String,
  from: Int,
  limit: Int,
) -> Result(String, StorageError) {
  call(
    name,
    "list_ops",
    json.object([
      #("doc_id", json.string(doc_id)),
      #("from", json.int(from)),
      #("limit", json.int(limit)),
    ]),
  )
}

pub fn compact_log(
  name: Name(Message),
  doc_id: String,
  upto: Int,
) -> Result(String, StorageError) {
  call(
    name,
    "compact_log",
    json.object([
      #("doc_id", json.string(doc_id)),
      #("upto", json.int(upto)),
    ]),
  )
}

pub fn meta_set(
  name: Name(Message),
  key: String,
  value: json.Json,
) -> Result(String, StorageError) {
  call(
    name,
    "meta_set",
    json.object([
      #("key", json.string(key)),
      #("value", value),
    ]),
  )
}

pub fn meta_get(
  name: Name(Message),
  key: String,
) -> Result(String, StorageError) {
  call(name, "meta_get", json.object([#("key", json.string(key))]))
}

fn handle_message(state: State, msg: Message) -> actor.Next(State, Message) {
  case msg {
    CallRaw(json:, reply_to:) -> {
      let id = state.next_id
      let line = inject_id(json, id)
      send_to_port(state.port, line)
      let pending = dict.insert(state.pending, id, reply_to)
      actor.continue(State(..state, next_id: id + 1, pending: pending))
    }
    PortLine(line:) -> {
      case extract_id(line) {
        Some(id) -> {
          case dict.get(state.pending, id) {
            Ok(reply) -> {
              process.send(reply, Ok(line))
              let pending = dict.delete(state.pending, id)
              actor.continue(State(..state, pending: pending))
            }
            Error(_) -> actor.continue(state)
          }
        }
        None -> actor.continue(state)
      }
    }
    PortClosedMsg -> {
      list.each(dict.values(state.pending), fn(reply) {
        process.send(reply, Error(PortClosed))
      })
      actor.stop()
    }
  }
}

fn call(
  name: Name(Message),
  method: String,
  params: json.Json,
) -> Result(String, StorageError) {
  let envelope =
    json.object([
      #("id", json.int(0)),
      #("method", json.string(method)),
      #("params", params),
    ])
    |> json.to_string
  let subject = process.named_subject(name)
  process.call(subject, 5000, fn(reply) { CallRaw(envelope, reply) })
}

fn inject_id(json_str: String, id: Int) -> String {
  string.replace(json_str, "\"id\":0", "\"id\":" <> int.to_string(id))
}

fn extract_id(line: String) -> Option(Int) {
  case string.split_once(line, "\"id\":") {
    Ok(#(_, rest)) -> {
      case string.split_once(rest, ",") {
        Ok(#(num_str, _)) ->
          int.parse(string.trim(num_str)) |> option_from_result
        Error(_) ->
          case string.split_once(rest, "}") {
            Ok(#(num_str, _)) ->
              int.parse(string.trim(num_str)) |> option_from_result
            Error(_) -> None
          }
      }
    }
    Error(_) -> None
  }
}

fn option_from_result(r: Result(Int, Nil)) -> Option(Int) {
  case r {
    Ok(v) -> Some(v)
    Error(_) -> None
  }
}

type PortRef

@external(erlang, "mycelium_ffi", "open_port")
fn open_port(binary_path: String, args: List(String)) -> PortRef

@external(erlang, "mycelium_ffi", "send_line")
fn send_to_port(port: PortRef, line: String) -> Nil

@external(erlang, "mycelium_ffi", "spawn_port_reader")
fn spawn_port_reader(port: PortRef, target: Subject(Message)) -> Nil
