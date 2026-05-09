import gleam/dict.{type Dict}
import gleam/erlang/process.{type Name, type Subject}
import gleam/int
import gleam/json
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/otp/actor
import gleam/string

pub type PortError {
  PortClosed
  Decode(String)
}

pub type Message {
  CallRaw(json: String, reply_to: Subject(Result(String, PortError)))
  PortLine(line: String)
  PortClosedMsg
}

type State {
  State(
    port: PortRef,
    next_id: Int,
    pending: Dict(Int, Subject(Result(String, PortError))),
  )
}

pub fn start_link(
  name: Name(Message),
  binary_path: String,
  args: List(String),
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new_with_initialiser(5000, fn(self) {
    let port_ref = open_port(binary_path, args)
    spawn_port_reader(port_ref, self)
    let state = State(port: port_ref, next_id: 1, pending: dict.new())
    Ok(actor.initialised(state) |> actor.returning(self))
  })
  |> actor.on_message(handle)
  |> actor.named(name)
  |> actor.start
}

pub fn call(
  name: Name(Message),
  method: String,
  params: json.Json,
) -> Result(String, PortError) {
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

fn handle(state: State, msg: Message) -> actor.Next(State, Message) {
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

fn inject_id(json_str: String, id: Int) -> String {
  string.replace(json_str, "\"id\":0", "\"id\":" <> int.to_string(id))
}

fn extract_id(line: String) -> Option(Int) {
  case string.split_once(line, "\"id\":") {
    Ok(#(_, rest)) -> {
      case string.split_once(rest, ",") {
        Ok(#(num_str, _)) -> int.parse(string.trim(num_str)) |> opt
        Error(_) ->
          case string.split_once(rest, "}") {
            Ok(#(num_str, _)) -> int.parse(string.trim(num_str)) |> opt
            Error(_) -> None
          }
      }
    }
    Error(_) -> None
  }
}

fn opt(r: Result(Int, Nil)) -> Option(Int) {
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
