import gleam/option.{None, Some}
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

import mycelium/views/editor
import mycelium/views/sidebar
import mycelium/views/types.{type Model}

pub type Msg {
  SidebarMsg(sidebar.Msg)
  EditorMsg(editor.Msg)
}

pub fn render(model: Model) -> Element(Msg) {
  html.div([attribute.class("mycelium-app")], [
    sidebar.render(model.notes, model.open) |> element.map(SidebarMsg),
    html.main([attribute.class("mycelium-main")], [
      case model.open {
        Some(_) -> editor.render() |> element.map(EditorMsg)
        None ->
          html.div([attribute.class("empty")], [
            html.p([], [element.text("Select a note from the sidebar.")]),
          ])
      },
    ]),
  ])
}
