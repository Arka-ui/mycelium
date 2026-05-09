import gleam/dict.{type Dict}
import gleam/erlang/process.{type Subject}
import gleam/otp/actor

pub type Peer {
  Peer(node_id_hex: String, last_seen_ms: Int)
}

pub type Message {
  Add(node_id_hex: String, ts_ms: Int)
  Remove(node_id_hex: String)
  List(reply: Subject(List(Peer)))
}

pub fn start_link() -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(dict.new())
  |> actor.on_message(handle)
  |> actor.start
}

fn handle(
  state: Dict(String, Peer),
  msg: Message,
) -> actor.Next(Dict(String, Peer), Message) {
  case msg {
    Add(node_id_hex:, ts_ms:) ->
      actor.continue(dict.insert(state, node_id_hex, Peer(node_id_hex, ts_ms)))
    Remove(node_id_hex:) -> actor.continue(dict.delete(state, node_id_hex))
    List(reply:) -> {
      process.send(reply, dict.values(state))
      actor.continue(state)
    }
  }
}
