import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor
import gleam/string

import mycelium/registry.{type Names}
import mycelium/search/fastembed_port
import mycelium/storage/surreal_port

pub type Message {
  Reindex(node_id: String, block_id: String, text: String)
  ReindexBatch(items: List(IndexItem))
  Tick
}

pub type IndexItem {
  IndexItem(node_id: String, block_id: String, text: String)
}

type State {
  State(names: Names, model_loaded: Bool, queue: List(IndexItem))
}

pub fn start_link(
  names: Names,
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(State(names: names, model_loaded: False, queue: []))
  |> actor.on_message(handle)
  |> actor.start
}

fn handle(state: State, msg: Message) -> actor.Next(State, Message) {
  case msg {
    Reindex(node_id:, block_id:, text:) -> {
      let item = IndexItem(node_id: node_id, block_id: block_id, text: text)
      let new_queue = [item, ..state.queue]
      let drained = drain(new_queue, state.names)
      actor.continue(State(..state, queue: drained))
    }
    ReindexBatch(items:) -> {
      let new_queue = list.append(items, state.queue)
      let drained = drain(new_queue, state.names)
      actor.continue(State(..state, queue: drained))
    }
    Tick -> {
      let drained = drain(state.queue, state.names)
      actor.continue(State(..state, queue: drained))
    }
  }
}

fn drain(items: List(IndexItem), names: Names) -> List(IndexItem) {
  case items {
    [] -> []
    _ -> {
      let texts = list.map(items, fn(it: IndexItem) { it.text })
      case fastembed_port.embed_batch(names.fastembed, texts) {
        Ok(line) -> {
          let vectors = parse_vectors(line)
          case list.length(vectors) == list.length(items) {
            True -> {
              let pairs = list.zip(items, vectors)
              list.each(pairs, fn(pair) {
                let #(it, vec) = pair
                let _ =
                  surreal_port.upsert_embedding(
                    names.storage,
                    it.block_id,
                    it.node_id,
                    vec,
                  )
                Nil
              })
              []
            }
            False -> items
          }
        }
        Error(_) -> items
      }
    }
  }
}

fn parse_vectors(line: String) -> List(List(Float)) {
  case string.split_once(line, "\"vectors\":[") {
    Ok(#(_, rest)) -> {
      let body = case string.split_once(rest, "]]}") {
        Ok(#(b, _)) -> b
        Error(_) -> ""
      }
      let groups = string.split(body, "],[")
      list.map(groups, parse_one)
    }
    Error(_) -> []
  }
}

fn parse_one(g: String) -> List(Float) {
  let cleaned = string.replace(g, "[", "")
  let cleaned = string.replace(cleaned, "]", "")
  let parts = string.split(cleaned, ",")
  list.filter_map(parts, parse_f64)
}

@external(erlang, "binary_to_float_compat", "parse")
fn parse_f64(s: String) -> Result(Float, Nil)
