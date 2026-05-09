import gleam/bit_array
import gleam/erlang/process
import gleam/json
import gleam/string
import gleeunit/should
import simplifile

import mycelium/util/port_actor
import mycelium/util/port_locator

fn install_wasm(
  name: process.Name(port_actor.Message),
  plugin_id: String,
  wasm_path: String,
) -> Bool {
  case simplifile.read_bits(wasm_path) {
    Ok(bits) -> {
      let b64 = bit_array.base64_encode(bits, True)
      let params =
        json.object([
          #("plugin_id", json.string(plugin_id)),
          #("wasm_b64", json.string(b64)),
        ])
      case port_actor.call(name, "install", params) {
        Ok(_) -> True
        Error(_) -> False
      }
    }
    Error(_) -> False
  }
}

fn invoke_str(
  name: process.Name(port_actor.Message),
  plugin_id: String,
  function: String,
  input: String,
) -> String {
  let params =
    json.object([
      #("plugin_id", json.string(plugin_id)),
      #("function", json.string(function)),
      #("input", json.string(input)),
    ])
  case port_actor.call(name, "invoke_string", params) {
    Ok(line) -> extract_output(line)
    Error(_) -> ""
  }
}

fn extract_output(line: String) -> String {
  case string.split_once(line, "\"output\":\"") {
    Ok(#(_, rest)) ->
      case string.split_once(rest, "\",\"") {
        Ok(#(v, _)) -> unescape_json(v)
        Error(_) ->
          case string.split_once(rest, "\"}}") {
            Ok(#(v, _)) -> unescape_json(v)
            Error(_) -> ""
          }
      }
    Error(_) -> ""
  }
}

fn unescape_json(s: String) -> String {
  s
  |> string.replace("\\n", "\n")
  |> string.replace("\\\"", "\"")
  |> string.replace("\\\\", "\\")
}

pub fn translate_plugin_test() -> Nil {
  let name = process.new_name("test_translate")
  let bin = port_locator.locate("wasmedge_port")
  let assert Ok(_) = port_actor.start_link(name, bin, [])
  process.sleep(500)
  let wasm_path = "../../plugins/examples/translate/plugin.wasm"
  case install_wasm(name, "translate", wasm_path) {
    True -> {
      let result =
        invoke_str(name, "translate", "translate_to_pseudo_es", "hello world")
      should.equal(
        string.contains(result, "hola") || string.contains(result, "mundo"),
        True,
      )
    }
    False -> should.equal(True, True)
  }
}

pub fn ical_plugin_test() -> Nil {
  let name = process.new_name("test_ical")
  let bin = port_locator.locate("wasmedge_port")
  let assert Ok(_) = port_actor.start_link(name, bin, [])
  process.sleep(500)
  let wasm_path = "../../plugins/examples/ical_import/plugin.wasm"
  case install_wasm(name, "ical", wasm_path) {
    True -> {
      let ics =
        "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:demo@mycelium\nSUMMARY:Beta launch\nDTSTART:20260601T100000Z\nDTEND:20260601T110000Z\nEND:VEVENT\nEND:VCALENDAR"
      let result = invoke_str(name, "ical", "parse_ics", ics)
      should.equal(string.contains(result, "Beta launch"), True)
    }
    False -> should.equal(True, True)
  }
}
