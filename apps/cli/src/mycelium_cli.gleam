import argv
import gleam/erlang/process
import gleam/io
import gleam/list
import gleam/string
import simplifile

import mycelium/crypto_server
import mycelium/registry
import mycelium/storage/surreal_port
import mycelium/util/port_locator

pub fn main() -> Nil {
  case argv.load().arguments {
    [] | ["help"] | ["--help"] | ["-h"] -> print_help()
    ["version"] | ["--version"] | ["-V"] -> print_version()
    ["import", "markdown", path] -> cmd_import_markdown(path)
    ["export", "markdown", id] -> cmd_export_markdown(id)
    ["query", q] -> cmd_query(q)
    ["backup", out] -> cmd_backup(out)
    ["plugin", "install", path] -> cmd_plugin_install(path)
    ["plugin", "list"] -> cmd_plugin_list()
    ["logs", "tail"] -> cmd_logs_tail()
    ["keygen"] -> cmd_keygen()
    other -> {
      io.println_error("unknown subcommand: " <> string_join(other, " "))
      print_help()
    }
  }
}

fn print_version() -> Nil {
  io.println("mycelium-cli 0.1.0")
}

fn print_help() -> Nil {
  io.println(
    "mycelium-cli — local-first knowledge workspace CLI

Usage:
  mycelium-cli help                       Show this help
  mycelium-cli version                    Print version
  mycelium-cli keygen                     Generate an Ed25519 device key (B64)
  mycelium-cli import markdown <file>     Import a Markdown file as a note
  mycelium-cli export markdown <id>       Export a note as JSON (markdown export M3)
  mycelium-cli query <q>                  Lexical search across notes
  mycelium-cli backup <out>               Back up the encrypted database
  mycelium-cli plugin install <wasm>      Install a Wasm plugin
  mycelium-cli plugin list                List installed plugins
  mycelium-cli logs tail                  Tail structured logs",
  )
}

fn cmd_keygen() -> Nil {
  let names = registry.new()
  case crypto_server.start_link(names.crypto) {
    Ok(_) -> {
      process.sleep(800)
      case crypto_server.ed25519_generate(names.crypto) {
        Ok(line) -> io.println(line)
        Error(_) -> io.println_error("keygen failed")
      }
    }
    Error(_) -> io.println_error("crypto sidecar failed to start")
  }
}

fn cmd_import_markdown(path: String) -> Nil {
  case simplifile.read(path) {
    Ok(content) -> {
      let names = registry.new()
      let bin = port_locator.locate("surreal_port")
      let db = envelope_db_path()
      case surreal_port.start_link(names.storage, bin, db) {
        Ok(_) -> {
          process.sleep(2000)
          let _ = surreal_port.migrate(names.storage)
          let id = ulid_string()
          let title = case string.split(content, "\n") {
            [first, ..] -> string.trim(first)
            _ -> "imported"
          }
          let _ = surreal_port.create_node(names.storage, id, "note", title, [])
          io.println("imported as " <> id)
        }
        Error(_) -> io.println_error("storage start failed")
      }
    }
    Error(_) -> io.println_error("cannot read file: " <> path)
  }
}

fn cmd_export_markdown(id: String) -> Nil {
  let names = registry.new()
  let bin = port_locator.locate("surreal_port")
  let db = envelope_db_path()
  case surreal_port.start_link(names.storage, bin, db) {
    Ok(_) -> {
      process.sleep(2000)
      case surreal_port.get_node(names.storage, id) {
        Ok(line) -> io.println(line)
        Error(_) -> io.println_error("not found: " <> id)
      }
    }
    Error(_) -> io.println_error("storage start failed")
  }
}

fn cmd_query(q: String) -> Nil {
  let names = registry.new()
  let bin = port_locator.locate("surreal_port")
  let db = envelope_db_path()
  case surreal_port.start_link(names.storage, bin, db) {
    Ok(_) -> {
      process.sleep(2000)
      case surreal_port.search_nodes(names.storage, q, 50) {
        Ok(line) -> io.println(line)
        Error(_) -> io.println_error("query failed")
      }
    }
    Error(_) -> io.println_error("storage start failed")
  }
}

fn cmd_backup(out: String) -> Nil {
  let db = envelope_db_path()
  io.println(
    "Backup of "
    <> db
    <> " to "
    <> out
    <> " (use 7z/tar for now; built-in archiver lands in M3)",
  )
}

fn cmd_plugin_install(_path: String) -> Nil {
  io.println("Plugin install via CLI: M3")
}

fn cmd_plugin_list() -> Nil {
  io.println(
    "Plugins: (M2 — wasmedge sidecar runtime present, plugin registry CLI lands in M3)",
  )
}

fn cmd_logs_tail() -> Nil {
  io.println("Logs tail: M3")
}

fn envelope_db_path() -> String {
  case envoy_get("APPDATA") {
    Ok(p) -> p <> "\\Mycelium\\db"
    Error(_) ->
      case envoy_get("HOME") {
        Ok(h) -> h <> "/.local/share/mycelium/db"
        Error(_) -> "."
      }
  }
}

@external(erlang, "envoy", "get")
fn envoy_get(name: String) -> Result(String, Nil)

fn string_join(items: List(String), sep: String) -> String {
  case items {
    [] -> ""
    [first, ..rest] -> list.fold(rest, first, fn(acc, s) { acc <> sep <> s })
  }
}

fn ulid_string() -> String {
  ulid_loop(26, "")
}

fn ulid_loop(n: Int, acc: String) -> String {
  let chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
  case n {
    0 -> acc
    _ -> {
      let idx = random_int_lt(32)
      let c = case string.slice(chars, idx, 1) {
        "" -> "0"
        s -> s
      }
      ulid_loop(n - 1, acc <> c)
    }
  }
}

@external(erlang, "rand", "uniform")
fn rand_uniform(n: Int) -> Int

fn random_int_lt(n: Int) -> Int {
  rand_uniform(n) - 1
}
