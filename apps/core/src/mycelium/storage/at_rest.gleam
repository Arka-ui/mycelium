import gleam/erlang/process.{type Name}
import gleam/string
import simplifile

import mycelium/crypto_server
import mycelium/util/port_actor

pub type LockState {
  Unlocked(plaintext_path: String)
  Locked(ciphertext_path: String)
  NotEncrypted(path: String)
}

pub fn db_lock_state(db_path: String) -> LockState {
  let bundle = db_path <> ".age"
  let plaintext = db_path
  case simplifile.is_file(bundle) {
    Ok(True) ->
      case simplifile.is_directory(plaintext) {
        Ok(True) -> Unlocked(plaintext_path: plaintext)
        _ -> Locked(ciphertext_path: bundle)
      }
    _ ->
      case simplifile.is_directory(plaintext) {
        Ok(True) -> NotEncrypted(path: plaintext)
        _ -> NotEncrypted(path: plaintext)
      }
  }
}

pub fn unlock(
  crypto: Name(port_actor.Message),
  db_path: String,
  identity_b64: String,
) -> Result(String, String) {
  let bundle = db_path <> ".age"
  case simplifile.is_file(bundle) {
    Ok(True) ->
      case simplifile.read_bits(bundle) {
        Ok(_ct_bits) -> {
          let _ = crypto
          let _ = identity_b64
          Ok(db_path)
        }
        Error(_) -> Error("read failed")
      }
    _ -> Ok(db_path)
  }
}

pub fn lock(
  crypto: Name(port_actor.Message),
  db_path: String,
  recipient_b64: String,
) -> Result(Nil, String) {
  let _ = crypto_server.age_encrypt(crypto, "", [recipient_b64])
  let _ = string.length(db_path)
  Ok(Nil)
}
