import gleam/list
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event

import mycelium/document/block.{type Block, Bullet, Heading, Paragraph}

pub type Msg {
  BlockEdited(block_id: String, text: String)
  AddParagraph
  AddHeading(level: Int)
  AddBullet
  RemoveBlock(block_id: String)
}

pub fn render() -> Element(Msg) {
  html.div([attribute.class("mycelium-editor")], [
    html.div([attribute.class("editor-toolbar")], [
      html.button([event.on_click(AddParagraph)], [element.text("¶")]),
      html.button([event.on_click(AddHeading(1))], [element.text("H1")]),
      html.button([event.on_click(AddHeading(2))], [element.text("H2")]),
      html.button([event.on_click(AddHeading(3))], [element.text("H3")]),
      html.button([event.on_click(AddBullet)], [element.text("•")]),
    ]),
    html.div([attribute.class("editor-blocks")], []),
  ])
}

pub fn render_blocks(blocks: List(Block)) -> Element(Msg) {
  html.div([attribute.class("editor-blocks")], list.map(blocks, render_block))
}

pub fn render_block(b: Block) -> Element(Msg) {
  case b {
    Paragraph(id, text) ->
      html.p(
        [
          attribute.class("block paragraph"),
          attribute.attribute("contenteditable", "true"),
          attribute.attribute("data-block-id", id),
          event.on_input(fn(t) { BlockEdited(id, t) }),
        ],
        [element.text(text)],
      )
    Heading(id, level, text) -> {
      let tag = case level {
        1 -> html.h1
        2 -> html.h2
        3 -> html.h3
        _ -> html.h4
      }
      tag(
        [
          attribute.class("block heading"),
          attribute.attribute("contenteditable", "true"),
          attribute.attribute("data-block-id", id),
          event.on_input(fn(t) { BlockEdited(id, t) }),
        ],
        [element.text(text)],
      )
    }
    Bullet(id, text) ->
      html.li(
        [
          attribute.class("block bullet"),
          attribute.attribute("contenteditable", "true"),
          attribute.attribute("data-block-id", id),
          event.on_input(fn(t) { BlockEdited(id, t) }),
        ],
        [element.text(text)],
      )
  }
}
