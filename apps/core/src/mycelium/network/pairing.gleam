import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor
import gleam/string

import mycelium/crypto_server
import mycelium/registry.{type Names}

pub type Role {
  Inviter
  Joiner
}

pub type Session {
  Session(
    session_id: String,
    role: Role,
    passphrase: String,
    msg_b64: String,
    shared_key_b64: String,
  )
}

pub type Message {
  Begin(
    passphrase: String,
    our_id: String,
    their_id: String,
    role: Role,
    reply: Subject(Result(Session, String)),
  )
  Finish(
    session_id: String,
    peer_msg_b64: String,
    reply: Subject(Result(String, String)),
  )
  GetSession(session_id: String, reply: Subject(Result(Session, Nil)))
}

type State {
  State(names: Names, sessions: List(Session))
}

pub fn start_link(
  names: Names,
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(State(names: names, sessions: []))
  |> actor.on_message(handle)
  |> actor.start
}

fn handle(state: State, msg: Message) -> actor.Next(State, Message) {
  case msg {
    Begin(passphrase:, our_id:, their_id:, role:, reply:) -> {
      let role_str = case role {
        Inviter -> "a"
        Joiner -> "b"
      }
      case
        crypto_server.spake2_start(
          state.names.crypto,
          passphrase,
          our_id,
          their_id,
          role_str,
        )
      {
        Ok(line) -> {
          let session_id = extract_field(line, "session_id")
          let msg_b64 = extract_field(line, "msg_b64")
          let session =
            Session(
              session_id: session_id,
              role: role,
              passphrase: passphrase,
              msg_b64: msg_b64,
              shared_key_b64: "",
            )
          let new_sessions = [session, ..state.sessions]
          process.send(reply, Ok(session))
          actor.continue(State(..state, sessions: new_sessions))
        }
        Error(_) -> {
          process.send(reply, Error("spake2 start failed"))
          actor.continue(state)
        }
      }
    }
    Finish(session_id:, peer_msg_b64:, reply:) -> {
      case
        crypto_server.spake2_finish(
          state.names.crypto,
          session_id,
          peer_msg_b64,
        )
      {
        Ok(line) -> {
          let key = extract_field(line, "shared_key_b64")
          let new_sessions =
            list.map(state.sessions, fn(s) {
              case s.session_id == session_id {
                True -> Session(..s, shared_key_b64: key)
                False -> s
              }
            })
          process.send(reply, Ok(key))
          actor.continue(State(..state, sessions: new_sessions))
        }
        Error(_) -> {
          process.send(reply, Error("spake2 finish failed"))
          actor.continue(state)
        }
      }
    }
    GetSession(session_id:, reply:) -> {
      let r = case
        list.find(state.sessions, fn(s) { s.session_id == session_id })
      {
        Ok(s) -> Ok(s)
        Error(_) -> Error(Nil)
      }
      process.send(reply, r)
      actor.continue(state)
    }
  }
}

fn extract_field(line: String, field: String) -> String {
  let needle = "\"" <> field <> "\":\""
  case string.split_once(line, needle) {
    Ok(#(_, rest)) ->
      case string.split_once(rest, "\"") {
        Ok(#(v, _)) -> v
        Error(_) -> ""
      }
    Error(_) -> ""
  }
}
