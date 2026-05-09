import gleam/erlang/process.{type Subject}
import gleam/http/request.{type Request}
import gleam/http/response.{type Response}
import gleam/option.{type Option, None}
import mist.{type Connection, type ResponseData, type WebsocketConnection}

import mycelium/document/document.{type Update}
import mycelium/http/lustre_session
import mycelium/registry.{type Names}

pub fn upgrade(
  req: Request(Connection),
  doc_id: String,
  _names: Names,
) -> Response(ResponseData) {
  mist.websocket(
    request: req,
    handler: handler,
    on_init: fn(_conn) { on_init(doc_id) },
    on_close: on_close,
  )
}

type SessionState {
  SessionState(session: Subject(lustre_session.Message), doc_id: String)
}

fn on_init(
  doc_id: String,
) -> #(SessionState, Option(process.Selector(Update))) {
  case lustre_session.start_link(doc_id) {
    Ok(session) -> #(SessionState(session: session, doc_id: doc_id), None)
    Error(_) -> #(
      SessionState(session: process.new_subject(), doc_id: doc_id),
      None,
    )
  }
}

fn on_close(_state: SessionState) -> Nil {
  Nil
}

fn handler(
  state: SessionState,
  message: mist.WebsocketMessage(Update),
  conn: WebsocketConnection,
) -> mist.Next(SessionState, Update) {
  case message {
    mist.Text(text) -> {
      lustre_session.handle_inbound(state.session, text)
      mist.continue(state)
    }
    mist.Binary(_) -> mist.continue(state)
    mist.Closed | mist.Shutdown -> mist.stop()
    mist.Custom(update) -> {
      let payload = lustre_session.serialize_update(update)
      let _ = mist.send_text_frame(conn, payload)
      mist.continue(state)
    }
  }
}
