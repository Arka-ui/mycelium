import gleam/list
import simplifile

pub fn locate(name: String) -> String {
  let exe = case is_windows() {
    True -> name <> ".exe"
    False -> name
  }
  let candidates = [
    "apps/desktop/bin/" <> exe,
    "../../apps/desktop/bin/" <> exe,
    "../desktop/bin/" <> exe,
    "target/release/" <> exe,
    "../../target/release/" <> exe,
    "target/debug/" <> exe,
    "../../target/debug/" <> exe,
  ]
  case list.find(candidates, fn(p) { simplifile.is_file(p) == Ok(True) }) {
    Ok(p) -> p
    Error(_) -> "apps/desktop/bin/" <> exe
  }
}

@external(erlang, "mycelium_ffi", "is_windows")
fn is_windows() -> Bool
