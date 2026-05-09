import lustre/element.{type Element}

import mycelium/document/block.{type Block}
import mycelium/views/editor

pub fn render(b: Block) -> Element(editor.Msg) {
  editor.render_block(b)
}
