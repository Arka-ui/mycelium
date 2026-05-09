import gleam/erlang/process.{type Subject}
import gleam/otp/actor

pub type Message {
  Ping
}

pub fn start_link() -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(Nil)
  |> actor.on_message(fn(state, _msg) { actor.continue(state) })
  |> actor.start
}
