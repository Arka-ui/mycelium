import gleam/list
import gleam/option.{type Option, None, Some}
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import lustre/event

import mycelium/views/types.{type NoteSummary}

pub type Msg {
  NewNote
  OpenNote(id: String)
}

pub fn render(notes: List(NoteSummary), open: Option(String)) -> Element(Msg) {
  html.aside([attribute.class("mycelium-sidebar")], [
    html.button([attribute.class("new-note-btn"), event.on_click(NewNote)], [
      element.text("+ New Note"),
    ]),
    html.ul(
      [attribute.class("note-list")],
      list.map(notes, fn(n) {
        let is_open = case open {
          Some(o) -> o == n.id
          None -> False
        }
        let cls = case is_open {
          True -> "note-item open"
          False -> "note-item"
        }
        let label = case n.title {
          "" -> "Untitled"
          t -> t
        }
        html.li([attribute.class(cls), event.on_click(OpenNote(n.id))], [
          element.text(label),
        ])
      }),
    ),
  ])
}
