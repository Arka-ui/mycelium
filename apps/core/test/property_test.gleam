import gleam/erlang/process
import gleam/string
import gleeunit/should

import mycelium/crdt/loro_port
import mycelium/registry

pub fn convergence_simple_test() -> Nil {
  let names_a = registry.new()
  let names_b = registry.new()
  let assert Ok(_) = loro_port.start_link(names_a.loro)
  let assert Ok(_) = loro_port.start_link(names_b.loro)
  process.sleep(800)
  let assert Ok(_) = loro_port.open_doc(names_a.loro, "p")
  let assert Ok(_) = loro_port.open_doc(names_b.loro, "p")
  let assert Ok(line_a) =
    loro_port.insert_text(names_a.loro, "p", "main", 0, "alpha ")
  let op_a = extract_op(line_a)
  let assert Ok(line_b) =
    loro_port.insert_text(names_b.loro, "p", "main", 0, "beta ")
  let op_b = extract_op(line_b)
  let assert Ok(_) = loro_port.apply_remote_ops(names_b.loro, "p", [op_a])
  let assert Ok(_) = loro_port.apply_remote_ops(names_a.loro, "p", [op_b])
  let assert Ok(state_a) = loro_port.get_state(names_a.loro, "p")
  let assert Ok(state_b) = loro_port.get_state(names_b.loro, "p")
  should.equal(extract_result(state_a), extract_result(state_b))
}

pub fn snapshot_roundtrip_test() -> Nil {
  let names_a = registry.new()
  let names_b = registry.new()
  let assert Ok(_) = loro_port.start_link(names_a.loro)
  let assert Ok(_) = loro_port.start_link(names_b.loro)
  process.sleep(800)
  let assert Ok(_) = loro_port.open_doc(names_a.loro, "s")
  let assert Ok(_) =
    loro_port.insert_text(names_a.loro, "s", "main", 0, "snapshot test text")
  let assert Ok(snap_line) = loro_port.snapshot(names_a.loro, "s")
  let snap = extract_field(snap_line, "snap")
  let assert Ok(_) = loro_port.load_snapshot(names_b.loro, "s", snap)
  let assert Ok(state_a) = loro_port.get_state(names_a.loro, "s")
  let assert Ok(state_b) = loro_port.get_state(names_b.loro, "s")
  should.equal(extract_result(state_a), extract_result(state_b))
}

fn extract_result(line: String) -> String {
  case string.split_once(line, "\"result\":") {
    Ok(#(_, rest)) -> rest
    Error(_) -> line
  }
}

fn extract_op(line: String) -> String {
  extract_field(line, "op")
}

fn extract_field(line: String, field: String) -> String {
  let needle = "\"" <> field <> "\":\""
  case string.split_once(line, needle) {
    Ok(#(_, rest)) ->
      case string.split_once(rest, "\"") {
        Ok(#(v, _)) -> v
        Error(_) -> ""
      }
    Error(_) -> ""
  }
}
