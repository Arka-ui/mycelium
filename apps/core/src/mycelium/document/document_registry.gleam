import gleam/dict.{type Dict}
import gleam/erlang/process.{type Name, type Subject}
import gleam/otp/actor

import mycelium/document/document.{type Document}

pub type Message {
  LookupOrStart(node_id: String, reply_to: Subject(Document))
  Stop(node_id: String)
}

pub fn start_link(
  name: Name(Message),
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(dict.new())
  |> actor.on_message(handle)
  |> actor.named(name)
  |> actor.start
}

pub fn lookup_or_start(name: Name(Message), node_id: String) -> Document {
  let subject = process.named_subject(name)
  process.call(subject, 5000, fn(reply) { LookupOrStart(node_id, reply) })
}

fn handle(
  state: Dict(String, Document),
  msg: Message,
) -> actor.Next(Dict(String, Document), Message) {
  case msg {
    LookupOrStart(node_id:, reply_to:) -> {
      case dict.get(state, node_id) {
        Ok(existing) -> {
          process.send(reply_to, existing)
          actor.continue(state)
        }
        Error(_) -> {
          case document.start_link(node_id) {
            Ok(doc) -> {
              process.send(reply_to, doc)
              actor.continue(dict.insert(state, node_id, doc))
            }
            Error(_) -> actor.continue(state)
          }
        }
      }
    }
    Stop(node_id:) -> {
      actor.continue(dict.delete(state, node_id))
    }
  }
}
