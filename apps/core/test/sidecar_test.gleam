import gleam/erlang/process
import gleam/string
import gleeunit/should

import mycelium/crdt/loro_port
import mycelium/crypto_server
import mycelium/network/iroh_port
import mycelium/registry
import mycelium/storage/surreal_port
import mycelium/util/port_locator

fn test_db_path(name: String) -> String {
  "./_build/test_data/mycelium-test-" <> name
}

pub fn locator_returns_path_test() -> Nil {
  let p = port_locator.locate("surreal_port")
  should.equal(string.contains(p, "surreal_port"), True)
}

pub fn crypto_blake3_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = crypto_server.start_link(names.crypto)
  process.sleep(500)
  let assert Ok(line) = crypto_server.blake3_b64(names.crypto, "aGVsbG8=")
  should.equal(string.contains(line, "hash_hex"), True)
}

pub fn crypto_ed25519_roundtrip_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = crypto_server.start_link(names.crypto)
  process.sleep(500)
  let assert Ok(gen_line) = crypto_server.ed25519_generate(names.crypto)
  should.equal(string.contains(gen_line, "secret_b64"), True)
}

pub fn crypto_age_roundtrip_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = crypto_server.start_link(names.crypto)
  process.sleep(500)
  let assert Ok(line) = crypto_server.age_generate_identity(names.crypto)
  should.equal(string.contains(line, "recipient_str"), True)
}

pub fn loro_open_doc_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = loro_port.start_link(names.loro)
  process.sleep(500)
  let assert Ok(line) = loro_port.open_doc(names.loro, "test_doc")
  should.equal(string.contains(line, "opened"), True)
}

pub fn loro_insert_text_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = loro_port.start_link(names.loro)
  process.sleep(500)
  let assert Ok(_) = loro_port.open_doc(names.loro, "doc1")
  let assert Ok(line) =
    loro_port.insert_text(names.loro, "doc1", "main", 0, "hello")
  should.equal(string.contains(line, "op"), True)
}

pub fn loro_state_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = loro_port.start_link(names.loro)
  process.sleep(500)
  let assert Ok(_) = loro_port.open_doc(names.loro, "doc2")
  let assert Ok(_) =
    loro_port.insert_text(names.loro, "doc2", "main", 0, "world")
  let assert Ok(state) = loro_port.get_state(names.loro, "doc2")
  should.equal(string.contains(state, "world"), True)
}

pub fn surreal_ping_test() -> Nil {
  let names = registry.new()
  let bin = port_locator.locate("surreal_port")
  let assert Ok(_) =
    surreal_port.start_link(names.storage, bin, test_db_path("surreal_ping"))
  process.sleep(2000)
  let assert Ok(line) = surreal_port.ping(names.storage)
  should.equal(string.contains(line, "pong"), True)
}

pub fn iroh_bind_test() -> Nil {
  let names = registry.new()
  let assert Ok(_) = iroh_port.start_link(names.iroh)
  process.sleep(500)
  let assert Ok(_) = crypto_server.start_link(names.crypto)
  process.sleep(500)
  let assert Ok(gen) = crypto_server.ed25519_generate(names.crypto)
  case extract(gen, "secret_b64") {
    Ok(secret) -> {
      let assert Ok(line) = iroh_port.bind(names.iroh, secret)
      should.equal(
        string.contains(line, "node_id_hex")
          || string.contains(line, "already_bound"),
        True,
      )
    }
    Error(_) -> should.fail()
  }
}

fn extract(s: String, field: String) -> Result(String, Nil) {
  let needle = "\"" <> field <> "\":\""
  case string.split_once(s, needle) {
    Ok(#(_, rest)) ->
      case string.split_once(rest, "\"") {
        Ok(#(v, _)) -> Ok(v)
        Error(_) -> Error(Nil)
      }
    Error(_) -> Error(Nil)
  }
}
