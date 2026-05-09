import gleam/dict.{type Dict}
import gleam/erlang/process.{type Name}
import gleam/list
import gleam/string

import mycelium/storage/surreal_port

pub type VersionVector =
  Dict(String, Int)

pub fn merge(a: VersionVector, b: VersionVector) -> VersionVector {
  dict.fold(b, a, fn(acc, k, v_b) {
    case dict.get(acc, k) {
      Ok(v_a) -> dict.insert(acc, k, max(v_a, v_b))
      Error(_) -> dict.insert(acc, k, v_b)
    }
  })
}

pub fn meet(a: VersionVector, b: VersionVector) -> VersionVector {
  dict.fold(a, dict.new(), fn(acc, k, v_a) {
    case dict.get(b, k) {
      Ok(v_b) -> dict.insert(acc, k, min(v_a, v_b))
      Error(_) -> acc
    }
  })
}

pub fn stable(vvs: List(VersionVector)) -> VersionVector {
  case vvs {
    [] -> dict.new()
    [first, ..rest] -> list.fold(rest, first, meet)
  }
}

pub fn compact(
  storage: Name(surreal_port.Message),
  doc_id: String,
  stable_vv: VersionVector,
) -> Result(Int, String) {
  let upto = max_lamport(stable_vv)
  case surreal_port.compact_log(storage, doc_id, upto) {
    Ok(_) -> Ok(upto)
    Error(_) -> Error("compaction failed")
  }
}

fn max_lamport(vv: VersionVector) -> Int {
  dict.fold(vv, 0, fn(acc, _k, v) { max(acc, v) })
}

fn max(a: Int, b: Int) -> Int {
  case a > b {
    True -> a
    False -> b
  }
}

fn min(a: Int, b: Int) -> Int {
  case a < b {
    True -> a
    False -> b
  }
}

pub fn encode_vv(vv: VersionVector) -> String {
  let pairs = dict.to_list(vv)
  let parts =
    list.map(pairs, fn(p) {
      let #(k, v) = p
      k <> ":" <> int_to_str(v)
    })
  string.join(parts, ",")
}

@external(erlang, "erlang", "integer_to_binary")
fn int_to_str(n: Int) -> String

pub fn decode_vv(s: String) -> VersionVector {
  case s {
    "" -> dict.new()
    _ -> {
      let parts = string.split(s, ",")
      list.fold(parts, dict.new(), fn(acc, p) {
        case string.split_once(p, ":") {
          Ok(#(k, v_str)) ->
            case parse_int(v_str) {
              Ok(v) -> dict.insert(acc, k, v)
              Error(_) -> acc
            }
          Error(_) -> acc
        }
      })
    }
  }
}

fn parse_int(s: String) -> Result(Int, Nil) {
  case s {
    "" -> Error(Nil)
    _ ->
      case parse_int_safe(s) {
        Ok(n) -> Ok(n)
        Error(_) -> Error(Nil)
      }
  }
}

@external(erlang, "binary_to_integer_safe", "parse")
fn parse_int_safe(s: String) -> Result(Int, Nil)
