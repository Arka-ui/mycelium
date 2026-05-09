//// Block type — the atomic unit inside a node's body.
////
//// M0: paragraph, heading (level 1-4), bullet list item. The Loro tree
//// container model lands in M1; for M0 the body is a plain `List(Block)`
//// serialized into the SurrealDB `body: array<object>` column.

import gleam/dynamic
import gleam/dynamic/decode
import gleam/json.{type Json}
import gleam/list
import gleam/result

pub type Block {
  Paragraph(id: String, text: String)
  Heading(id: String, level: Int, text: String)
  Bullet(id: String, text: String)
}

pub fn id(block: Block) -> String {
  case block {
    Paragraph(id, _) -> id
    Heading(id, _, _) -> id
    Bullet(id, _) -> id
  }
}

pub fn set_text(block: Block, text: String) -> Block {
  case block {
    Paragraph(id, _) -> Paragraph(id, text)
    Heading(id, level, _) -> Heading(id, level, text)
    Bullet(id, _) -> Bullet(id, text)
  }
}

pub fn to_json(block: Block) -> Json {
  case block {
    Paragraph(id, text) ->
      json.object([
        #("id", json.string(id)),
        #("kind", json.string("paragraph")),
        #("text", json.string(text)),
      ])
    Heading(id, level, text) ->
      json.object([
        #("id", json.string(id)),
        #("kind", json.string("heading")),
        #("level", json.int(level)),
        #("text", json.string(text)),
      ])
    Bullet(id, text) ->
      json.object([
        #("id", json.string(id)),
        #("kind", json.string("bullet")),
        #("text", json.string(text)),
      ])
  }
}

pub fn list_to_json(blocks: List(Block)) -> Json {
  json.preprocessed_array(list.map(blocks, to_json))
}

pub fn decoder() -> decode.Decoder(Block) {
  use kind <- decode.field("kind", decode.string)
  use id <- decode.field("id", decode.string)
  case kind {
    "paragraph" -> {
      use text <- decode.field("text", decode.string)
      decode.success(Paragraph(id, text))
    }
    "heading" -> {
      use level <- decode.field("level", decode.int)
      use text <- decode.field("text", decode.string)
      decode.success(Heading(id, level, text))
    }
    "bullet" -> {
      use text <- decode.field("text", decode.string)
      decode.success(Bullet(id, text))
    }
    _ -> decode.failure(Paragraph(id, ""), "unknown block kind: " <> kind)
  }
}

pub fn list_decoder() -> decode.Decoder(List(Block)) {
  decode.list(decoder())
}

pub fn from_dynamic(value: dynamic.Dynamic) -> Result(List(Block), String) {
  decode.run(value, list_decoder())
  |> result.map_error(fn(_) { "block list decode failed" })
}
