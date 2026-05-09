import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/otp/actor

import mycelium/document/block.{type Block, Bullet, Heading, Paragraph}
import mycelium/util/ulid

pub type Document {
  Document(subject: Subject(Message))
}

pub type Message {
  Subscribe(subscriber: Subject(Update))
  Unsubscribe(subscriber: Subject(Update))
  EditBlock(block_id: String, new_text: String)
  AddBlock(kind: BlockKind, after: Option(String))
  RemoveBlock(block_id: String)
  GetState(reply_to: Subject(List(Block)))
  Save
}

pub type Update {
  StateChanged(blocks: List(Block))
}

pub type BlockKind {
  KParagraph
  KHeading(level: Int)
  KBullet
}

type State {
  State(
    node_id: String,
    blocks: List(Block),
    subscribers: List(Subject(Update)),
  )
}

pub fn start_link(node_id: String) -> Result(Document, String) {
  let initial =
    State(
      node_id: node_id,
      blocks: [Paragraph(id: ulid.new(), text: "")],
      subscribers: [],
    )
  case
    actor.new(initial)
    |> actor.on_message(handle)
    |> actor.start
  {
    Ok(s) -> Ok(Document(subject: s.data))
    Error(_) -> Error("document start failed")
  }
}

pub fn subscribe(doc: Document, subscriber: Subject(Update)) -> Nil {
  process.send(doc.subject, Subscribe(subscriber))
}

pub fn edit_block(doc: Document, block_id: String, text: String) -> Nil {
  process.send(doc.subject, EditBlock(block_id, text))
}

pub fn add_block(doc: Document, kind: BlockKind, after: Option(String)) -> Nil {
  process.send(doc.subject, AddBlock(kind, after))
}

pub fn get_state(doc: Document) -> List(Block) {
  process.call(doc.subject, 5000, fn(reply) { GetState(reply) })
}

fn handle(state: State, msg: Message) -> actor.Next(State, Message) {
  case msg {
    Subscribe(subscriber:) -> {
      let new_subs = [subscriber, ..state.subscribers]
      process.send(subscriber, StateChanged(state.blocks))
      actor.continue(State(..state, subscribers: new_subs))
    }
    Unsubscribe(subscriber:) -> {
      let new_subs = list.filter(state.subscribers, fn(s) { s != subscriber })
      actor.continue(State(..state, subscribers: new_subs))
    }
    EditBlock(block_id:, new_text:) -> {
      let new_blocks =
        list.map(state.blocks, fn(b) {
          case block.id(b) == block_id {
            True -> block.set_text(b, new_text)
            False -> b
          }
        })
      let new_state = State(..state, blocks: new_blocks)
      broadcast(new_state)
      actor.continue(new_state)
    }
    AddBlock(kind:, after:) -> {
      let new_block = mint(kind)
      let new_blocks = insert_after(state.blocks, after, new_block)
      let new_state = State(..state, blocks: new_blocks)
      broadcast(new_state)
      actor.continue(new_state)
    }
    RemoveBlock(block_id:) -> {
      let new_blocks =
        list.filter(state.blocks, fn(b) { block.id(b) != block_id })
      let new_state = State(..state, blocks: new_blocks)
      broadcast(new_state)
      actor.continue(new_state)
    }
    GetState(reply_to:) -> {
      process.send(reply_to, state.blocks)
      actor.continue(state)
    }
    Save -> actor.continue(state)
  }
}

fn mint(kind: BlockKind) -> Block {
  let id = ulid.new()
  case kind {
    KParagraph -> Paragraph(id, "")
    KHeading(level: l) -> Heading(id, l, "")
    KBullet -> Bullet(id, "")
  }
}

fn insert_after(
  blocks: List(Block),
  after_id: Option(String),
  new_block: Block,
) -> List(Block) {
  case after_id {
    None -> [new_block, ..blocks]
    Some(id) -> {
      list.flat_map(blocks, fn(b) {
        case block.id(b) == id {
          True -> [b, new_block]
          False -> [b]
        }
      })
    }
  }
}

fn broadcast(state: State) -> Nil {
  list.each(state.subscribers, fn(s) {
    process.send(s, StateChanged(state.blocks))
  })
  Nil
}
