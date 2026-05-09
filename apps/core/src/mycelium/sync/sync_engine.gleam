import gleam/erlang/process.{type Name, type Subject}
import gleam/list
import gleam/otp/actor
import gleam/string

import mycelium/crdt/loro_port
import mycelium/crypto_server
import mycelium/network/iroh_port
import mycelium/network/peer_registry.{type Peer}
import mycelium/util/port_actor

pub type SealedOp {
  SealedOp(doc_id: String, dek_id: Int, ciphertext_b64: String)
}

pub type Message {
  LocalOp(doc_id: String, op_b64: String)
  RemoteOp(doc_id: String, op_b64: String)
  AddRecipient(recipient_b64: String)
  AddPeer(node_id_hex: String, ts_ms: Int)
  RequestSnapshot(doc_id: String, peer_node_id_hex: String)
  ApplySnapshot(doc_id: String, snap_b64: String)
  Tick
}

type State {
  State(
    loro: Name(port_actor.Message),
    crypto: Name(port_actor.Message),
    iroh: Name(port_actor.Message),
    peers: Subject(peer_registry.Message),
    recipients_b64: List(String),
    dek_id: Int,
  )
}

pub fn start_link(
  loro: Name(port_actor.Message),
  crypto: Name(port_actor.Message),
  iroh: Name(port_actor.Message),
  peers: Subject(peer_registry.Message),
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(State(
    loro: loro,
    crypto: crypto,
    iroh: iroh,
    peers: peers,
    recipients_b64: [],
    dek_id: 1,
  ))
  |> actor.on_message(handle)
  |> actor.start
}

fn handle(state: State, msg: Message) -> actor.Next(State, Message) {
  case msg {
    AddRecipient(recipient_b64:) -> {
      let new_state =
        State(..state, recipients_b64: [recipient_b64, ..state.recipients_b64])
      actor.continue(new_state)
    }
    AddPeer(node_id_hex:, ts_ms:) -> {
      process.send(state.peers, peer_registry.Add(node_id_hex, ts_ms))
      actor.continue(state)
    }
    LocalOp(doc_id:, op_b64:) -> {
      let _ = broadcast_op(state, doc_id, op_b64)
      actor.continue(state)
    }
    RemoteOp(doc_id:, op_b64:) -> {
      let _ = loro_port.apply_remote_ops(state.loro, doc_id, [op_b64])
      actor.continue(state)
    }
    RequestSnapshot(doc_id:, peer_node_id_hex:) -> {
      case loro_port.snapshot(state.loro, doc_id) {
        Ok(line) -> {
          let snap_b64 = extract_field(line, "snap")
          let envelope = "SNAPSHOT|" <> doc_id <> "|" <> snap_b64
          let _ = iroh_port.connect_send(state.iroh, peer_node_id_hex, envelope)
          actor.continue(state)
        }
        Error(_) -> actor.continue(state)
      }
    }
    ApplySnapshot(doc_id:, snap_b64:) -> {
      let _ = loro_port.load_snapshot(state.loro, doc_id, snap_b64)
      actor.continue(state)
    }
    Tick -> actor.continue(state)
  }
}

fn broadcast_op(
  state: State,
  doc_id: String,
  op_b64: String,
) -> Result(Nil, String) {
  case state.recipients_b64 {
    [] -> Ok(Nil)
    _ -> {
      case
        crypto_server.age_encrypt(state.crypto, op_b64, state.recipients_b64)
      {
        Ok(line) -> {
          let ct_b64 = extract_field(line, "ciphertext_b64")
          let envelope = build_envelope(doc_id, state.dek_id, ct_b64)
          let reply = process.new_subject()
          process.send(state.peers, peer_registry.List(reply))
          let peers = case process.receive(reply, 1000) {
            Ok(ps) -> ps
            Error(_) -> []
          }
          list.each(peers, fn(p: Peer) {
            let _ = iroh_port.connect_send(state.iroh, p.node_id_hex, envelope)
          })
          Ok(Nil)
        }
        Error(_) -> Error("encrypt failed")
      }
    }
  }
}

fn build_envelope(
  doc_id: String,
  dek_id: Int,
  ciphertext_b64: String,
) -> String {
  doc_id <> "|" <> int_to_str(dek_id) <> "|" <> ciphertext_b64
}

@external(erlang, "erlang", "integer_to_binary")
fn int_to_str(n: Int) -> String

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
