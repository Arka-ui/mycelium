import gleam/bit_array
import gleam/erlang/process
import gleam/json
import gleam/string
import gleeunit/should

import mycelium/util/port_actor
import mycelium/util/port_locator

const wat = "(module
  (func $square (export \"square\") (param $x i32) (result i32)
    local.get $x
    local.get $x
    i32.mul))"

pub fn install_and_invoke_test() -> Nil {
  let name = process.new_name("test_wasmedge")
  let bin = port_locator.locate("wasmedge_port")
  let assert Ok(_) = port_actor.start_link(name, bin, [])
  process.sleep(500)

  let wasm_b64 = bit_array.base64_encode(<<wat:utf8>>, True)
  let install =
    json.object([
      #("plugin_id", json.string("p1")),
      #("wasm_b64", json.string(wasm_b64)),
    ])
  let assert Ok(installed) = port_actor.call(name, "install", install)
  should.equal(string.contains(installed, "installed"), True)

  let invoke =
    json.object([
      #("plugin_id", json.string("p1")),
      #("function", json.string("square")),
      #("arg_i32", json.int(7)),
    ])
  let assert Ok(result) = port_actor.call(name, "invoke", invoke)
  should.equal(string.contains(result, "49"), True)
}
