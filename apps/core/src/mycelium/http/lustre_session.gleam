import gleam/erlang/process.{type Subject}
import gleam/otp/actor

import mycelium/document/document.{type Update}

pub type Message {
  Inbound(text: String)
  DocChanged(update: Update)
}

type SessionState {
  SessionState(doc_id: String)
}

pub fn start_link(doc_id: String) -> Result(Subject(Message), String) {
  case
    actor.new(SessionState(doc_id: doc_id))
    |> actor.on_message(handle)
    |> actor.start
  {
    Ok(s) -> Ok(s.data)
    Error(_) -> Error("lustre_session start failed")
  }
}

pub fn handle_inbound(session: Subject(Message), text: String) -> Nil {
  process.send(session, Inbound(text))
}

pub fn serialize_update(_update: Update) -> String {
  ""
}

fn handle(
  state: SessionState,
  msg: Message,
) -> actor.Next(SessionState, Message) {
  case msg {
    Inbound(text: _) -> actor.continue(state)
    DocChanged(update: _) -> actor.continue(state)
  }
}
