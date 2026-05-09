import gleam/dict.{type Dict}
import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor

pub type PeerCredit {
  PeerCredit(node_id_hex: String, credits: Int, rtt_us: Int, in_flight: Int)
}

pub type Message {
  Grant(node_id_hex: String, credits: Int, rtt_us: Int)
  Consume(node_id_hex: String, n: Int, reply: Subject(Bool))
  Release(node_id_hex: String, n: Int)
  Get(node_id_hex: String, reply: Subject(Result(PeerCredit, Nil)))
  ListAll(reply: Subject(List(PeerCredit)))
}

pub fn start_link() -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(dict.new())
  |> actor.on_message(handle)
  |> actor.start
}

fn handle(
  state: Dict(String, PeerCredit),
  msg: Message,
) -> actor.Next(Dict(String, PeerCredit), Message) {
  case msg {
    Grant(node_id_hex:, credits:, rtt_us:) -> {
      let existing = case dict.get(state, node_id_hex) {
        Ok(p) -> p.in_flight
        Error(_) -> 0
      }
      let updated =
        PeerCredit(
          node_id_hex: node_id_hex,
          credits: credits,
          rtt_us: rtt_us,
          in_flight: existing,
        )
      actor.continue(dict.insert(state, node_id_hex, updated))
    }
    Consume(node_id_hex:, n:, reply:) -> {
      case dict.get(state, node_id_hex) {
        Ok(p) -> {
          case p.credits >= n {
            True -> {
              let new_p =
                PeerCredit(
                  ..p,
                  credits: p.credits - n,
                  in_flight: p.in_flight + n,
                )
              process.send(reply, True)
              actor.continue(dict.insert(state, node_id_hex, new_p))
            }
            False -> {
              process.send(reply, False)
              actor.continue(state)
            }
          }
        }
        Error(_) -> {
          process.send(reply, False)
          actor.continue(state)
        }
      }
    }
    Release(node_id_hex:, n:) -> {
      case dict.get(state, node_id_hex) {
        Ok(p) -> {
          let new_in_flight = case p.in_flight >= n {
            True -> p.in_flight - n
            False -> 0
          }
          let new_p = PeerCredit(..p, in_flight: new_in_flight)
          actor.continue(dict.insert(state, node_id_hex, new_p))
        }
        Error(_) -> actor.continue(state)
      }
    }
    Get(node_id_hex:, reply:) -> {
      let r = case dict.get(state, node_id_hex) {
        Ok(p) -> Ok(p)
        Error(_) -> Error(Nil)
      }
      process.send(reply, r)
      actor.continue(state)
    }
    ListAll(reply:) -> {
      process.send(reply, dict.values(state))
      actor.continue(state)
    }
  }
}

pub fn try_consume(
  subject: Subject(Message),
  node_id_hex: String,
  n: Int,
) -> Bool {
  process.call(subject, 1000, fn(reply) { Consume(node_id_hex, n, reply) })
}

pub fn release(subject: Subject(Message), node_id_hex: String, n: Int) -> Nil {
  process.send(subject, Release(node_id_hex, n))
}

pub fn grant(
  subject: Subject(Message),
  node_id_hex: String,
  credits: Int,
  rtt_us: Int,
) -> Nil {
  process.send(subject, Grant(node_id_hex, credits, rtt_us))
}

pub fn list_all(subject: Subject(Message)) -> List(PeerCredit) {
  process.call(subject, 1000, fn(reply) { ListAll(reply) })
}

pub fn count(items: List(PeerCredit)) -> Int {
  list.length(items)
}
