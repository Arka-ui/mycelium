import gleam/crypto
import gleam/int
import gleam/string

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

pub fn new() -> String {
  let now_ms = system_time_ms()
  let randomness = crypto.strong_random_bytes(10)
  encode_time(now_ms, 10, "") <> encode_random(randomness)
}

pub fn new_with_prefix(prefix: String) -> String {
  prefix <> ":" <> new()
}

pub fn strip_prefix(thing_id: String) -> String {
  case string.split_once(thing_id, ":") {
    Ok(#(_, ulid)) -> ulid
    Error(_) -> thing_id
  }
}

fn encode_time(value: Int, chars_left: Int, acc: String) -> String {
  case chars_left {
    0 -> acc
    _ -> {
      let digit = int.bitwise_and(value, 31)
      encode_time(
        int.bitwise_shift_right(value, 5),
        chars_left - 1,
        nth(digit) <> acc,
      )
    }
  }
}

fn encode_random(randomness: BitArray) -> String {
  case randomness {
    <<v:int-size(80)>> -> encode_random_loop(v, 16, "")
    _ -> ""
  }
}

fn encode_random_loop(value: Int, chars_left: Int, acc: String) -> String {
  case chars_left {
    0 -> acc
    _ -> {
      let digit = int.bitwise_and(value, 31)
      encode_random_loop(
        int.bitwise_shift_right(value, 5),
        chars_left - 1,
        nth(digit) <> acc,
      )
    }
  }
}

fn nth(idx: Int) -> String {
  case string.slice(alphabet, idx, 1) {
    "" -> "0"
    s -> s
  }
}

@external(erlang, "erlang", "system_time")
fn erlang_system_time(unit: TimeUnit) -> Int

type TimeUnit {
  Millisecond
}

fn system_time_ms() -> Int {
  erlang_system_time(Millisecond)
}
