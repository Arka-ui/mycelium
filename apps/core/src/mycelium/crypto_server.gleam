import gleam/erlang/process.{type Name}
import gleam/json
import gleam/otp/actor

import mycelium/util/port_actor.{type Message, type PortError}
import mycelium/util/port_locator

pub type CryptoError =
  PortError

pub fn start_link(
  name: Name(Message),
) -> Result(actor.Started(process.Subject(Message)), actor.StartError) {
  let bin = port_locator.locate("crypto_port")
  port_actor.start_link(name, bin, [])
}

pub fn blake3_b64(
  name: Name(Message),
  data_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "blake3",
    json.object([#("data_b64", json.string(data_b64))]),
  )
}

pub fn ed25519_generate(name: Name(Message)) -> Result(String, PortError) {
  port_actor.call(name, "ed25519_generate", json.object([]))
}

pub fn ed25519_sign(
  name: Name(Message),
  secret_b64: String,
  message_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "ed25519_sign",
    json.object([
      #("secret_b64", json.string(secret_b64)),
      #("message_b64", json.string(message_b64)),
    ]),
  )
}

pub fn ed25519_verify(
  name: Name(Message),
  public_b64: String,
  signature_b64: String,
  message_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "ed25519_verify",
    json.object([
      #("public_b64", json.string(public_b64)),
      #("signature_b64", json.string(signature_b64)),
      #("message_b64", json.string(message_b64)),
    ]),
  )
}

pub fn age_generate_identity(name: Name(Message)) -> Result(String, PortError) {
  port_actor.call(name, "age_generate_identity", json.object([]))
}

pub fn age_encrypt(
  name: Name(Message),
  plaintext_b64: String,
  recipients_b64: List(String),
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "age_encrypt",
    json.object([
      #("plaintext_b64", json.string(plaintext_b64)),
      #("recipients_b64", json.array(recipients_b64, json.string)),
    ]),
  )
}

pub fn age_decrypt(
  name: Name(Message),
  ciphertext_b64: String,
  identity_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "age_decrypt",
    json.object([
      #("ciphertext_b64", json.string(ciphertext_b64)),
      #("identity_b64", json.string(identity_b64)),
    ]),
  )
}

pub fn keyring_set(
  name: Name(Message),
  service: String,
  account: String,
  secret_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "keyring_set",
    json.object([
      #("service", json.string(service)),
      #("account", json.string(account)),
      #("secret_b64", json.string(secret_b64)),
    ]),
  )
}

pub fn keyring_get(
  name: Name(Message),
  service: String,
  account: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "keyring_get",
    json.object([
      #("service", json.string(service)),
      #("account", json.string(account)),
    ]),
  )
}

pub fn keyring_delete(
  name: Name(Message),
  service: String,
  account: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "keyring_delete",
    json.object([
      #("service", json.string(service)),
      #("account", json.string(account)),
    ]),
  )
}

pub fn spake2_start(
  name: Name(Message),
  passphrase: String,
  our_id: String,
  their_id: String,
  role: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "spake2_start",
    json.object([
      #("passphrase", json.string(passphrase)),
      #("our_id", json.string(our_id)),
      #("their_id", json.string(their_id)),
      #("role", json.string(role)),
    ]),
  )
}

pub fn spake2_finish(
  name: Name(Message),
  session_id: String,
  peer_msg_b64: String,
) -> Result(String, PortError) {
  port_actor.call(
    name,
    "spake2_finish",
    json.object([
      #("session_id", json.string(session_id)),
      #("peer_msg_b64", json.string(peer_msg_b64)),
    ]),
  )
}
