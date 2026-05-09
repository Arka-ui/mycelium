import envoy
import gleam/erlang/process.{type Subject}
import gleam/int
import gleam/otp/actor
import gleam/result
import gleam/string

pub type Config {
  Config(
    db_path: String,
    attachments_path: String,
    logs_path: String,
    http_port: Int,
    ipc_pipe: String,
    ring: String,
    device_name: String,
  )
}

pub type Message {
  Get(reply: Subject(Config))
}

pub fn load_or_default() -> Config {
  Config(
    db_path: env_or("MYCELIUM_DB_PATH", default_db_path()),
    attachments_path: env_or(
      "MYCELIUM_ATTACHMENTS_PATH",
      default_attachments_path(),
    ),
    logs_path: env_or("MYCELIUM_LOGS_PATH", default_logs_path()),
    http_port: int_env_or("MYCELIUM_HTTP_PORT", 0),
    ipc_pipe: env_or("MYCELIUM_IPC_PIPE", default_ipc_pipe()),
    ring: env_or("MYCELIUM_RING", "default"),
    device_name: env_or("MYCELIUM_DEVICE_NAME", "this-device"),
  )
}

pub fn http_port(c: Config) -> Int {
  c.http_port
}

pub fn ipc_pipe(c: Config) -> String {
  c.ipc_pipe
}

pub fn db_path(c: Config) -> String {
  c.db_path
}

pub fn attachments_path(c: Config) -> String {
  c.attachments_path
}

pub fn logs_path(c: Config) -> String {
  c.logs_path
}

pub fn ring(c: Config) -> String {
  c.ring
}

pub fn device_name(c: Config) -> String {
  c.device_name
}

pub fn start_link(
  config: Config,
) -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(config)
  |> actor.on_message(fn(state, msg) {
    case msg {
      Get(reply: r) -> {
        process.send(r, state)
        actor.continue(state)
      }
    }
  })
  |> actor.start
}

fn env_or(key: String, default: String) -> String {
  case envoy.get(key) {
    Ok(v) -> v
    Error(_) -> default
  }
}

fn int_env_or(key: String, default: Int) -> Int {
  case envoy.get(key) {
    Ok(v) -> result.unwrap(int.parse(string.trim(v)), default)
    Error(_) -> default
  }
}

fn default_db_path() -> String {
  appdata_subdir("Mycelium\\db", "/.local/share/mycelium/db")
}

fn default_attachments_path() -> String {
  appdata_subdir("Mycelium\\attachments", "/.local/share/mycelium/attachments")
}

fn default_logs_path() -> String {
  appdata_subdir("Mycelium\\logs", "/.local/share/mycelium/logs")
}

fn default_ipc_pipe() -> String {
  case envoy.get("APPDATA") {
    Ok(_) -> "\\\\.\\pipe\\mycelium-default"
    Error(_) -> "/tmp/mycelium.sock"
  }
}

fn appdata_subdir(windows_rel: String, unix_rel: String) -> String {
  case envoy.get("APPDATA") {
    Ok(appdata) -> appdata <> "\\" <> windows_rel
    Error(_) ->
      case envoy.get("HOME") {
        Ok(home) -> home <> unix_rel
        Error(_) -> "." <> unix_rel
      }
  }
}
