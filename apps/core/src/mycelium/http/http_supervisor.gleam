import gleam/erlang/process.{type Subject}
import gleam/otp/actor
import gleam/otp/static_supervisor as sup
import gleam/otp/supervision

import mycelium/config_server.{type Config}
import mycelium/http/router
import mycelium/registry.{type Names}

pub fn start_link(
  config: Config,
  names: Names,
  port_subject: Subject(Int),
) -> Result(actor.Started(sup.Supervisor), actor.StartError) {
  sup.new(sup.OneForOne)
  |> sup.add(
    supervision.worker(fn() { router.start_link(config, names, port_subject) }),
  )
  |> sup.start
}
