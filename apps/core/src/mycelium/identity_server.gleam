import gleam/erlang/process.{type Name, type Subject}
import gleam/otp/actor
import gleam/string

import mycelium/config_server.{type Config}
import mycelium/crypto_server
import mycelium/registry.{type Names}
import mycelium/util/port_actor

pub type DeviceKey {
  DeviceKey(secret_b64: String, public_b64: String)
}

pub type Message {
  GetKey(reply: Subject(DeviceKey))
}

pub fn start_link_with(
  _config: Config,
  names: Names,
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new_with_initialiser(5000, fn(self) {
    let key = load_or_generate(names)
    Ok(actor.initialised(key) |> actor.returning(self))
  })
  |> actor.on_message(fn(state, msg) {
    case msg {
      GetKey(reply: r) -> {
        process.send(r, state)
        actor.continue(state)
      }
    }
  })
  |> actor.start
}

pub fn start_link(
  config: Config,
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  let names = registry.new()
  start_link_with(config, names)
}

fn load_or_generate(names: Names) -> DeviceKey {
  let _ = wait_crypto_ready(names.crypto, 50)
  case crypto_server.keyring_get(names.crypto, "mycelium", "device_key") {
    Ok(line) ->
      case extract_field(line, "secret_b64") {
        Ok(secret) ->
          case
            crypto_server.keyring_get(
              names.crypto,
              "mycelium",
              "device_key_pub",
            )
          {
            Ok(pl) ->
              case extract_field(pl, "secret_b64") {
                Ok(pub_b64) ->
                  DeviceKey(secret_b64: secret, public_b64: pub_b64)
                Error(_) -> generate_and_store(names)
              }
            Error(_) -> generate_and_store(names)
          }
        Error(_) -> generate_and_store(names)
      }
    Error(_) -> generate_and_store(names)
  }
}

fn generate_and_store(names: Names) -> DeviceKey {
  case crypto_server.ed25519_generate(names.crypto) {
    Ok(line) -> {
      let secret = result_or(extract_field(line, "secret_b64"), "")
      let pub_b64 = result_or(extract_field(line, "public_b64"), "")
      let _ =
        crypto_server.keyring_set(
          names.crypto,
          "mycelium",
          "device_key",
          secret,
        )
      let _ =
        crypto_server.keyring_set(
          names.crypto,
          "mycelium",
          "device_key_pub",
          pub_b64,
        )
      DeviceKey(secret_b64: secret, public_b64: pub_b64)
    }
    Error(_) -> DeviceKey(secret_b64: "", public_b64: "")
  }
}

fn wait_crypto_ready(name: Name(port_actor.Message), retries: Int) -> Bool {
  case retries {
    0 -> False
    _ ->
      case port_actor.call(name, "ping", gleam_json_empty()) {
        Ok(_) -> True
        Error(_) -> {
          process.sleep(100)
          wait_crypto_ready(name, retries - 1)
        }
      }
  }
}

@external(erlang, "gleam@json", "object")
fn gleam_json_empty_internal(items: List(#(String, a))) -> a

fn gleam_json_empty() -> a {
  gleam_json_empty_internal([])
}

fn result_or(r: Result(String, String), default: String) -> String {
  case r {
    Ok(v) -> v
    Error(_) -> default
  }
}

fn extract_field(json_str: String, field: String) -> Result(String, String) {
  let needle = "\"" <> field <> "\":\""
  case string.split_once(json_str, needle) {
    Ok(#(_, rest)) ->
      case string.split_once(rest, "\"") {
        Ok(#(value, _)) -> Ok(value)
        Error(_) -> Error("no closing quote")
      }
    Error(_) -> Error("field not found")
  }
}
